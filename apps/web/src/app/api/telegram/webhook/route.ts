import {timingSafeEqual} from 'node:crypto';
import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env';
import {onboardingText, sendTelegramMessage, type BotLocale} from '@/lib/telegram/provider-onboarding';

type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat?: {id: number};
    from?: {id: number; first_name?: string; last_name?: string; language_code?: string};
  };
};

function normalizeLocale(language?: string): BotLocale {
  if (language?.startsWith('ru')) return 'ru';
  if (language?.startsWith('en')) return 'en';
  return 'es-AR';
}

function secretsMatch(received: string | null, expected: string) {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function startsProviderOnboarding(text?: string) {
  return /^\/(start\s+provider|provider)\b/i.test(text?.trim() ?? '');
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  if (!secretsMatch(request.headers.get('x-telegram-bot-api-secret-token'), env.TELEGRAM_WEBHOOK_SECRET)) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  let update: TelegramUpdate;
  try {
    update = await request.json() as TelegramUpdate;
  } catch {
    return NextResponse.json({error: 'Invalid JSON'}, {status: 400});
  }

  const message = update.message;
  const user = message?.from;
  const chatId = message?.chat?.id;
  if (!user || !chatId) return NextResponse.json({ok: true});

  const supabase = createAdminClient();
  const {error: updateError} = await supabase.from('telegram_updates').insert({update_id: update.update_id});
  if (updateError?.code === '23505') return NextResponse.json({ok: true, duplicate: true});
  if (updateError) return NextResponse.json({error: 'Temporary error'}, {status: 500});

  const locale = normalizeLocale(user.language_code);
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'BuenServ user';
  const {data: profile, error: profileError} = await supabase.from('profiles').upsert({
    telegram_user_id: user.id,
    display_name: displayName,
    locale
  }, {onConflict: 'telegram_user_id'}).select('id').single();

  if (profileError || !profile) return NextResponse.json({error: 'Temporary error'}, {status: 500});

  if (startsProviderOnboarding(message.text)) {
    const {error: sessionError} = await supabase.from('provider_onboarding_sessions').upsert({
      profile_id: profile.id, step: 'category', draft: {}
    }, {onConflict: 'profile_id'});
    if (sessionError) return NextResponse.json({error: 'Temporary error'}, {status: 500});
    try {
      await sendTelegramMessage(env, chatId, `${onboardingText(locale, 'welcome')}\n\n${onboardingText(locale, 'category')}`);
    } catch {
      return NextResponse.json({error: 'Telegram delivery failed'}, {status: 502});
    }
  }

  return NextResponse.json({ok: true});
}
