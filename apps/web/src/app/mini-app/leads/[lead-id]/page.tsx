'use client';

import {useCallback, useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {useMiniApp} from '@/context/MiniAppContext';
import {MiniAppShell} from '@/components/mini-app/MiniAppShell';
import {PrimaryButton, SecondaryButton} from '@/components/mini-app/Buttons';
import {LoadingState, ErrorState} from '@/components/mini-app/FeedbackStates';
import {formatDateTime} from '@/lib/format';

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

const CAT_LABELS: Record<Lang, Record<string, string>> = {
  es: {limpieza: 'Limpieza', reparaciones: 'Reparaciones', mascotas: 'Mascotas', mudanzas: 'Mudanzas', clases: 'Clases', mensajeria: 'Mensajería', 'taxi-traslados': 'Taxi'},
  ru: {limpieza: 'Уборка', reparaciones: 'Ремонт', mascotas: 'Питомцы', mudanzas: 'Переезды', clases: 'Занятия', mensajeria: 'Курьеры', 'taxi-traslados': 'Такси'},
  en: {limpieza: 'Cleaning', reparaciones: 'Repairs', mascotas: 'Pets', mudanzas: 'Moving', clases: 'Lessons', mensajeria: 'Delivery', 'taxi-traslados': 'Taxi'}
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

  function getTelegramInitData(): string {
    try {
      const w = window as unknown as {Telegram?: {WebApp?: {initData?: string}}};
      if (w.Telegram?.WebApp?.initData) return w.Telegram.WebApp.initData;
    } catch { /* ignore */ }
    try {
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
        const tgWebAppData = hashParams.get('tgWebAppData');
        if (tgWebAppData) return tgWebAppData;
      }
    } catch { /* ignore */ }
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tgWebAppData = urlParams.get('tgWebAppData');
      if (tgWebAppData) return tgWebAppData;
    } catch { /* ignore */ }
    return '';
  }

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
  const catName = CAT_LABELS[lang][lead.category ?? ''] ?? lead.category ?? 'Servicio';
  const barrioName = localizedBarrio(lead.barrio, lang);
  const providerName = lead.provider ? lead.provider.profile.display_name : null;
  const providerStatusText = lead.provider ? t.providerStatus[lead.provider.status] ?? lead.provider.status : null;
  const leadStatusText = t.leadStatus[lead.status] ?? lead.status;
  const canCompose = !['success', 'cancelled', 'no_response'].includes(lead.status);

  const eventLabel = (event: {event_type: string; actor_type: string}) => {
    if (event.actor_type === 'provider') {
      if (event.event_type === 'provider_opened') return tr('ld_action_opened');
      if (event.event_type === 'provider_replied') return tr('ld_action_replied');
      return event.event_type;
    }
    if (event.actor_type === 'customer') {
      if (event.event_type === 'customer_replied') return tr('ld_action_customer_replied');
      if (event.event_type === 'cancelled') return tr('ld_action_cancelled');
      return event.event_type;
    }
    return event.event_type;
  };

  return (
    <MiniAppShell title={`${catName} · ${barrioName}`} showBack backHref="/mini-app" showBottomNav={false}>
      <div className="space-y-5 pb-6">
        <div className="bg-white rounded-[20px] p-5 border border-[#DCE4DE]/80 bs-card-shadow space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-extrabold text-[#1A1F1D]">{catName} · {barrioName}</span>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#EAF7F1] text-[#0FA37F] text-[12px] font-bold">{leadStatusText}</span>
          </div>
          {lead.provider && (
            <div className="pt-3 border-t border-[#DCE4DE]/60 space-y-1">
              <p className="text-[13px] text-[#66706B] font-medium m-0">{t.providerProfile}</p>
              <p className="text-[15px] font-bold text-[#1A1F1D] m-0">{providerName}</p>
              {providerStatusText && <p className="text-[13px] text-[#66706B] m-0">{providerStatusText}</p>}
            </div>
          )}
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#DCE4DE]/80 bs-card-shadow space-y-3">
          <h2 className="text-[16px] font-bold text-[#1A1F1D] m-0">Historia</h2>
          {lead.events.length > 0 ? (
            <div className="space-y-2">
              {lead.events.map((event, index) => (
                <div key={index} className="p-3 bg-[#FAF9F6] rounded-[12px] border border-[#DCE4DE]/60">
                  <div className="flex justify-between gap-3 text-[13px]">
                    <span className="text-[#1A1F1D] font-medium">{eventLabel(event)}</span>
                    <span className="text-[#66706B] shrink-0">{formatDateTime(event.created_at, locale)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-[14px] text-[#66706B] text-center m-0">Sin historial</p>}
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#DCE4DE]/80 bs-card-shadow space-y-3">
          <h2 className="text-[16px] font-bold text-[#1A1F1D] m-0">{t.messagesTitle}</h2>
          <div className="space-y-2">
            {lead.messages.length > 0 ? lead.messages.map((message) => {
              const isMine = (lead.isCustomer && message.senderRole === 'customer') || (lead.isProvider && message.senderRole === 'provider');
              return (
                <article key={message.id} className={`p-3 rounded-[14px] border ${isMine ? 'bg-[#EAF7F1] border-[#0FA37F]/20' : 'bg-[#FAF9F6] border-[#DCE4DE]/60'}`}>
                  <div className="flex justify-between gap-3 text-[13px] text-[#66706B]">
                    <strong className="text-[#1A1F1D]">{isMine ? t.you : (message.senderDisplayName ?? message.senderRole)}</strong>
                    <time dateTime={message.createdAt} className="shrink-0">{formatDateTime(message.createdAt, locale)}</time>
                  </div>
                  <p className="m-0 mt-1.5 text-[15px] text-[#1A1F1D] whitespace-pre-wrap">{message.body}</p>
                </article>
              );
            }) : <p className="text-[14px] text-[#66706B] text-center m-0">{t.noMessages}</p>}
          </div>

          {canCompose && (
            <div className="space-y-2 pt-1">
              <textarea
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                placeholder={t.messagePlaceholder}
                rows={4}
                className="w-full min-h-[100px] px-4 py-3 rounded-[14px] bg-[#FAF9F6] border border-[#DCE4DE] text-[15px] text-[#1A1F1D] placeholder-[#66706B] focus:outline-hidden focus:border-[#0FA37F] focus:ring-2 focus:ring-[#0FA37F]/20 transition-all resize-y"
              />
              <PrimaryButton onClick={submitMessage} loading={sendingMessage}>{sendingMessage ? t.sendingMessage : t.sendMessage}</PrimaryButton>
            </div>
          )}
        </div>

        {lead.allowedActions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-[16px] font-bold text-[#1A1F1D] m-0">Acciones disponibles</h2>
            <div className="space-y-2">
              {lead.allowedActions.map((action, index) => {
                const label =
                  action === 'provider_opened' ? t.actionProviderOpened :
                  action === 'provider_replied' ? t.actionProviderReplied :
                  action === 'customer_replied' ? t.actionCustomerReplied :
                  action === 'provider_service_completed' ? t.actionProviderServiceCompleted :
                  action === 'customer_completion_confirmed' ? t.actionCustomerCompletionConfirmed :
                  action === 'cancelled' ? t.actionCancelled :
                  action;
                return (
                  <PrimaryButton key={index} onClick={() => submitAction(action as any)}>{label}</PrimaryButton>
                );
              })}
            </div>
          </div>
        )}

        <SecondaryButton onClick={() => router.push('/mini-app')}>{t.becomeProvider}</SecondaryButton>
      </div>
    </MiniAppShell>
  );
}
