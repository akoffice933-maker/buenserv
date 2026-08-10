#!/usr/bin/env node
// Set Telegram webhook for BuenServ local development
// Usage: node scripts/set-webhook.mjs <tunnel-url>
// Example: node scripts/set-webhook.mjs https://abc123.trycloudflare.com

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

const tunnelUrl = process.argv[2];
if (!tunnelUrl) {
  console.error('Usage: node scripts/set-webhook.mjs <tunnel-url>');
  console.error('Example: node scripts/set-webhook.mjs https://abc123.trycloudflare.com');
  process.exit(1);
}

const webhookUrl = `${tunnelUrl.replace(/\/$/, '')}/api/telegram/webhook`;
const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;

const params = new URLSearchParams({
  url: webhookUrl,
  secret_token: WEBHOOK_SECRET,
  allowed_updates: JSON.stringify(['message']),
  drop_pending_updates: 'true',
});

console.log(`Setting webhook to: ${webhookUrl}`);
console.log(`Secret token: ${WEBHOOK_SECRET.substring(0, 8)}...`);

const response = await fetch(`${url}?${params}`);
const result = await response.json();
console.log('Response:', JSON.stringify(result, null, 2));

if (result.ok) {
  console.log('\n✅ Webhook set successfully!');
  console.log('Test the bot: https://t.me/buenserv_bot');
} else {
  console.error('\n❌ Failed to set webhook:', result.description);
  process.exit(1);
}