import {timingSafeEqual} from 'node:crypto';
import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env';
import {isConfirmation, onboardingText, parseArsPrice, parseBarrio, parseCategory, parseReportReason, rateLimitCopyKey, sendTelegramMessage, sendTelegramKeyboard, removeTelegramKeyboard, sendTelegramMiniApp, categoryKeyboard, barrioKeyboard, type BotLocale, type OnboardingStep} from '@/lib/telegram/provider-onboarding';
import {reportProviderId, startPayload, startsProviderOnboarding, startsSupport} from '@/lib/telegram/start-payload';

type TelegramUser = {id: number; first_name?: string; last_name?: string; language_code?: string};
type TelegramMessage = {text?: string; photo?: Array<{file_id: string}>; chat?: {id: number}; from?: TelegramUser};
type TelegramUpdate = {update_id: number; message?: TelegramMessage; callback_query?: {id: string; data?: string; from: TelegramUser; message?: TelegramMessage}};
type Draft = {category_slug?: string; barrio_slug?: string; description?: string; price_from_ars?: number; telegram_photo_file_id?: string};

function normalizeLocale(language?: string): BotLocale { if (language?.startsWith('ru')) return 'ru'; if (language?.startsWith('en')) return 'en'; return 'es-AR'; }
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
  const message = update.message ?? callback?.message;
  const user = message?.from ?? callback?.from;
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
  const locale = normalizeLocale(user.language_code); const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'BuenServ user';
  const {data: profile, error: profileError} = await supabase.from('profiles').upsert({telegram_user_id: user.id, display_name: displayName, locale}, {onConflict: 'telegram_user_id'}).select('id').single();
  if (profileError || !profile) return NextResponse.json({error: 'Temporary error'}, {status: 500});

  if (callback?.data) {
    const callbackData = callback.data;
    if (callbackData.startsWith('lang_')) {
      const selected = callbackData.slice(5);
      const selectedLocale: BotLocale = selected === 'ru' ? 'ru' : selected === 'en' ? 'en' : 'es-AR';
      await supabase.from('profiles').update({locale: selectedLocale}).eq('id', profile.id);
      await sendTelegramMessage(env, chatId, selectedLocale === 'ru' ? 'Язык установлен.' : selectedLocale === 'en' ? 'Language set.' : 'Idioma configurado.');
    } else if (callbackData === 'support') {
      await supabase.from('telegram_support_sessions').upsert({profile_id: profile.id}, {onConflict: 'profile_id'});
      await sendTelegramMessage(env, chatId, onboardingText(locale, 'support'));
    }
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({callback_query_id: callback.id})});
    await markProcessed();
    return NextResponse.json({ok: true});
  }

  const msgText = message.text?.trim() ?? '';
  const payload = startPayload(msgText);
  if (payload) await supabase.from('telegram_start_events').insert({update_id: update.update_id, profile_id: profile.id, payload});

  // Welcome / start — Mini App button + language selection
  if (/^\/start$/i.test(msgText)) {
    const miniAppUrl = `${env.NEXT_PUBLIC_APP_URL}/mini-app`;
    const welcome = `👋 <b>BuenServ</b>\n\n🇪🇸 Servicios locales de confianza en Buenos Aires.\n🇷🇺 Надёжные местные услуги в Буэнос-Айресе.\n🇬🇧 Trusted local services in Buenos Aires.\n\n👇 Open your cabinet to explore or track requests.`;
    const menu = {
      inline_keyboard: [
        [{text: '🚀 Open Mini App', web_app: {url: miniAppUrl}}],
        [{text: '🇪🇸 Español', callback_data: 'lang_es-AR'}, {text: '🇷🇺 Русский', callback_data: 'lang_ru'}],
        [{text: '🇬🇧 English', callback_data: 'lang_en'}, {text: '💬 Support', callback_data: 'support'}]
      ]
    };
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify({chat_id: chatId, text: welcome, parse_mode: 'HTML', reply_markup: menu})
    });
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
    await sendTelegramMiniApp(env, chatId, `${onboardingText(locale, 'welcome')}\n\nClick the button below to open the onboarding form.`, miniAppUrl);
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
    await sendTelegramMessage(env, chatId, onboardingText(locale, 'supportSubmitted'));
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
    await markProcessed(); return NextResponse.json({ok: true});
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
