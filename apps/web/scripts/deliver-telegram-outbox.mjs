#!/usr/bin/env node
/**
 * Delivers a bounded, retry-safe batch from notification_outbox.
 * Invoke from an authenticated scheduler/worker only; it uses the service role
 * directly and never exposes a public HTTP endpoint.
 */
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TELEGRAM_BOT_TOKEN'];
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`);

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const headers = {apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json'};
const rpc = async (name, body) => {
  const response = await fetch(`${base}/rest/v1/rpc/${name}`, {method: 'POST', headers, body: JSON.stringify(body)});
  if (!response.ok) throw new Error(`${name} failed: ${response.status}`);
  return response.json();
};

const copy = (type, leadId) => type === 'provider_lead_notification'
  ? `🔔 Tenés una nueva solicitud en BuenServ. Abrí tu gabinete para verla.\n\n${process.env.NEXT_PUBLIC_APP_URL}/mini-app`
  : `💬 Un prestador respondió a tu solicitud en BuenServ. Abrí tu gabinete para continuar.\n\n${process.env.NEXT_PUBLIC_APP_URL}/mini-app`;

const batch = await rpc('claim_notification_outbox', {p_limit: Number(process.env.NOTIFICATION_OUTBOX_BATCH_SIZE ?? 20)});
let sent = 0;
for (const item of batch) {
  try {
    if (!item.telegram_user_id) throw new Error('recipient_has_no_telegram_user_id');
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify({chat_id: item.telegram_user_id, text: copy(item.notification_type, item.payload?.lead_id)})
    });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(`telegram_delivery_failed:${response.status}`);
    await rpc('complete_notification_outbox', {p_id: item.id, p_telegram_message_id: body.result.message_id});
    sent += 1;
  } catch (error) {
    await rpc('fail_notification_outbox', {p_id: item.id, p_error: error instanceof Error ? error.message : 'unknown_delivery_error'});
  }
}
console.log(JSON.stringify({claimed: batch.length, sent}));
