import {timingSafeEqual} from 'node:crypto';
import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env';
import {isConfirmation, onboardingText, parseArsPrice, parseBarrio, parseCategory, sendTelegramMessage, type BotLocale, type OnboardingStep} from '@/lib/telegram/provider-onboarding';

type TelegramUpdate = {update_id: number; message?: {text?: string; photo?: Array<{file_id: string}>; chat?: {id: number}; from?: {id: number; first_name?: string; last_name?: string; language_code?: string}}};
type Draft = {category_slug?: string; barrio_slug?: string; description?: string; price_from_ars?: number; telegram_photo_file_id?: string};

function normalizeLocale(language?: string): BotLocale { if (language?.startsWith('ru')) return 'ru'; if (language?.startsWith('en')) return 'en'; return 'es-AR'; }
function secretsMatch(received: string | null, expected: string) { if (!received) return false; const left = Buffer.from(received); const right = Buffer.from(expected); return left.length === right.length && timingSafeEqual(left, right); }
function startsProviderOnboarding(text?: string) { return /^\/(start\s+provider|provider)\b/i.test(text?.trim() ?? ''); }
function slugify(name: string, telegramId: number) { return `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'provider'}-${telegramId}`; }

async function submitProvider(supabase: ReturnType<typeof createAdminClient>, profileId: string, telegramId: number, name: string, draft: Draft) {
  if (!draft.category_slug || !draft.barrio_slug || !draft.description || !draft.price_from_ars || !draft.telegram_photo_file_id) throw new Error('Incomplete onboarding draft');
  const [{data: category}, {data: barrio}] = await Promise.all([
    supabase.from('categories').select('id').eq('slug', draft.category_slug).single(),
    supabase.from('barrios').select('id').eq('slug', draft.barrio_slug).single()
  ]);
  if (!category || !barrio) throw new Error('Unknown category or barrio');
  const {data: provider, error} = await supabase.from('providers').upsert({
    profile_id: profileId, slug: slugify(name, telegramId), status: 'pending', bio: draft.description,
    photo_path: null, onboarding_payload: {telegram_photo_file_id: draft.telegram_photo_file_id}
  }, {onConflict: 'profile_id'}).select('id').single();
  if (error || !provider) throw error ?? new Error('Provider submission failed');
  await Promise.all([
    supabase.from('provider_categories').delete().eq('provider_id', provider.id),
    supabase.from('provider_barrios').delete().eq('provider_id', provider.id)
  ]);
  const {error: relationError} = await supabase.from('provider_categories').insert({provider_id: provider.id, category_id: category.id, price_from_ars: draft.price_from_ars});
  if (relationError) throw relationError;
  const {error: barrioError} = await supabase.from('provider_barrios').insert({provider_id: provider.id, barrio_id: barrio.id});
  if (barrioError) throw barrioError;
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  if (!secretsMatch(request.headers.get('x-telegram-bot-api-secret-token'), env.TELEGRAM_WEBHOOK_SECRET)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  let update: TelegramUpdate; try { update = await request.json() as TelegramUpdate; } catch { return NextResponse.json({error: 'Invalid JSON'}, {status: 400}); }
  const message = update.message; const user = message?.from; const chatId = message?.chat?.id;
  if (!user || !chatId) return NextResponse.json({ok: true});
  const supabase = createAdminClient();
  const {error: updateError} = await supabase.from('telegram_updates').insert({update_id: update.update_id});
  if (updateError?.code === '23505') return NextResponse.json({ok: true, duplicate: true});
  if (updateError) return NextResponse.json({error: 'Temporary error'}, {status: 500});
  const locale = normalizeLocale(user.language_code); const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'BuenServ user';
  const {data: profile, error: profileError} = await supabase.from('profiles').upsert({telegram_user_id: user.id, display_name: displayName, locale}, {onConflict: 'telegram_user_id'}).select('id').single();
  if (profileError || !profile) return NextResponse.json({error: 'Temporary error'}, {status: 500});

  if (startsProviderOnboarding(message.text)) {
    await supabase.from('provider_onboarding_sessions').upsert({profile_id: profile.id, step: 'category', draft: {}}, {onConflict: 'profile_id'});
    await sendTelegramMessage(env, chatId, `${onboardingText(locale, 'welcome')}\n\n${onboardingText(locale, 'category')}`);
    return NextResponse.json({ok: true});
  }

  const {data: session} = await supabase.from('provider_onboarding_sessions').select('step,draft').eq('profile_id', profile.id).maybeSingle();
  if (!session) return NextResponse.json({ok: true});
  const draft = (session.draft ?? {}) as Draft; let next: OnboardingStep | null = null; let reply = '';
  if (session.step === 'category') { const category = parseCategory(message.text ?? ''); if (!category) reply = onboardingText(locale, 'category'); else { draft.category_slug = category; next = 'barrio'; reply = onboardingText(locale, 'barrio'); } }
  else if (session.step === 'barrio') { const barrio = parseBarrio(message.text ?? ''); if (!barrio) reply = onboardingText(locale, 'barrio'); else { draft.barrio_slug = barrio; next = 'description'; reply = onboardingText(locale, 'description'); } }
  else if (session.step === 'description') { const description = message.text?.trim() ?? ''; if (description.length < 20 || description.length > 800) reply = onboardingText(locale, 'description'); else { draft.description = description; next = 'price'; reply = onboardingText(locale, 'price'); } }
  else if (session.step === 'price') { const price = parseArsPrice(message.text ?? ''); if (!price) reply = onboardingText(locale, 'invalidPrice'); else { draft.price_from_ars = price; next = 'photo'; reply = onboardingText(locale, 'photo'); } }
  else if (session.step === 'photo') { const photo = message.photo?.at(-1)?.file_id; if (!photo) reply = onboardingText(locale, 'photo'); else { draft.telegram_photo_file_id = photo; next = 'confirm'; reply = onboardingText(locale, 'confirm'); } }
  else if (session.step === 'confirm') { if (!isConfirmation(message.text ?? '')) reply = onboardingText(locale, 'confirm'); else { try { await submitProvider(supabase, profile.id, user.id, displayName, draft); await supabase.from('provider_onboarding_sessions').delete().eq('profile_id', profile.id); reply = onboardingText(locale, 'submitted'); } catch { return NextResponse.json({error: 'Submission failed'}, {status: 500}); } } }
  if (next) await supabase.from('provider_onboarding_sessions').update({step: next, draft, updated_at: new Date().toISOString()}).eq('profile_id', profile.id);
  try { await sendTelegramMessage(env, chatId, reply); } catch { return NextResponse.json({error: 'Telegram delivery failed'}, {status: 502}); }
  return NextResponse.json({ok: true});
}
