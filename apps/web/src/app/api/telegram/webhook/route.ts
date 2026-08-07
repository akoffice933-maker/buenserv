import {timingSafeEqual} from 'node:crypto';
import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env';

type TelegramUpdate = {
  update_id: number;
  message?: {from?: {id: number; first_name?: string; last_name?: string; language_code?: string}};
};

function normalizeLocale(language?: string) {
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

  const user = update.message?.from;
  if (!user) return NextResponse.json({ok: true});

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'BuenServ user';
  const supabase = createAdminClient();
  const {error} = await supabase.from('profiles').upsert({
    telegram_user_id: user.id,
    display_name: displayName,
    locale: normalizeLocale(user.language_code)
  }, {onConflict: 'telegram_user_id'});

  if (error) {
    console.error('Telegram profile upsert failed', {updateId: update.update_id, code: error.code});
    return NextResponse.json({error: 'Temporary error'}, {status: 500});
  }
  return NextResponse.json({ok: true});
}
