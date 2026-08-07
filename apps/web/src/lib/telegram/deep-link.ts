import 'server-only';

export function getTelegramBotUsername() {
  return process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, '') ?? '';
}

export function getTelegramDeepLink(startPayload?: string) {
  const username = getTelegramBotUsername();
  if (!username) return 'https://t.me';
  return startPayload ? `https://t.me/${username}?start=${encodeURIComponent(startPayload)}` : `https://t.me/${username}`;
}
