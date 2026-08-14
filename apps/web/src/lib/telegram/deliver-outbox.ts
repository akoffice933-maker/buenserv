import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env';

type OutboxItem = {
  id: string;
  notification_type: string;
  payload: {lead_id?: string};
  telegram_user_id: number | null;
  attempt_count: number;
  bot_kind?: 'public_bot' | 'admin_bot';
};

type DeliveryResult = {
  claimed: number;
  sent: number;
};

const NOTIFICATION_COPY: Record<string, string> = {
  provider_lead_notification: '🔔 Tenés una nueva solicitud en BuenServ. Tocá el botón para abrir tu gabinete.',
  customer_provider_reply: '💬 Un prestador respondió a tu solicitud en BuenServ. Tocá el botón para continuar.',
  provider_customer_reply: '💬 El cliente respondió en BuenServ. Tocá el botón para continuar.',
  customer_provider_completed: '✅ El prestador marcó el servicio como realizado. Tocá el botón para confirmar.',
  provider_customer_confirmed: '✅ El cliente confirmó que el servicio fue realizado. Tocá el botón para ver el detalle.'
};

const ADMIN_NOTIFICATION_COPY: Record<string, string> = {
  admin_new_support_request: '💬 Nuevo mensaje de soporte. Usá /support para verlo.',
  admin_new_report: '🚩 Nueva denuncia. Usá /reports para verla.',
  admin_outbox_failed: '📨 Outbox permanently failed. Usá /alerts para ver el detalle.'
};

export function buildNotificationPayload(type: string) {
  const text = NOTIFICATION_COPY[type] ?? NOTIFICATION_COPY.customer_provider_reply;

  return {
    text,
    reply_markup: {
      inline_keyboard: [[
        {
          text: 'Abrí tu gabinete',
          web_app: {url: `${process.env.NEXT_PUBLIC_APP_URL}/mini-app`}
        }
      ]]
    }
  };
}

export function buildAdminNotificationPayload(type: string) {
  const text = ADMIN_NOTIFICATION_COPY[type] ?? '🔔 Nueva alerta de BuenServ.';
  return {text};
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
      const isAdmin = item.bot_kind === 'admin_bot';
      const botToken = isAdmin ? env.TELEGRAM_ADMIN_BOT_TOKEN : env.TELEGRAM_BOT_TOKEN;
      if (!botToken) throw new Error('bot_token_not_configured');
      const payload = isAdmin
        ? {chat_id: item.telegram_user_id, ...buildAdminNotificationPayload(item.notification_type)}
        : {chat_id: item.telegram_user_id, ...buildNotificationPayload(item.notification_type)};
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(payload)
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
