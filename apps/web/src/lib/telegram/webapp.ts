import 'server-only';
import {createHmac, timingSafeEqual} from 'node:crypto';

export type TelegramWebAppUser = {id: number; first_name?: string; last_name?: string; language_code?: string};

export function verifyTelegramWebAppInitData(initData: string, botToken: string, maxAgeSeconds = 86400): TelegramWebAppUser {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  const authDate = Number(params.get('auth_date'));
  const userRaw = params.get('user');
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  // Reject stale sessions and clocks materially ahead of the server. State-changing
  // Mini App routes pass a short maxAgeSeconds window to reduce replay exposure.
  if (!hash || !authDate || !userRaw || ageSeconds > maxAgeSeconds || ageSeconds < -30) throw new Error('Invalid Telegram Mini App init data');
  params.delete('hash');
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculated = createHmac('sha256', secret).update(dataCheckString).digest('hex');
  const left = Buffer.from(hash); const right = Buffer.from(calculated);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error('Invalid Telegram Mini App signature');
  return JSON.parse(userRaw) as TelegramWebAppUser;
}
