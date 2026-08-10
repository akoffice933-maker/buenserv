#!/usr/bin/env node
// Usage: node scripts/set-webhook.mjs <tunnel-url> [--admin]
const isAdmin = process.argv.includes('--admin');
const tunnelUrl = process.argv[2];
const BOT_TOKEN = isAdmin ? process.env.TELEGRAM_ADMIN_BOT_TOKEN : process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = isAdmin ? process.env.TELEGRAM_ADMIN_WEBHOOK_SECRET : process.env.TELEGRAM_WEBHOOK_SECRET;
const route = isAdmin ? '/api/telegram/admin-webhook' : '/api/telegram/webhook';

if (!tunnelUrl || tunnelUrl.startsWith('--')) {
  console.error('Usage: node scripts/set-webhook.mjs <tunnel-url> [--admin]');
  process.exit(1);
}
if (!BOT_TOKEN || !WEBHOOK_SECRET) {
  console.error(`Missing ${isAdmin ? 'TELEGRAM_ADMIN_BOT_TOKEN / TELEGRAM_ADMIN_WEBHOOK_SECRET' : 'TELEGRAM_BOT_TOKEN / TELEGRAM_WEBHOOK_SECRET'}`);
  process.exit(1);
}

const webhookUrl = `${tunnelUrl.replace(/\/$/, '')}${route}`;
const params = new URLSearchParams({url: webhookUrl, secret_token: WEBHOOK_SECRET, allowed_updates: JSON.stringify(isAdmin ? ['message'] : ['message', 'callback_query']), drop_pending_updates: 'true'});
const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?${params}`);
const result = await response.json();
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
