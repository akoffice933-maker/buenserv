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
 */
export async function resolveMiniAppIdentity(initData: string, maxAgeSeconds = 600): Promise<MiniAppIdentity | null> {
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
