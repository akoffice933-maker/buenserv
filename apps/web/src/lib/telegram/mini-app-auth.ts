import 'server-only';

import {createAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env';
import {verifyTelegramWebAppInitData, type TelegramWebAppUser} from '@/lib/telegram/webapp';

export type MiniAppIdentity = {
  profileId: string;
  telegramUser: TelegramWebAppUser;
};

/**
 * Resolves the actor exclusively from signed Telegram WebApp init data.
 * A Mini App request must never choose a profile, provider, or role itself.
 *
 * maxAgeSeconds has no default on purpose — every call site must decide its own
 * freshness window explicitly rather than inherit a shared value that's wrong for
 * half of them. initData's auth_date is fixed to when Telegram opened the Mini App
 * and does not refresh while the WebView stays open, so a stolen initData string is
 * replayable for the full window regardless of ownership/idempotency checks
 * downstream — those protect against a legitimate owner's accidental duplicate
 * action, not against someone else who obtained a valid initData string. State-
 * changing routes (submit, lead actions) should use a short window (e.g. 600s);
 * read-only routes (dashboard) can reasonably use a longer one.
 */
export async function resolveMiniAppIdentity(initData: string, maxAgeSeconds: number): Promise<MiniAppIdentity | null> {
  const env = getServerEnv();
  const telegramUser = verifyTelegramWebAppInitData(initData, env.TELEGRAM_BOT_TOKEN, maxAgeSeconds);
  const {data: profile, error} = await createAdminClient()
    .from('profiles')
    .select('id')
    .eq('telegram_user_id', telegramUser.id)
    .maybeSingle();

  if (error) throw new Error('Failed to resolve Mini App profile');
  if (!profile) return null;
  return {profileId: profile.id, telegramUser};
}

export function getMiniAppInitData(request: Request) {
  return request.headers.get('x-telegram-init-data')?.trim() ?? '';
}
