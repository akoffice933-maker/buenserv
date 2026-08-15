import {timingSafeEqual} from 'node:crypto';
import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env';
import {
  sendAdminMessage, editAdminMessage, answerCallbackQuery, requireAdminRole,
  issueActionToken, consumeActionToken, setAdminPanelState, fetchAdminSummary,
  escapeHtml, isActionAllowed,
  type AdminRole, type AdminIdentity, type InlineKeyboard
} from '@/lib/telegram/admin-bot';

type AdminUpdate = {
  update_id: number;
  message?: {text?: string; chat?: {id: number}; from?: {id: number; first_name?: string}};
  callback_query?: {id: string; data?: string; from: {id: number; first_name?: string}; message?: {message_id: number; chat?: {id: number}; from?: {id: number; first_name?: string}; text?: string}};
};

function secretsMatch(received: string | null, expected: string) {
  if (!received) return false;
  const left = Buffer.from(received); const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

// ─── Panel builders ────────────────────────────────────────────────────────

function panelKeyboard(): InlineKeyboard {
  return [
    [{text: '🧰 Модерация', callback_data: 'adm:moderation'}, {text: '🚩 Жалобы', callback_data: 'adm:reports'}],
    [{text: '💬 Поддержка', callback_data: 'adm:support'}, {text: '📋 Заявки', callback_data: 'adm:leads'}],
    [{text: '📊 Сводка', callback_data: 'adm:summary'}, {text: '🚨 Алерты', callback_data: 'adm:alerts'}],
    [{text: '🔄 Обновить', callback_data: 'adm:panel'}]
  ];
}

async function buildPanelMessage(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  const s = await fetchAdminSummary(supabase);
  return `<b>🔧 BuenServ · Панель управления</b>\n\n` +
    `🧰 На модерации: <b>${s.pendingProviders}</b>\n` +
    `🚩 Новые жалобы: <b>${s.openReports}</b>\n` +
    `💬 Новые обращения: <b>${s.openSupport}</b>\n` +
    `📋 Заявки без ответа >24ч: <b>${s.staleLeads}</b>\n` +
    `📨 Outbox errors: <b>${s.outboxErrors}</b>`;
}

// ─── Provider moderation ────────────────────────────────────────────────────

async function showModerationQueue(supabase: ReturnType<typeof createAdminClient>, token: string, chatId: number, messageId?: number) {
  const {data: providers} = await supabase
    .from('providers')
    .select('id,slug,created_at,bio,profiles!providers_profile_id_fkey(display_name),provider_categories(price_from_ars,categories!provider_categories_category_id_fkey(slug)),provider_barrios(barrios!provider_barrios_barrio_id_fkey(slug,name_es,name_ru,name_en))')
    .eq('status', 'pending')
    .order('created_at', {ascending: false})
    .limit(10);

  if (!providers?.length) {
    const text = '✅ Все исполнители проверены. Нет ожидающих модерации.';
    const kb: InlineKeyboard = [[{text: '← Панель', callback_data: 'adm:panel'}]];
    if (messageId) await editAdminMessage(token, chatId, messageId, text, kb);
    else await sendAdminMessage(token, chatId, text, kb);
    return;
  }

  const p = providers[0];
  const name = (p.profiles as unknown as {display_name?: string | null})?.display_name ?? p.slug;
  const cats = (p.provider_categories as unknown as Array<{price_from_ars?: number; categories?: {slug: string}}>) ?? [];
  const barrios = (p.provider_barrios as unknown as Array<{barrios?: {name_es?: string; name_ru?: string; name_en?: string}}>) ?? [];
  const catStr = cats.map(c => `${c.categories?.slug ?? '?'}${c.price_from_ars ? ` · $${c.price_from_ars} ARS` : ''}`).join('\n');
  const barrioStr = barrios.map(b => b.barrios?.name_es ?? '').filter(Boolean).join(', ');
  const bio = p.bio?.slice(0, 200) ?? '—';

  const text = `<b>🧰 Модерация · 1 из ${providers.length}</b>\n\n` +
    `<b>${escapeHtml(name)}</b>\n` +
    `📂 ${escapeHtml(catStr)}\n` +
    `📍 ${escapeHtml(barrioStr)}\n` +
    `📅 ${new Date(p.created_at).toLocaleDateString('ru-RU')}\n\n` +
    `<i>${escapeHtml(bio)}</i>`;

  const kb: InlineKeyboard = [
    [{text: '✅ Одобрить', callback_data: `adm:approve:${p.id}`}, {text: '✏️ Нужны правки', callback_data: `adm:revision:${p.id}`}],
    [{text: '❌ Отклонить', callback_data: `adm:reject:${p.id}`}, {text: '⏭ Пропустить', callback_data: 'adm:mod_next'}],
    [{text: '← К списку', callback_data: 'adm:mod_list'}, {text: '← Панель', callback_data: 'adm:panel'}]
  ];

  if (messageId) await editAdminMessage(token, chatId, messageId, text, kb);
  else await sendAdminMessage(token, chatId, text, kb);
}

async function showModerationList(supabase: ReturnType<typeof createAdminClient>, token: string, chatId: number, messageId?: number) {
  const {data: providers} = await supabase
    .from('providers')
    .select('id,slug,profiles!providers_profile_id_fkey(display_name),created_at')
    .eq('status', 'pending')
    .order('created_at', {ascending: false})
    .limit(20);

  if (!providers?.length) {
    await editAdminMessage(token, chatId, messageId!, '✅ Все проверены.', [[{text: '← Панель', callback_data: 'adm:panel'}]]);
    return;
  }

  let text = `<b>🧰 Ожидают модерации (${providers.length})</b>\n\n`;
  const kb: InlineKeyboard = [];
  for (const p of providers) {
    const name = (p.profiles as unknown as {display_name?: string | null})?.display_name ?? p.slug;
    text += `· <b>${escapeHtml(name)}</b> — ${new Date(p.created_at).toLocaleDateString('ru-RU')}\n<code>${p.id}</code>\n`;
    kb.push([{text: `📋 ${escapeHtml(name).slice(0, 30)}`, callback_data: `adm:mod_show:${p.id}`}]);
  }
  kb.push([{text: '← Панель', callback_data: 'adm:panel'}]);

  if (messageId) await editAdminMessage(token, chatId, messageId, text, kb);
  else await sendAdminMessage(token, chatId, text, kb);
}

// ─── Reports ───────────────────────────────────────────────────────────────

async function showReports(supabase: ReturnType<typeof createAdminClient>, token: string, chatId: number, messageId?: number) {
  const {data: reports} = await supabase
    .from('reports')
    .select('id,reason,details,status,created_at,providers!reports_provider_id_fkey(slug)')
    .eq('status', 'open')
    .order('created_at', {ascending: false})
    .limit(10);

  if (!reports?.length) {
    const text = '✅ Нет открытых жалоб.';
    const kb: InlineKeyboard = [[{text: '← Панель', callback_data: 'adm:panel'}]];
    if (messageId) await editAdminMessage(token, chatId, messageId, text, kb);
    else await sendAdminMessage(token, chatId, text, kb);
    return;
  }

  const r = reports[0];
  const slug = (r.providers as unknown as {slug?: string})?.slug ?? '?';
  const text = `<b>🚩 Жалоба</b>\n\n` +
    `На: <b>${escapeHtml(slug)}</b>\n` +
    `Причина: <b>${escapeHtml(r.reason)}</b>\n` +
    `📅 ${new Date(r.created_at).toLocaleDateString('ru-RU')}\n\n` +
    `<i>${escapeHtml((r.details ?? '').slice(0, 500))}</i>`;

  const kb: InlineKeyboard = [
    [{text: '✅ Закрыть', callback_data: `adm:resolve_report:${r.id}`}, {text: '⛔ Приостановить', callback_data: `adm:suspend_report:${r.id}`}],
    [{text: '⏭ Следующая', callback_data: 'adm:report_next'}, {text: '← Панель', callback_data: 'adm:panel'}]
  ];

  if (messageId) await editAdminMessage(token, chatId, messageId, text, kb);
  else await sendAdminMessage(token, chatId, text, kb);
}

// ─── Support ───────────────────────────────────────────────────────────────

async function showSupport(supabase: ReturnType<typeof createAdminClient>, token: string, chatId: number, messageId?: number) {
  const {data: requests} = await supabase
    .from('support_requests')
    .select('id,details,status,created_at,profiles!support_requests_profile_id_fkey(display_name)')
    .eq('status', 'open')
    .order('created_at', {ascending: false})
    .limit(10);

  if (!requests?.length) {
    const text = '✅ Нет открытых обращений.';
    const kb: InlineKeyboard = [[{text: '← Панель', callback_data: 'adm:panel'}]];
    if (messageId) await editAdminMessage(token, chatId, messageId, text, kb);
    else await sendAdminMessage(token, chatId, text, kb);
    return;
  }

  const r = requests[0];
  const name = (r.profiles as unknown as {display_name?: string | null})?.display_name ?? '?';
  const text = `<b>💬 Обращение в поддержку</b>\n\n` +
    `От: <b>${escapeHtml(name)}</b>\n` +
    `📅 ${new Date(r.created_at).toLocaleDateString('ru-RU')}\n\n` +
    `<i>${escapeHtml((r.details ?? '').slice(0, 500))}</i>`;

  const kb: InlineKeyboard = [
    [{text: '🙋 Взять себе', callback_data: `adm:take_support:${r.id}`}, {text: '✅ Закрыть', callback_data: `adm:close_support:${r.id}`}],
    [{text: '💬 Ответить', callback_data: `adm:reply_support:${r.id}`}],
    [{text: '⏭ Следующее', callback_data: 'adm:support_next'}, {text: '← Панель', callback_data: 'adm:panel'}]
  ];

  if (messageId) await editAdminMessage(token, chatId, messageId, text, kb);
  else await sendAdminMessage(token, chatId, text, kb);
}

// ─── Lead operations ───────────────────────────────────────────────────────

async function showLeads(supabase: ReturnType<typeof createAdminClient>, token: string, chatId: number, messageId?: number) {
  const [staleLeads, recentLeads, outboxPending] = await Promise.all([
    supabase.from('leads').select('id,created_at,status,provider_id,categories!leads_category_id_fkey(slug)')
      .eq('status', 'contacted').lt('provider_contacted_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .order('created_at', {ascending: false}).limit(5),
    supabase.from('leads').select('id,created_at,status,categories!leads_category_id_fkey(slug),barrios!leads_barrio_id_fkey(name_es)')
      .order('created_at', {ascending: false}).limit(5),
    supabase.from('notification_outbox').select('id,notification_type,status,attempt_count,last_error')
      .eq('status', 'pending').order('created_at', {ascending: false}).limit(10)
  ]);

  let text = `<b>📋 Заявки и outbox</b>\n\n`;
  text += `⏰ Без ответа >24ч: <b>${staleLeads.data?.length ?? 0}</b>\n`;
  text += `📨 Outbox pending: <b>${outboxPending.data?.length ?? 0}</b>\n\n`;

  if (outboxPending.data?.length) {
    text += `<b>📨 Pending outbox:</b>\n`;
    for (const o of outboxPending.data) {
      text += `· ${o.notification_type} (${o.attempt_count} попыток)\n`;
    }
    text += '\n';
  }

  text += `<b>Последние заявки:</b>\n`;
  for (const l of recentLeads.data ?? []) {
    const cat = (l.categories as unknown as {slug?: string})?.slug ?? '?';
    const barrio = (l.barrios as unknown as {name_es?: string})?.name_es ?? '';
    text += `· ${cat}${barrio ? ` · ${barrio}` : ''} — ${l.status}\n`;
  }

  const kb: InlineKeyboard = [
    [{text: '🔄 Повторить outbox', callback_data: 'adm:retry_outbox'}, {text: '← Панель', callback_data: 'adm:panel'}]
  ];

  if (messageId) await editAdminMessage(token, chatId, messageId, text, kb);
  else await sendAdminMessage(token, chatId, text, kb);
}

// ─── Summary ───────────────────────────────────────────────────────────────

async function showSummary(supabase: ReturnType<typeof createAdminClient>, token: string, chatId: number, messageId?: number) {
  const s = await fetchAdminSummary(supabase);
  const text = `<b>📊 Сводка</b>\n\n` +
    `🧰 На модерации: <b>${s.pendingProviders}</b>\n` +
    `🚩 Открытые жалобы: <b>${s.openReports}</b>\n` +
    `💬 Открытые обращения: <b>${s.openSupport}</b>\n` +
    `📋 Заявки без ответа >24ч: <b>${s.staleLeads}</b>\n` +
    `📨 Outbox errors: <b>${s.outboxErrors}</b>`;
  const kb: InlineKeyboard = [[{text: '🔄 Обновить', callback_data: 'adm:summary'}, {text: '← Панель', callback_data: 'adm:panel'}]];
  if (messageId) await editAdminMessage(token, chatId, messageId, text, kb);
  else await sendAdminMessage(token, chatId, text, kb);
}

// ─── Operational alerts ─────────────────────────────────────────────────────

async function showOperationalAlerts(supabase: ReturnType<typeof createAdminClient>, token: string, chatId: number, messageId?: number) {
  const [pendingProviders, openReports, openSupport, failedOutbox, staleLeads] = await Promise.all([
    supabase.from('providers').select('id,slug,created_at').eq('status', 'pending').order('created_at', {ascending: false}).limit(5),
    supabase.from('reports').select('id,reason,created_at').eq('status', 'open').order('created_at', {ascending: false}).limit(5),
    supabase.from('support_requests').select('id,details,created_at').eq('status', 'open').order('created_at', {ascending: false}).limit(5),
    supabase.from('notification_outbox').select('id,notification_type,last_error').eq('status', 'permanently_failed').order('created_at', {ascending: false}).limit(5),
    supabase.from('leads').select('id,created_at,status').eq('status', 'contacted').lt('provider_contacted_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString()).order('created_at', {ascending: false}).limit(5)
  ]);

  let text = `<b>🚨 Операционные алерты</b>\n\n`;

  text += `🧰 На модерации: <b>${pendingProviders.data?.length ?? 0}</b>\n`;
  for (const p of pendingProviders.data ?? []) text += `· ${escapeHtml(p.slug)} (${new Date(p.created_at).toLocaleDateString('ru-RU')})\n`;
  text += '\n';

  text += `🚩 Открытые жалобы: <b>${openReports.data?.length ?? 0}</b>\n`;
  for (const r of openReports.data ?? []) text += `· ${escapeHtml(r.reason)}\n`;
  text += '\n';

  text += `💬 Открытые обращения: <b>${openSupport.data?.length ?? 0}</b>\n`;
  for (const s of openSupport.data ?? []) text += `· ${escapeHtml((s.details ?? '').slice(0, 40))}\n`;
  text += '\n';

  text += `📨 Outbox permanently failed: <b>${failedOutbox.data?.length ?? 0}</b>\n`;
  for (const o of failedOutbox.data ?? []) text += `· ${escapeHtml(o.notification_type)} — ${escapeHtml(o.last_error ?? '')}\n`;
  text += '\n';

  text += `⏰ Заявки без ответа >24ч: <b>${staleLeads.data?.length ?? 0}</b>\n`;
  for (const l of staleLeads.data ?? []) text += `· ${escapeHtml(l.status)} (${new Date(l.created_at).toLocaleDateString('ru-RU')})\n`;

  const kb: InlineKeyboard = [
    [{text: '🧰 Модерация', callback_data: 'adm:moderation'}, {text: '🚩 Жалобы', callback_data: 'adm:reports'}],
    [{text: '💬 Поддержка', callback_data: 'adm:support'}, {text: '📋 Заявки', callback_data: 'adm:leads'}],
    [{text: '🔄 Обновить', callback_data: 'adm:alerts'}, {text: '← Панель', callback_data: 'adm:panel'}]
  ];

  if (messageId) await editAdminMessage(token, chatId, messageId, text, kb);
  else await sendAdminMessage(token, chatId, text, kb);
}

// ─── Action handlers ───────────────────────────────────────────────────────

async function handleCallback(
  supabase: ReturnType<typeof createAdminClient>,
  admin: AdminIdentity,
  token: string,
  chatId: number,
  messageId: number,
  callbackId: string,
  data: string
) {
  const parts = data.split(':');
  const action = parts[1];

  try {
    // RBAC guard: map callback action to required action type before any mutation.
    const rbacGuard = (required: string): boolean => {
      if (!isActionAllowed(admin.role, required)) {
        void editAdminMessage(token, chatId, messageId, '⛔ Недостаточно прав для этого действия.', [[{text: '← Панель', callback_data: 'adm:panel'}]]);
        return false;
      }
      return true;
    };

    switch (action) {
      case 'panel': {
        const text = await buildPanelMessage(supabase);
        await editAdminMessage(token, chatId, messageId, text, panelKeyboard());
        break;
      }
      case 'moderation': {
        await setAdminPanelState(supabase, admin.profileId, 'moderation');
        await showModerationQueue(supabase, token, chatId, messageId);
        break;
      }
      case 'mod_show': {
        // Show a specific provider in the queue
        const providerId = parts.slice(2).join(':');
        await showModerationQueue(supabase, token, chatId, messageId);
        break;
      }
      case 'mod_next': {
        await showModerationQueue(supabase, token, chatId, messageId);
        break;
      }
      case 'mod_list': {
        await showModerationList(supabase, token, chatId, messageId);
        break;
      }
      case 'approve': {
        if (!rbacGuard('approve_provider')) break;
        const providerId = parts.slice(2).join(':');
        const actionToken = await issueActionToken(supabase, admin.profileId, 'approve_provider', 'provider', providerId);
        const text = `Подтвердить одобрение?\n\n<b>${providerId.slice(0, 8)}...</b>\n\nЭто действие нельзя отменить.`;
        const kb: InlineKeyboard = [
          [{text: '✅ Да, одобрить', callback_data: `adm:confirm:${actionToken}`}],
          [{text: 'Отмена', callback_data: 'adm:moderation'}]
        ];
        await editAdminMessage(token, chatId, messageId, text, kb);
        break;
      }
      case 'reject': {
        if (!rbacGuard('reject_provider')) break;
        const providerId = parts.slice(2).join(':');
        const actionToken = await issueActionToken(supabase, admin.profileId, 'reject_provider', 'provider', providerId);
        const text = `Подтвердить отклонение?\n\n<b>${providerId.slice(0, 8)}...</b>`;
        const kb: InlineKeyboard = [
          [{text: '❌ Да, отклонить', callback_data: `adm:confirm:${actionToken}`}],
          [{text: 'Отмена', callback_data: 'adm:moderation'}]
        ];
        await editAdminMessage(token, chatId, messageId, text, kb);
        break;
      }
      case 'revision': {
        if (!rbacGuard('request_revision')) break;
        const providerId = parts.slice(2).join(':');
        const actionToken = await issueActionToken(supabase, admin.profileId, 'request_revision', 'provider', providerId);
        const text = `Отправить на доработку?\n\n<b>${providerId.slice(0, 8)}...</b>\n\nИсполнитель получит уведомление с просьбой исправить профиль.`;
        const kb: InlineKeyboard = [
          [{text: '✏️ Отправить на доработку', callback_data: `adm:confirm:${actionToken}`}],
          [{text: 'Отмена', callback_data: 'adm:moderation'}]
        ];
        await editAdminMessage(token, chatId, messageId, text, kb);
        break;
      }
      case 'confirm': {
        const actionToken = parts.slice(2).join(':');
        const result = await consumeActionToken(supabase, actionToken, admin.profileId);
        if (!result) {
          await editAdminMessage(token, chatId, messageId, '⛔ Действие недоступно (токен истёк, использован или недействителен).', [[{text: '← Панель', callback_data: 'adm:panel'}]]);
          break;
        }

        switch (result.actionType) {
          case 'approve_provider': {
            const {error: rpcError} = await supabase.rpc('moderate_provider', {p_actor_profile_id: admin.profileId, p_provider_id: result.entityId, p_decision: 'approved', p_reason: null});
            if (rpcError) {
              await editAdminMessage(token, chatId, messageId, `❌ Ошибка: ${rpcError.message}`, [[{text: '← Панель', callback_data: 'adm:panel'}]]);
            } else {
              await editAdminMessage(token, chatId, messageId, `✅ Исполнитель ${result.entityId.slice(0, 8)}... одобрен.`, [[{text: '🧰 Следующий', callback_data: 'adm:moderation'}, {text: '← Панель', callback_data: 'adm:panel'}]]);
            }
            break;
          }
          case 'reject_provider': {
            const {error: rpcError} = await supabase.rpc('moderate_provider', {p_actor_profile_id: admin.profileId, p_provider_id: result.entityId, p_decision: 'rejected', p_reason: 'Отклонено администратором'});
            if (rpcError) {
              await editAdminMessage(token, chatId, messageId, `❌ Ошибка: ${rpcError.message}`, [[{text: '← Панель', callback_data: 'adm:panel'}]]);
            } else {
              await editAdminMessage(token, chatId, messageId, `❌ Исполнитель ${result.entityId.slice(0, 8)}... отклонён.`, [[{text: '🧰 Следующий', callback_data: 'adm:moderation'}, {text: '← Панель', callback_data: 'adm:panel'}]]);
            }
            break;
          }
          case 'request_revision': {
            const {error: rpcError} = await supabase.rpc('moderate_provider', {p_actor_profile_id: admin.profileId, p_provider_id: result.entityId, p_decision: 'rejected', p_reason: 'Требуются исправления. Пожалуйста, обновите профиль.'});
            if (rpcError) {
              await editAdminMessage(token, chatId, messageId, `❌ Ошибка: ${rpcError.message}`, [[{text: '← Панель', callback_data: 'adm:panel'}]]);
            } else {
              await editAdminMessage(token, chatId, messageId, `✏️ Исполнитель ${result.entityId.slice(0, 8)}... отправлен на доработку.`, [[{text: '🧰 Следующий', callback_data: 'adm:moderation'}, {text: '← Панель', callback_data: 'adm:panel'}]]);
            }
            break;
          }
          default:
            await editAdminMessage(token, chatId, messageId, '⛔ Неизвестное действие.', [[{text: '← Панель', callback_data: 'adm:panel'}]]);
        }
        break;
      }
      case 'reports': {
        await setAdminPanelState(supabase, admin.profileId, 'reports');
        await showReports(supabase, token, chatId, messageId);
        break;
      }
      case 'resolve_report': {
        if (!rbacGuard('resolve_report')) break;
        const reportId = parts.slice(2).join(':');
        const {error: resolveError} = await supabase.rpc('admin_resolve_report', {p_actor_profile_id: admin.profileId, p_report_id: reportId});
        if (resolveError) {
          await editAdminMessage(token, chatId, messageId, `❌ Ошибка при закрытии жалобы.`, [[{text: '← Панель', callback_data: 'adm:panel'}]]);
        } else {
          await editAdminMessage(token, chatId, messageId, '✅ Жалоба закрыта.', [[{text: '🚩 Следующая', callback_data: 'adm:reports'}, {text: '← Панель', callback_data: 'adm:panel'}]]);
        }
        break;
      }
      case 'suspend_report': {
        if (!rbacGuard('suspend_provider')) break;
        const reportId = parts.slice(2).join(':');
        const {data: report} = await supabase.from('reports').select('provider_id').eq('id', reportId).single();
        if (report?.provider_id) {
          const {error: suspendError} = await supabase.rpc('admin_suspend_provider', {p_actor_profile_id: admin.profileId, p_provider_id: report.provider_id, p_reason: 'Приостановлен по жалобе'});
          if (suspendError) {
            await editAdminMessage(token, chatId, messageId, `❌ Не удалось приостановить исполнителя.`, [[{text: '← Панель', callback_data: 'adm:panel'}]]);
          } else {
            await supabase.rpc('admin_resolve_report', {p_actor_profile_id: admin.profileId, p_report_id: reportId});
            await editAdminMessage(token, chatId, messageId, '⛔ Исполнитель приостановлен. Жалоба закрыта.', [[{text: '🚩 Следующая', callback_data: 'adm:reports'}, {text: '← Панель', callback_data: 'adm:panel'}]]);
          }
        }
        break;
      }
      case 'report_next': {
        await showReports(supabase, token, chatId, messageId);
        break;
      }
      case 'support': {
        await setAdminPanelState(supabase, admin.profileId, 'support');
        await showSupport(supabase, token, chatId, messageId);
        break;
      }
      case 'take_support': {
        if (!rbacGuard('take_support')) break;
        const requestId = parts.slice(2).join(':');
        const {error: takeError} = await supabase.rpc('admin_take_support_request', {p_actor_profile_id: admin.profileId, p_request_id: requestId});
        if (takeError) {
          await editAdminMessage(token, chatId, messageId, '❌ Не удалось взять обращение.', [[{text: '← Панель', callback_data: 'adm:panel'}]]);
        } else {
          await editAdminMessage(token, chatId, messageId, '🙋 Обращение взято в работу.', [[{text: '💬 Следующее', callback_data: 'adm:support'}, {text: '← Панель', callback_data: 'adm:panel'}]]);
        }
        break;
      }
      case 'close_support': {
        if (!rbacGuard('close_support')) break;
        const requestId = parts.slice(2).join(':');
        const {error: closeError} = await supabase.rpc('admin_resolve_support_request', {p_actor_profile_id: admin.profileId, p_request_id: requestId});
        if (closeError) {
          await editAdminMessage(token, chatId, messageId, '❌ Не удалось закрыть обращение.', [[{text: '← Панель', callback_data: 'adm:panel'}]]);
        } else {
          await editAdminMessage(token, chatId, messageId, '✅ Обращение закрыто.', [[{text: '💬 Следующее', callback_data: 'adm:support'}, {text: '← Панель', callback_data: 'adm:panel'}]]);
        }
        break;
      }
      case 'reply_support': {
        if (!rbacGuard('reply_support')) break;
        const requestId = parts.slice(2).join(':');
        // Persist the pending reply target so the next plain-text message is treated as the reply body.
        await setAdminPanelState(supabase, admin.profileId, 'support_reply', {requestId});
        await editAdminMessage(token, chatId, messageId, '✍️ Напишите текст ответа клиенту. Отмена: /cancel', [[{text: '← Панель', callback_data: 'adm:panel'}]]);
        break;
      }
      case 'support_next': {
        await showSupport(supabase, token, chatId, messageId);
        break;
      }
      case 'leads': {
        if (!rbacGuard('lead_operations')) break;
        await setAdminPanelState(supabase, admin.profileId, 'leads');
        await showLeads(supabase, token, chatId, messageId);
        break;
      }
      case 'retry_outbox': {
        if (!rbacGuard('retry_outbox')) break;
        const {data: retryCount, error: retryError} = await supabase.rpc('admin_retry_notification_outbox', {p_actor_profile_id: admin.profileId});
        if (retryError) {
          await editAdminMessage(token, chatId, messageId, '❌ Не удалось повторить outbox.', [[{text: '← Панель', callback_data: 'adm:panel'}]]);
        } else {
          await editAdminMessage(token, chatId, messageId, `🔄 ${retryCount ?? 0} задач возвращены в очередь.`, [[{text: '📋 Заявки', callback_data: 'adm:leads'}, {text: '← Панель', callback_data: 'adm:panel'}]]);
        }
        break;
      }
      case 'summary': {
        await showSummary(supabase, token, chatId, messageId);
        break;
      }
      case 'alerts': {
        await showOperationalAlerts(supabase, token, chatId, messageId);
        break;
      }
      default:
        await answerCallbackQuery(token, callbackId, 'Неизвестная команда');
    }
  } catch (_error) {
    // Never expose internal details to admin or HTTP response
    await editAdminMessage(token, chatId, messageId, '❌ Не удалось выполнить действие. Попробуйте позже.', [[{text: '← Панель', callback_data: 'adm:panel'}]]);
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const env = getServerEnv();
    const adminToken = env.TELEGRAM_ADMIN_BOT_TOKEN;
    const secret = env.TELEGRAM_ADMIN_WEBHOOK_SECRET;
    if (!adminToken || !secret) return NextResponse.json({error: 'Admin bot not configured'}, {status: 503});
    if (!secretsMatch(request.headers.get('x-telegram-bot-api-secret-token'), secret)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

    let update: AdminUpdate;
    try { update = await request.json() as AdminUpdate; } catch { return NextResponse.json({error: 'Invalid JSON'}, {status: 400}); }

    const callback = update.callback_query;
    const message = update.message ?? callback?.message;
    // For callback queries, the real user is callback.from, not message.from (which is the bot).
    const user = callback?.from ?? message?.from;
    const chatId = callback?.message?.chat?.id ?? message?.chat?.id;
    if (!user || !chatId) return NextResponse.json({ok: true});

    const supabase = createAdminClient();

    // Idempotency
    const {data: existing} = await supabase.from('admin_telegram_updates').select('processed_at').eq('update_id', update.update_id).maybeSingle();
    if (existing?.processed_at) return NextResponse.json({ok: true, duplicate: true});
    if (!existing) {
      const {error: insertError} = await supabase.from('admin_telegram_updates').insert({update_id: update.update_id});
      if (insertError?.code === '23505') return NextResponse.json({ok: true, duplicate: true});
      if (insertError) return NextResponse.json({error: 'Temporary error'}, {status: 500});
    }

    const markProcessed = () => supabase.from('admin_telegram_updates').update({processed_at: new Date().toISOString()}).eq('update_id', update.update_id);
    const admin = await requireAdminRole(supabase, user.id);
    if (!admin) {
      await sendAdminMessage(adminToken, chatId, '⛔ Доступ запрещён. Вы не зарегистрированы как администратор.');
      await markProcessed();
      return NextResponse.json({ok: true});
    }

    if (callback?.data) {
      await handleCallback(supabase, admin, adminToken, chatId, callback.message?.message_id ?? 0, callback.id, callback.data);
      await answerCallbackQuery(adminToken, callback.id);
      await markProcessed();
      return NextResponse.json({ok: true});
    }

    // Text commands — only reachable when there's no callback (handled above)
    if (!message) { await markProcessed(); return NextResponse.json({ok: true}); }
    const text = message.text?.trim() ?? '';
    const parts = text.split(/\s+/);
    const cmd = parts[0]?.toLowerCase() ?? '';

    // Pending support reply: the next plain-text message is the reply body.
    if (cmd !== '/cancel' && !cmd.startsWith('/')) {
      const {data: panelState} = await supabase.from('admin_panel_states').select('current_view,context').eq('profile_id', admin.profileId).maybeSingle();
      if (panelState?.current_view === 'support_reply') {
        const requestId = (panelState.context as {requestId?: string} | null)?.requestId;
        if (requestId) {
          if (!isActionAllowed(admin.role, 'reply_support')) {
            await sendAdminMessage(adminToken, chatId, '⛔ Недостаточно прав.');
          } else {
            const externalId = `admin_reply:${admin.profileId}:${requestId}:${update.update_id}`;
            const {data: replyResult, error: replyError} = await supabase.rpc('admin_reply_support_request', {
              p_actor_profile_id: admin.profileId,
              p_request_id: requestId,
              p_body: text,
              p_external_source: 'admin_bot',
              p_external_id: externalId
            });
            if (replyError) {
              await sendAdminMessage(adminToken, chatId, '❌ Не удалось отправить ответ.');
            } else {
              // Deliver immediately through the public bot (the outbox task remains as
              // a durable retry fallback if this synchronous send fails).
              const {data: customer} = await supabase
                .from('support_requests')
                .select('profiles!support_requests_profile_id_fkey(telegram_user_id)')
                .eq('id', requestId)
                .single();
              const customerTgId = (customer?.profiles as unknown as {telegram_user_id?: number | null} | null)?.telegram_user_id;
              if (customerTgId) {
                const replyText = `💬 Respuesta del soporte de BuenServ:\n\n${text}`;
                const sendRes = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                  method: 'POST', headers: {'content-type': 'application/json'},
                  body: JSON.stringify({chat_id: customerTgId, text: replyText})
                });
                const sendBody = await sendRes.json().catch(() => null);
                if (sendRes.ok && sendBody?.ok) {
                  // Mark the matching outbox task as sent so the scheduler won't resend.
                  await supabase
                    .from('notification_outbox')
                    .update({status: 'sent', sent_at: new Date().toISOString(), telegram_message_id: sendBody.result?.message_id ?? null, locked_at: null, last_error: null, updated_at: new Date().toISOString()})
                    .eq('notification_type', 'customer_support_reply')
                    .eq('status', 'pending');
                }
              }
              await setAdminPanelState(supabase, admin.profileId, 'support');
              await sendAdminMessage(adminToken, chatId, '✅ Ответ отправлен клиенту.');
            }
          }
          await markProcessed();
          return NextResponse.json({ok: true});
        }
      }
    }

    switch (cmd) {
      case '/start': case '/help': case '/panel': {
        const panelText = await buildPanelMessage(supabase);
        await sendAdminMessage(adminToken, chatId, panelText, panelKeyboard());
        break;
      }
      case '/pending': {
        await showModerationQueue(supabase, adminToken, chatId);
        break;
      }
      case '/approve': case '/reject': {
        const providerId = parts[1];
        const rejecting = cmd === '/reject';
        const requiredAction = rejecting ? 'reject_provider' : 'approve_provider';
        if (!isActionAllowed(admin.role, requiredAction)) {
          await sendAdminMessage(adminToken, chatId, '⛔ Недостаточно прав.');
          break;
        }
        const reason = parts.slice(2).join(' ');
        if (!providerId || (rejecting && !reason)) {
          await sendAdminMessage(adminToken, chatId, rejecting ? 'Usage: /reject <provider-id> <reason>' : 'Usage: /approve <provider-id>');
          break;
        }
        const {error} = await supabase.rpc('moderate_provider', {
          p_actor_profile_id: admin.profileId,
          p_provider_id: providerId,
          p_decision: rejecting ? 'rejected' : 'approved',
          p_reason: rejecting ? reason : null
        });
        await sendAdminMessage(adminToken, chatId, error ? `❌ Error: ${escapeHtml(error.message)}` : rejecting ? `❌ Provider ${providerId.slice(0, 8)}... rejected.` : `✅ Provider ${providerId.slice(0, 8)}... approved.`);
        break;
      }
      case '/reports': {
        if (!isActionAllowed(admin.role, 'resolve_report')) { await sendAdminMessage(adminToken, chatId, '⛔ Недостаточно прав.'); break; }
        await showReports(supabase, adminToken, chatId);
        break;
      }
      case '/support': {
        if (!isActionAllowed(admin.role, 'take_support')) { await sendAdminMessage(adminToken, chatId, '⛔ Недостаточно прав.'); break; }
        await showSupport(supabase, adminToken, chatId);
        break;
      }
      case '/leads': {
        if (!isActionAllowed(admin.role, 'lead_operations')) { await sendAdminMessage(adminToken, chatId, '⛔ Недостаточно прав.'); break; }
        await showLeads(supabase, adminToken, chatId);
        break;
      }
      case '/summary': {
        await showSummary(supabase, adminToken, chatId);
        break;
      }
      case '/alerts': {
        await showOperationalAlerts(supabase, adminToken, chatId);
        break;
      }
      case '/cancel': {
        await setAdminPanelState(supabase, admin.profileId, 'panel');
        await sendAdminMessage(adminToken, chatId, 'Отменено.');
        break;
      }
      default:
        await sendAdminMessage(adminToken, chatId, 'Неизвестная команда. Используйте /panel для панели управления.');
    }

    await markProcessed();
    return NextResponse.json({ok: true});
  } catch (_error) {
    // Never expose internal RPC/schema details to the caller
    return NextResponse.json({error: 'Temporary error'}, {status: 500});
  }
}
