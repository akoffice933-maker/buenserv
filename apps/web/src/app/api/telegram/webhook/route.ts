import {timingSafeEqual} from 'node:crypto';
import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env';
import {isConfirmation, onboardingText, parseArsPrice, parseBarrio, parseCategory, parseReportReason, rateLimitCopyKey, sendTelegramMessage, sendTelegramKeyboard, removeTelegramKeyboard, sendTelegramMiniApp, sendMainMenu, sendLanguageMenu, editToMainMenu, editToLanguageMenu, detectLocaleFromTelegram, categoryKeyboard, barrioKeyboard, type BotLocale, type OnboardingStep} from '@/lib/telegram/provider-onboarding';
import {performerProviderId, reportProviderId, startPayload, startsProviderOnboarding, startsSupport} from '@/lib/telegram/start-payload';

type TelegramUser = {id: number; first_name?: string; last_name?: string; language_code?: string};
type TelegramMessage = {message_id?: number; text?: string; photo?: Array<{file_id: string}>; chat?: {id: number}; from?: TelegramUser};
type TelegramUpdate = {update_id: number; message?: TelegramMessage; callback_query?: {id: string; data?: string; from: TelegramUser; message?: TelegramMessage}};
type Draft = {category_slug?: string; barrio_slug?: string; description?: string; price_from_ars?: number; telegram_photo_file_id?: string};

function secretsMatch(received: string | null, expected: string) { if (!received) return false; const left = Buffer.from(received); const right = Buffer.from(expected); return left.length === right.length && timingSafeEqual(left, right); }

