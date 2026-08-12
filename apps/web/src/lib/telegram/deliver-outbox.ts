import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env';

type OutboxItem = {
  id: string;
  notification_type: string;
  payload: {lead_id?: string};
  telegram_user_id: number | null;
  attempt_count: number;
};

type DeliveryResult = {
  claimed: number;
  sent: number;
};

function buildNotificationText(type: string, leadId?: string | null) {
  return type === 'provider_lead_notification'
    ? `🔔 Tenés una nueva solicitud en BuenServ. Abrí tu gabinete para verla.`
    : `💬 Un prestador respondió a tu solicitud en BuenServ. Abrí tu gabinete para continuar.`;
}

export async function deliverOutboxBatch(batchSize = 20): Promise<DeliveryResult> {
  const env = getServerEnv();
  const supabase = createAdminClient();

  const limit = Math.max(1, Math.min(batchSize, 100));
  const {data: batch, error: claimError} = await supabase.rpc('claim_notification_outbox', {p_limit: limit});
  if (claimError) throw new Error('Failed to claim notification outbox');
  if (!Array.isArray(batch)) return {claimed: 0, sent: 0};

  let sent = 0;
  for (const item of batch as OutboxItem[]) {
    try {
      if (!item.telegram_user_id) throw new Error('recipient_has_no_telegram_user_id');
      const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          chat_id: item.telegram_user_id,
          text: buildNotificationText(item.notification_type, item.payload?.lead_id)
        })
      });
      const body = await response.json();
      if (!response.ok || !body?.ok) throw new Error(`telegram_delivery_failed:${response.status}`);
      await supabase.rpc('complete_notification_outbox', {p_id: item.id, p_telegram_message_id: body.result?.message_id});
      sent += 1;
    } catch (error) {
      try {
        await supabase.rpc('fail_notification_outbox', {p_id: item.id, p_error: error instanceof Error ? error.message : 'unknown_delivery_error'});
      } catch {
        // Ignore failure to mark outbox as failed; delivery logic already attempted.
      }
    }
  }

  return {claimed: batch.length, sent};
}
