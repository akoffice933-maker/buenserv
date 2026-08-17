'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {useMiniApp} from '@/context/MiniAppContext';
import {MiniAppShell} from '@/components/mini-app/MiniAppShell';
import {PrimaryButton, SecondaryButton} from '@/components/mini-app/Buttons';
import {LoadingState, ErrorState} from '@/components/mini-app/FeedbackStates';
import {formatDateTime, formatTime} from '@/lib/format';
import {getTelegramInitData} from '@/lib/telegram-client';
import {CATEGORY_LABELS, CategorySlug} from '@/lib/categories';

type Lang = 'es' | 'ru' | 'en';

type LeadDetail = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  category: string | null;
  barrio: {
    name_es: string;
    name_ru: string;
    name_en: string;
  } | null;
  provider: {
    id: string;
    slug: string;
    status: string;
    profile: {
      display_name: string;
    }
  } | null;
  events: Array<{
    event_type: string;
    actor_type: string;
    created_at: string;
    metadata: Record<string, unknown>;
  }>;
  messages: Array<{
    id: string;
    body: string;
    senderRole: string;
    senderDisplayName: string | null;
    createdAt: string;
  }>;
  lastEventType: string | null;
  allowedActions: string[];
  isCustomer: boolean;
  isProvider: boolean;
};

