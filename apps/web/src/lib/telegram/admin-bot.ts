import {randomBytes} from 'node:crypto';
import type {ServerEnv} from '@/lib/env';
import type {SupabaseClient} from '@supabase/supabase-js';

export type AdminRole = 'admin' | 'moderator' | 'support';

export type InlineButton = {text: string; callback_data?: string; url?: string};
export type InlineKeyboard = InlineButton[][];

export type AdminIdentity = {profileId: string; role: AdminRole};

/** Send a message with optional inline keyboard. */
export async function sendAdminMessage(token: string, chatId: number, text: string, keyboard?: InlineKeyboard) {
  const body: Record<string, unknown> = {chat_id: chatId, text, parse_mode: 'HTML'};
  if (keyboard) body.reply_markup = {inline_keyboard: keyboard};
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Telegram admin send failed: ${response.status}`);
}

/** Edit an existing message's text and keyboard. */
export async function editAdminMessage(token: string, chatId: number, messageId: number, text: string, keyboard?: InlineKeyboard) {
  const body: Record<string, unknown> = {chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML'};
  if (keyboard) body.reply_markup = {inline_keyboard: keyboard};
  const response = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)
  });
  // "message is not modified" is expected on duplicate taps — ignore it
  if (!response.ok && !(await response.clone().json()).description?.includes('not modified')) {
    throw new Error(`Telegram admin edit failed: ${response.status}`);
  }
}

/** Answer a callback query to dismiss the loading spinner. */
export async function answerCallbackQuery(token: string, callbackQueryId: string, text?: string) {
  const body: Record<string, unknown> = {callback_query_id: callbackQueryId};
  if (text) body.text = text;
  const response = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Telegram answerCallbackQuery failed: ${response.status}`);
}

/** Resolve the actor from profiles.telegram_user_id. Never trust the client. */
export async function requireAdminRole(
  supabase: SupabaseClient,
  telegramId: number
): Promise<AdminIdentity | null> {
  const {data: profile} = await supabase
    .from('profiles')
    .select('id,role')
    .eq('telegram_user_id', telegramId)
    .maybeSingle();
  if (!profile) return null;
  const role = profile.role;
  if (!['admin', 'moderator', 'support'].includes(role)) return null;
  return {profileId: profile.id, role: role as AdminRole};
}

/** Persist the current panel view for an admin. */
export async function setAdminPanelState(
  supabase: SupabaseClient,
  profileId: string,
  currentView: string,
  context: Record<string, unknown> = {}
) {
  await supabase.from('admin_panel_states').upsert({
    profile_id: profileId, current_view: currentView, context, updated_at: new Date().toISOString()
  }, {onConflict: 'profile_id'});
}

/** Issue a server-side expiring action token for an inline action. */
export async function issueActionToken(
  supabase: SupabaseClient,
  profileId: string,
  actionType: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown> = {},
  ttlSeconds = 600
): Promise<string> {
  const token = randomBytes(16).toString('base64url');
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const {error} = await supabase.from('admin_action_tokens').insert({
    token, action_type: actionType, entity_type: entityType, entity_id: entityId,
    issued_for_profile_id: profileId, expires_at: expiresAt, payload
  });
  if (error) throw error;
  return token;
}

/** Consume and validate an action token. Returns null if invalid/expired/consumed. */
export async function consumeActionToken(
  supabase: SupabaseClient,
  token: string,
  profileId: string,
  expectedAction?: string
): Promise<{actionType: string; entityType: string; entityId: string; payload: Record<string, unknown>} | null> {
  const {data: row} = await supabase
    .from('admin_action_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (!row) return null;
  if (row.consumed_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  if (row.issued_for_profile_id !== profileId) return null;
  if (expectedAction && row.action_type !== expectedAction) return null;

  const {error: consumeError} = await supabase
    .from('admin_action_tokens')
    .update({consumed_at: new Date().toISOString()})
    .eq('token', token);
  if (consumeError) throw consumeError;

  return {
    actionType: row.action_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    payload: (row.payload ?? {}) as Record<string, unknown>
  };
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}

export type AdminEnv = Pick<ServerEnv, 'TELEGRAM_ADMIN_BOT_TOKEN' | 'TELEGRAM_ADMIN_WEBHOOK_SECRET'>;

/** Operational summary counts for the panel home. */
export async function fetchAdminSummary(supabase: SupabaseClient) {
  const [{count: pendingProviders}, {count: openReports}, {count: openSupport}, {count: outboxErrors}, {count: staleLeads}] = await Promise.all([
    supabase.from('providers').select('*', {count: 'exact', head: true}).eq('status', 'pending'),
    supabase.from('reports').select('*', {count: 'exact', head: true}).eq('status', 'open'),
    supabase.from('support_requests').select('*', {count: 'exact', head: true}).eq('status', 'open'),
    supabase.from('notification_outbox').select('*', {count: 'exact', head: true}).eq('status', 'permanently_failed'),
    supabase.from('leads').select('*', {count: 'exact', head: true}).eq('status', 'contacted').lt('provider_contacted_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
  ]);
  return {
    pendingProviders: pendingProviders ?? 0,
    openReports: openReports ?? 0,
    openSupport: openSupport ?? 0,
    outboxErrors: outboxErrors ?? 0,
    staleLeads: staleLeads ?? 0
  };
}