async function submitProvider(supabase: ReturnType<typeof createAdminClient>, profileId: string, telegramId: number, name: string, draft: Draft) {
  if (!draft.category_slug || !draft.barrio_slug || !draft.description || !draft.price_from_ars || !draft.telegram_photo_file_id) throw new Error('Incomplete onboarding draft');
  const {error} = await supabase.rpc('submit_provider', {
    p_profile_id: profileId,
    p_telegram_id: telegramId,
    p_display_name: name,
    p_category_slug: draft.category_slug,
    p_barrio_slug: draft.barrio_slug,
    p_description: draft.description,
    p_price_from_ars: draft.price_from_ars,
    p_telegram_photo_file_id: draft.telegram_photo_file_id
  });
  if (error) throw error;
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  if (!secretsMatch(request.headers.get('x-telegram-bot-api-secret-token'), env.TELEGRAM_WEBHOOK_SECRET)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  let update: TelegramUpdate; try { update = await request.json() as TelegramUpdate; } catch { return NextResponse.json({error: 'Invalid JSON'}, {status: 400}); }
  const callback = update.callback_query;
  const message = callback?.message ?? update.message;
  // For callback queries, the real user is callback.from, not message.from (which is the bot).
  const user = callback?.from ?? message?.from;
  const chatId = message?.chat?.id;
  if (!user || !chatId) return NextResponse.json({ok: true});
  const supabase = createAdminClient();
  const {data: existingUpdate, error: lookupError} = await supabase.from('telegram_updates').select('processed_at').eq('update_id', update.update_id).maybeSingle();
  if (lookupError) return NextResponse.json({error: 'Temporary error'}, {status: 500});
  if (existingUpdate?.processed_at) return NextResponse.json({ok: true, duplicate: true});
  if (!existingUpdate) {
    const {error: insertError} = await supabase.from('telegram_updates').insert({update_id: update.update_id});
    if (insertError?.code === '23505') return NextResponse.json({ok: true, duplicate: true});
    if (insertError) return NextResponse.json({error: 'Temporary error'}, {status: 500});
  }
  const markProcessed = () => supabase.from('telegram_updates').update({processed_at: new Date().toISOString()}).eq('update_id', update.update_id);
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'BuenServ user';

  // Saved profiles.locale is the source of truth once it exists (the user made an explicit
  // choice, or a prior message already derived and persisted a default). Telegram's
  // language_code is only used to seed a sensible default for a brand-new profile.
  const {data: existingProfile} = await supabase.from('profiles').select('locale').eq('telegram_user_id', user.id).maybeSingle();
  const locale = (existingProfile?.locale as BotLocale | undefined) ?? detectLocaleFromTelegram(user.language_code);

  const {data: profile, error: profileError} = await supabase.from('profiles').upsert({telegram_user_id: user.id, display_name: displayName, locale}, {onConflict: 'telegram_user_id'}).select('id').single();
  if (profileError || !profile) return NextResponse.json({error: 'Temporary error'}, {status: 500});

  if (callback?.data) {
    const callbackData = callback.data;
    const callbackMessageId = callback.message?.message_id;
    try {
      if (callbackData === 'lang_menu' && callbackMessageId) {
        await editToLanguageMenu(env, chatId, callbackMessageId);
      } else if (callbackData.startsWith('lang_')) {
        const selected = callbackData.slice(5);
        const selectedLocale: BotLocale = selected === 'ru' ? 'ru' : selected === 'en' ? 'en' : 'es-AR';
        await supabase.from('profiles').update({locale: selectedLocale}).eq('id', profile.id);
        if (callbackMessageId) await editToMainMenu(env, chatId, callbackMessageId, selectedLocale);
        else await sendMainMenu(env, chatId, selectedLocale);
      } else if (callbackData === 'support') {
        await supabase.from('telegram_support_sessions').upsert({profile_id: profile.id}, {onConflict: 'profile_id'});
        await sendTelegramMessage(env, chatId, onboardingText(locale, 'support'));
      }
    } catch {
      // Telegram returns 400 "message is not modified" when the edited text/markup is
      // identical to the current message (e.g. re-tapping the already-selected language) —
      // harmless, nothing left to do for this callback.
    }
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({callback_query_id: callback.id})});
    await markProcessed();
    return NextResponse.json({ok: true});
  }

  const msgText = message.text?.trim() ?? '';
  const payload = startPayload(msgText);
  if (payload) await supabase.from('telegram_start_events').insert({update_id: update.update_id, profile_id: profile.id, payload});

  // Welcome / start — for a brand-new user (no saved locale yet) ask for a language
  // first so the whole experience is in their language; otherwise show the main menu.
  if (/^\/start$/i.test(msgText)) {
    if (!existingProfile) {
      await sendLanguageMenu(env, chatId);
    } else {
      await sendMainMenu(env, chatId, locale);
    }
    await markProcessed(); return NextResponse.json({ok: true});
  }

  if (startsSupport(msgText)) {
    await supabase.from('telegram_support_sessions').upsert({profile_id: profile.id}, {onConflict: 'profile_id'});
    await sendTelegramMessage(env, chatId, onboardingText(locale, 'support'));
    await markProcessed();
    return NextResponse.json({ok: true});
  }

  const reportTargetId = reportProviderId(message.text);
  if (reportTargetId) {
    const {data: target} = await supabase.from('providers').select('id').eq('id', reportTargetId).eq('status', 'approved').maybeSingle();
    if (!target) { await markProcessed(); return NextResponse.json({ok: true}); }
    await supabase.from('telegram_report_sessions').upsert({profile_id: profile.id, provider_id: target.id, step: 'reason'}, {onConflict: 'profile_id'});
    await sendTelegramMessage(env, chatId, onboardingText(locale, 'reportReason'));
    await markProcessed();
    return NextResponse.json({ok: true});
  }

  if (startsProviderOnboarding(message.text)) {
    await supabase.from('provider_onboarding_sessions').upsert({profile_id: profile.id, step: 'category', draft: {}}, {onConflict: 'profile_id'});
    const miniAppUrl = `${env.NEXT_PUBLIC_APP_URL}/mini-app/onboarding`;
    await sendTelegramMiniApp(env, chatId, onboardingText(locale, 'welcome'), miniAppUrl);
    await markProcessed();
    return NextResponse.json({ok: true});
  }

  // Customer clicks "Contact" on a provider's profile page → opens the Mini App
  // contact form where the customer explicitly chooses category and barrio.
  const performerId = performerProviderId(message.text);
  if (performerId) {
    const {data: targetProvider} = await supabase
      .from('providers')
      .select('id')
      .eq('id', performerId)
      .eq('status', 'approved')
      .maybeSingle();
    if (!targetProvider) {
      const notFound = locale === 'ru' ? 'Исполнитель не найден.' : locale === 'en' ? 'Provider not found.' : 'Prestador no encontrado.';
      await sendTelegramMessage(env, chatId, notFound);
      await markProcessed();
      return NextResponse.json({ok: true});
    }
    const contactUrl = `${env.NEXT_PUBLIC_APP_URL}/mini-app/contact/${targetProvider.id}`;
    const prompt = locale === 'ru' ? 'Выберите услугу и район, чтобы отправить запрос исполнителю.' : locale === 'en' ? 'Choose a service and neighbourhood to send your request to the provider.' : 'Elegí el servicio y el barrio para enviar tu solicitud al prestador.';
    await sendTelegramMiniApp(env, chatId, prompt, contactUrl);
    await markProcessed();
    return NextResponse.json({ok: true});
  }

  const {data: supportSession} = await supabase.from('telegram_support_sessions').select('profile_id').eq('profile_id', profile.id).maybeSingle();
  if (supportSession) {
    const details = message.text?.trim() ?? '';
    if (details.length < 10 || details.length > 2000) { await sendTelegramMessage(env, chatId, onboardingText(locale, 'support')); await markProcessed(); return NextResponse.json({ok: true}); }
    const {error: supportError} = await supabase.rpc('submit_support_request', {p_profile_id: profile.id, p_details: details});
    if (supportError?.message.includes('support_rate_limited')) {
      await supabase.from('telegram_support_sessions').delete().eq('profile_id', profile.id);
      await sendTelegramMessage(env, chatId, onboardingText(locale, rateLimitCopyKey('support')));
      await markProcessed(); return NextResponse.json({ok: true});
    }
    if (supportError) {
      try { await sendTelegramMessage(env, chatId, onboardingText(locale, 'supportFailed')); } catch {}
      return NextResponse.json({error: 'Support submission failed'}, {status: 500});
    }
    await supabase.from('telegram_support_sessions').delete().eq('profile_id', profile.id);
    // Open an explicit support-reply session so the user can continue the thread.
    await supabase.rpc('start_support_reply_session', {p_profile_id: profile.id});
    await sendTelegramMessage(env, chatId, onboardingText(locale, 'supportSubmitted'));
    // Push an admin alert through the outbox so the admin bot is notified.
    await supabase.rpc('enqueue_admin_alert', {p_notification_type: 'admin_new_support_request', p_payload: {details: details.slice(0, 200)}});
    await markProcessed(); return NextResponse.json({ok: true});
  }

  const {data: reportSession} = await supabase.from('telegram_report_sessions').select('provider_id,step,reason').eq('profile_id', profile.id).maybeSingle();
  if (reportSession) {
    if (reportSession.step === 'reason') {
      const reason = parseReportReason(message.text ?? '');
      if (!reason) { await sendTelegramMessage(env, chatId, onboardingText(locale, 'reportReason')); await markProcessed(); return NextResponse.json({ok: true}); }
      await supabase.from('telegram_report_sessions').update({step: 'details', reason, updated_at: new Date().toISOString()}).eq('profile_id', profile.id);
      await sendTelegramMessage(env, chatId, onboardingText(locale, 'reportDetails'));
      await markProcessed(); return NextResponse.json({ok: true});
    }
    const details = message.text?.trim() ?? '';
    if (details.length < 10 || details.length > 2000) { await sendTelegramMessage(env, chatId, onboardingText(locale, 'reportDetails')); await markProcessed(); return NextResponse.json({ok: true}); }
    const {error: reportError} = await supabase.rpc('submit_authenticated_report', {p_reporter_profile_id: profile.id, p_provider_id: reportSession.provider_id, p_reason: reportSession.reason, p_details: details});
    if (reportError?.message.includes('report_rate_limited')) {
      await supabase.from('telegram_report_sessions').delete().eq('profile_id', profile.id);
      await sendTelegramMessage(env, chatId, onboardingText(locale, rateLimitCopyKey('report')));
      await markProcessed(); return NextResponse.json({ok: true});
    }
    if (reportError) return NextResponse.json({error: 'Report submission failed'}, {status: 500});
    await supabase.from('telegram_report_sessions').delete().eq('profile_id', profile.id);
    await sendTelegramMessage(env, chatId, onboardingText(locale, 'reportSubmitted'));
    // Push an admin alert through the outbox so the admin bot is notified.
    await supabase.rpc('enqueue_admin_alert', {p_notification_type: 'admin_new_report', p_payload: {reason: reportSession.reason, details: details.slice(0, 200)}});
    await markProcessed(); return NextResponse.json({ok: true});
  }

  // Customer continuing an explicit support-reply session: only when the user opted
  // into reply mode (via /support or the "Continue" button) is non-command text
  // appended to the support request. Normal bot flows are never hijacked.
  if (!msgText.startsWith('/')) {
    const {data: replySession} = await supabase
      .from('telegram_support_reply_sessions')
      .select('support_request_id')
      .eq('profile_id', profile.id)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (replySession) {
      const {error: replyError} = await supabase.rpc('customer_reply_support_request', {
        p_profile_id: profile.id,
        p_body: msgText,
        p_external_source: 'telegram_webhook',
        p_external_id: `telegram_webhook:${update.update_id}:support_reply`
      });
      if (!replyError) {
        const ack = locale === 'ru' ? '✅ Сообщение отправлено в поддержку.' : locale === 'en' ? '✅ Message sent to support.' : '✅ Mensaje enviado al soporte.';
        await sendTelegramMessage(env, chatId, ack);
        await markProcessed(); return NextResponse.json({ok: true});
      }
    }
  }

  const {data: session} = await supabase.from('provider_onboarding_sessions').select('step,draft').eq('profile_id', profile.id).maybeSingle();
  if (!session) { await markProcessed(); return NextResponse.json({ok: true}); }
  const draft = (session.draft ?? {}) as Draft; let next: OnboardingStep | null = null; let reply = '';
  if (session.step === 'category') { const category = parseCategory(message.text ?? ''); if (!category) reply = onboardingText(locale, 'category'); else { draft.category_slug = category; next = 'barrio'; reply = onboardingText(locale, 'barrio'); } }
  else if (session.step === 'barrio') { const barrio = parseBarrio(message.text ?? ''); if (!barrio) reply = onboardingText(locale, 'barrio'); else { draft.barrio_slug = barrio; next = 'description'; reply = onboardingText(locale, 'description'); } }
  else if (session.step === 'description') { const description = message.text?.trim() ?? ''; if (description.length < 20 || description.length > 800) reply = onboardingText(locale, 'description'); else { draft.description = description; next = 'price'; reply = onboardingText(locale, 'price'); } }
  else if (session.step === 'price') { const price = parseArsPrice(message.text ?? ''); if (!price) reply = onboardingText(locale, 'invalidPrice'); else { draft.price_from_ars = price; next = 'photo'; reply = onboardingText(locale, 'photo'); } }
  else if (session.step === 'photo') { const photo = message.photo?.at(-1)?.file_id; if (!photo) reply = onboardingText(locale, 'photo'); else { draft.telegram_photo_file_id = photo; next = 'confirm'; reply = onboardingText(locale, 'confirm'); } }
  else if (session.step === 'confirm') { if (!isConfirmation(message.text ?? '')) reply = onboardingText(locale, 'confirm'); else { try { await submitProvider(supabase, profile.id, user.id, displayName, draft); await supabase.from('provider_onboarding_sessions').delete().eq('profile_id', profile.id); reply = onboardingText(locale, 'submitted'); } catch { try { await sendTelegramMessage(env, chatId, onboardingText(locale, 'submissionFailed')); } catch {} return NextResponse.json({error: 'Submission failed'}, {status: 500}); } } }
  if (next) {
    await supabase.from('provider_onboarding_sessions').update({step: next, draft, updated_at: new Date().toISOString()}).eq('profile_id', profile.id);
    if (next === 'barrio') { await sendTelegramKeyboard(env, chatId, onboardingText(locale, 'barrio'), barrioKeyboard(locale)); await markProcessed(); return NextResponse.json({ok: true}); }
    if (next === 'description' || next === 'price' || next === 'photo' || next === 'confirm') { await removeTelegramKeyboard(env, chatId, reply); await markProcessed(); return NextResponse.json({ok: true}); }
  }
  // Repeat the current step keyboard when the user's input was invalid.
  if (session.step === 'category') { await sendTelegramKeyboard(env, chatId, reply, categoryKeyboard(locale)); }
  else if (session.step === 'barrio') { await sendTelegramKeyboard(env, chatId, reply, barrioKeyboard(locale)); }
  else { await sendTelegramMessage(env, chatId, reply); }
  await markProcessed(); return NextResponse.json({ok: true});
}