function localizedBarrio(barrios: {name_es: string; name_ru: string; name_en: string} | null, lang: Lang): string {
  if (!barrios) return 'Buenos Aires';
  if (lang === 'ru' && barrios.name_ru) return barrios.name_ru;
  if (lang === 'en' && barrios.name_en) return barrios.name_en;
  return barrios.name_es;
}

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams<{'lead-id': string}>();
  const leadId = params['lead-id'];
  const {t: tr, locale} = useMiniApp();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<Lang>('es');
  const [loading, setLoading] = useState<boolean>(true);
  const [messageBody, setMessageBody] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  function submitAction(action: 'provider_opened' | 'provider_replied' | 'customer_replied' | 'provider_service_completed' | 'customer_completion_confirmed' | 'cancelled') {
    const initData = getTelegramInitData();
    if (!initData) {
      setError(tr('ld_no_session'));
      return;
    }
    fetch(`/api/mini-app/leads/${leadId}/action`, {
      method: 'POST',
      headers: {'content-type': 'application/json', 'x-telegram-init-data': initData},
      body: JSON.stringify({action, idempotencyKey: crypto.randomUUID()})
    })
    .then(async (response) => {
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 401) throw new Error(tr('ld_session_expired'));
        throw new Error(body.error ?? tr('ld_load_error'));
      }
      fetchLeadData();
    })
    .catch((reason) => setError(reason instanceof Error ? reason.message : tr('ld_load_error')));
  }

  async function submitMessage() {
    const text = messageBody.trim();
    if (!text) return;
    const initData = getTelegramInitData();
    if (!initData) {
      setError(tr('ld_no_session'));
      return;
    }
    try {
      setSendingMessage(true);
      const response = await fetch(`/api/mini-app/leads/${leadId}/message`, {
        method: 'POST',
        headers: {'content-type': 'application/json', 'x-telegram-init-data': initData},
        body: JSON.stringify({body: text, idempotencyKey: crypto.randomUUID()})
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 401) throw new Error(tr('ld_session_expired'));
        throw new Error(body.error ?? tr('ld_load_error'));
      }
      setMessageBody('');
      await fetchLeadData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : tr('ld_load_error'));
    } finally {
      setSendingMessage(false);
    }
  }

  const fetchLeadData = useCallback(async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      setError('');
      const initData = getTelegramInitData();
      if (!initData) {
        setError(tr('ld_no_session'));
        return;
      }
      const response = await fetch(`/api/mini-app/leads/${leadId}`, {headers: {'x-telegram-init-data': initData}});
      if (!response.ok) {
        const body = await response.json();
        if (response.status === 401) throw new Error(tr('ld_session_expired'));
        throw new Error(body.error ?? tr('ld_load_error'));
      }
      const leadData = await response.json();
      setLead(leadData.lead);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('ld_load_error'));
    } finally {
      setLoading(false);
    }
  }, [leadId, tr]);

  useEffect(() => {
    try {
      const w = window as unknown as {Telegram?: {WebApp?: {expand?: () => void}}};
      w.Telegram?.WebApp?.expand?.();
    } catch { /* ignore */ }
    fetchLeadData();
    try {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const langFromHash = hash.get('lang') as Lang;
      if (langFromHash && ['es', 'ru', 'en'].includes(langFromHash)) {
        setLang(langFromHash);
      }
    } catch { /* ignore */ }
    try {
      const w = window as unknown as {Telegram?: {WebApp?: {initData?: string}}};
      const initData = w.Telegram?.WebApp?.initData ?? '';
      if (initData) {
        fetch('/api/mini-app/profile', {headers: {'x-telegram-init-data': initData}})
          .then((r) => r.json())
          .then((body) => {
            const loc = body?.profile?.locale;
            if (loc === 'ru' || loc === 'en') setLang(loc);
          })
          .catch(() => { /* keep default */ });
      }
    } catch { /* ignore */ }
  }, [leadId, fetchLeadData]);

  if (error) {
    return (
      <MiniAppShell showBack backHref="/mini-app" showBottomNav={false}>
        <ErrorState message={error} onRetry={() => router.push('/mini-app')} />
      </MiniAppShell>
    );
  }

  if (loading || !lead) {
    return <MiniAppShell showBack backHref="/mini-app" showBottomNav={false}><LoadingState /></MiniAppShell>;
  }

  const t = {
    noSession: tr('ld_no_session'), sessionExpired: tr('ld_session_expired'), loadError: tr('ld_load_error'),
    loading: tr('loading'), messagesTitle: tr('ld_messages'), messagePlaceholder: tr('ld_placeholder'),
    sendMessage: tr('ld_send'), sendingMessage: tr('ld_sending'), noMessages: tr('ld_no_messages'), you: tr('ld_you'),
    actionProviderOpened: tr('ld_action_opened'), actionProviderReplied: tr('ld_action_replied'),
    actionCustomerReplied: tr('ld_action_customer_replied'), actionProviderServiceCompleted: tr('ld_action_completed'),
    actionCustomerCompletionConfirmed: tr('ld_action_confirmed'), actionCancelled: tr('ld_action_cancelled'),
    greeting: tr('greeting_default'), becomeProvider: tr('top_offer_btn'), providerProfile: tr('provider_status_card_title'),
    incomingRequests: tr('ld_incoming'), myRequests: tr('ld_my'), empty: tr('ld_empty'),
    openRequest: tr('ld_action_opened'), cancelRequest: tr('action_cancel_lead'),
    providerStatus: {
      draft: tr('status_draft'), pending: tr('status_pending_moderation'), approved: tr('status_approved'),
      rejected: tr('status_needs_changes'), suspended: tr('status_suspended')
    } as Record<string, string>,
    leadStatus: {
      created: tr('ld_status_created'), contacted: tr('ld_status_contacted'), provider_replied: tr('ld_status_replied'),
      success: tr('ld_status_success'), no_response: tr('ld_status_no_response'), cancelled: tr('ld_status_cancelled')
    } as Record<string, string>
  };
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({behavior: 'smooth', block: 'end'});
  }, []);

  const catMeta = CATEGORY_LABELS[(lead.category ?? '') as CategorySlug];
  const catName = catMeta ? (lang === 'ru' ? catMeta.ru : lang === 'en' ? catMeta.en : catMeta.es) : (lead.category ?? 'Servicio');
  const barrioName = localizedBarrio(lead.barrio, lang);
  const providerName = lead.provider ? lead.provider.profile.display_name : null;
  const providerStatusText = lead.provider ? t.providerStatus[lead.provider.status] ?? lead.provider.status : null;
  const leadStatusText = t.leadStatus[lead.status] ?? lead.status;
  // Composer is enabled only when the lifecycle RPC would accept a message:
  // provider may reply from provider_notified / provider_opened / customer_replied;
  // customer may reply only after provider_replied.
  const lastEvent = lead.lastEventType ?? '';
  const canCompose =
    (lead.isProvider && ['provider_notified', 'provider_opened', 'customer_replied'].includes(lastEvent)) ||
    (lead.isCustomer && lastEvent === 'provider_replied');

  const eventLabel = (event: {event_type: string; actor_type: string}) => {
    if (event.event_type === 'provider_opened') return tr('ld_event_opened');
    if (event.event_type === 'provider_replied') return tr('ld_event_replied');
    if (event.event_type === 'customer_replied') return tr('ld_action_customer_replied');
    if (event.event_type === 'cancelled') return tr('ld_event_cancelled');
    if (event.event_type === 'provider_service_completed') return tr('ld_event_completed');
    if (event.event_type === 'customer_completion_confirmed') return tr('ld_event_confirmed');
    return event.event_type;
  };

  // Merged chronological timeline: system events + messages interleaved by time.
  const timeline: Array<{key: string; createdAt: string; kind: 'event' | 'message'; event?: (typeof lead.events)[number]; message?: (typeof lead.messages)[number]}> = [
    ...lead.events.map((e) => ({key: `e-${e.created_at}-${e.event_type}`, createdAt: e.created_at, kind: 'event' as const, event: e})),
    ...lead.messages.map((m) => ({key: `m-${m.id}`, createdAt: m.createdAt, kind: 'message' as const, message: m}))
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Auto-scroll to the latest message after a send / new data.
  useEffect(() => {
    scrollToBottom();
  }, [lead?.messages.length, scrollToBottom]);

  // Chat peer: the other party in the conversation.
  const peerName = lead.isProvider ? tr('ld_peer_customer') : (providerName ?? tr('ld_peer_customer'));
  const peerRole = lead.isProvider ? tr('ld_role_customer') : tr('ld_role_provider');
  const peerInitials = peerName.slice(0, 2).toUpperCase();
  // Status pill styling by lead status.
  const pillClass = lead.status === 'success'
    ? 'bg-[#e8f8ee] text-[#1a7a4c]'
    : (lead.status === 'cancelled' || lead.status === 'no_response')
      ? 'bg-[#f3f1ea] text-[#7a6a4a]'
      : 'bg-[#EAF7F1] text-[#0FA37F]';
  const lockedText = ['success', 'cancelled', 'no_response'].includes(lead.status)
    ? tr('ld_locked_closed')
    : tr('ld_locked_waiting');

  return (
    <MiniAppShell
      title={`${catName} · ${barrioName}`}
      showBack
      backHref="/mini-app"
      showBottomNav={false}
      rightAction={{label: leadStatusText, onClick: () => {}, icon: <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold ${pillClass}`}>{leadStatusText}</span>}}
    >
      <div className="flex flex-col h-full">
        {/* Context card */}
        <div className="mx-3 mt-3 p-3 bg-white border border-[#DCE4DE] rounded-[14px] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e6ad7b] to-[#513a2f] text-white font-bold text-sm flex items-center justify-center shrink-0">{peerInitials}</div>
          <div className="min-w-0">
            <strong className="block text-[14px] text-[#1A1F1D] truncate">{peerName}</strong>
            <span className="text-[12px] text-[#66706B]">📍 {barrioName} · {peerRole}</span>
          </div>
        </div>

        {/* Thread: system chips + message bubbles */}
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
          {timeline.length > 0 ? timeline.map((item) => {
            if (item.kind === 'event' && item.event) {
              return (
                <div key={item.key} className="self-center text-[12px] font-bold text-[#08735A] bg-[#EAF7F1] px-3 py-1.5 rounded-full text-center">
                  {eventLabel(item.event)}
                </div>
              );
            }
            if (item.kind === 'message' && item.message) {
              const message = item.message;
              const isMine = (lead.isCustomer && message.senderRole === 'customer') || (lead.isProvider && message.senderRole === 'provider');
              return (
                <div key={item.key} className={`flex flex-col max-w-[82%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}>
                  <div className={`px-3.5 py-2.5 rounded-[18px] text-[15px] leading-snug whitespace-pre-wrap ${isMine ? 'bg-[#0FA37F] text-white rounded-br-[4px]' : 'bg-white border border-[#DCE4DE] rounded-bl-[4px] text-[#1A1F1D]'}`}>
                    {message.body}
                  </div>
                  <time dateTime={message.createdAt} className="text-[11px] text-[#66706B] mt-1 px-1">{formatTime(message.createdAt, locale)}</time>
                </div>
              );
            }
            return null;
          }) : <p className="text-[14px] text-[#66706B] text-center m-0">{t.noMessages}</p>}
          <div ref={bottomRef} />
        </div>

        {/* Actions */}
        {lead.allowedActions.length > 0 && (
          <div className="px-3 pb-2 flex gap-2">
            {lead.allowedActions.map((action, index) => {
              const label =
                action === 'provider_opened' ? t.actionProviderOpened :
                action === 'provider_replied' ? t.actionProviderReplied :
                action === 'customer_replied' ? t.actionCustomerReplied :
                action === 'provider_service_completed' ? t.actionProviderServiceCompleted :
                action === 'customer_completion_confirmed' ? t.actionCustomerCompletionConfirmed :
                action === 'cancelled' ? t.actionCancelled :
                action;
              const isCancel = action === 'cancelled';
              return isCancel
                ? <SecondaryButton key={index} onClick={() => submitAction(action as any)}>{label}</SecondaryButton>
                : <PrimaryButton key={index} onClick={() => submitAction(action as any)}>{label}</PrimaryButton>;
            })}
          </div>
        )}

        {/* Composer / Locked */}
        <div className="px-3 pb-4 pt-2 border-t border-[#DCE4DE] bg-white">
          {canCompose ? (
            <div className="flex items-end gap-2 bg-[#FAF9F6] border border-[#DCE4DE] rounded-[20px] p-1.5 pl-3">
              <textarea
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                placeholder={t.messagePlaceholder}
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-[15px] leading-snug text-[#1A1F1D] placeholder-[#66706B] min-h-[40px] max-h-[100px] py-2"
              />
              <button type="button" onClick={submitMessage} disabled={sendingMessage} aria-label="Send"
                className="w-11 h-11 rounded-[14px] bg-[#0FA37F] text-white text-lg flex items-center justify-center shrink-0 disabled:opacity-50">
                {sendingMessage ? '…' : '➤'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 p-3.5 rounded-[16px] bg-[#f1f1ed] text-[#66706B] text-[13px] font-semibold text-center">
              {lockedText}
            </div>
          )}
        </div>
      </div>
    </MiniAppShell>
  );
}
