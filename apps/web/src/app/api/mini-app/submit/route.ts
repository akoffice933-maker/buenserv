import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env';
import {verifyTelegramWebAppInitData} from '@/lib/telegram/webapp';
import {sendTelegramMessage, type BotLocale} from '@/lib/telegram/provider-onboarding';

export async function POST(request: NextRequest) {
  const env = getServerEnv(); const supabase = createAdminClient();
  try {
    const formData = await request.formData();
    const initData = formData.get('initData') as string;
    const category = formData.get('category') as string; const barrio = formData.get('barrio') as string;
    const description = formData.get('description') as string; const price = formData.get('price') as string;
    if (!initData || !category || !barrio || !description || !price) return NextResponse.json({error: 'Missing required fields'}, {status: 400});
    if (description.length < 20 || description.length > 800) return NextResponse.json({error: 'Description must be 20-800 characters'}, {status: 400});
    const priceNum = Number(price); if (!Number.isFinite(priceNum) || priceNum <= 0 || priceNum > 100_000_000) return NextResponse.json({error: 'Invalid price'}, {status: 400});
    const user = verifyTelegramWebAppInitData(initData, env.TELEGRAM_BOT_TOKEN);
    const locale: BotLocale = user.language_code?.startsWith('ru') ? 'ru' : user.language_code?.startsWith('en') ? 'en' : 'es-AR';
    const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'BuenServ user';
    const {data: profile, error: profileError} = await supabase.from('profiles').upsert({telegram_user_id: user.id, display_name: displayName, locale}, {onConflict: 'telegram_user_id'}).select('id').single();
    if (profileError || !profile) return NextResponse.json({error: 'Failed to resolve profile'}, {status: 500});
    const [{data: categoryRow}, {data: barrioRow}] = await Promise.all([
      supabase.from('categories').select('id').eq('slug', category).eq('active', true).maybeSingle(),
      supabase.from('barrios').select('id').eq('slug', barrio).eq('active', true).maybeSingle()
    ]);
    if (!categoryRow || !barrioRow) return NextResponse.json({error: 'Invalid category or barrio'}, {status: 400});
    await supabase.from('provider_onboarding_sessions').upsert({profile_id: profile.id, step: 'photo', draft: {category_slug: category, barrio_slug: barrio, description, price_from_ars: Math.round(priceNum)}}, {onConflict: 'profile_id'});
    const prompt = locale === 'ru' ? 'Данные сохранены. Теперь отправьте фото профиля прямо в этот чат Telegram.' : locale === 'en' ? 'Your details are saved. Now send your profile photo directly in this Telegram chat.' : 'Tus datos fueron guardados. Ahora enviá tu foto de perfil directamente en este chat de Telegram.';
    await sendTelegramMessage(env, user.id, prompt);
    return NextResponse.json({ok: true, next: 'photo_in_telegram'});
  } catch (error) {
    const message = error instanceof Error && error.message.includes('init data') || error instanceof Error && error.message.includes('signature') ? 'Invalid Telegram Mini App session' : 'Internal error';
    return NextResponse.json({error: message}, {status: 400});
  }
}
