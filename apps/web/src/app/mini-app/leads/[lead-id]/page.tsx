'use client';

import {useCallback, useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {useMiniApp} from '@/context/MiniAppContext';
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
  en: {limpieza: 'Cleaning', reparaciones: 'Repairs', mascotas: 'Pets', mudanzas: 'Moving', clases: 'Lessons', mensajeria: 'Delivery', 'taxi-traslados': 'Taxi'},
};

const I18N: Record<Lang, {
  greeting: string;
  providerProfile: string;
  becomeProvider: string;
  becomeProviderDesc: string;
  incomingRequests: string;
  myRequests: string;
  empty: string;
  openRequest: string;
  cancelRequest: string;
  noSession: string;
  loadError: string;
  loading: string;
  messagesTitle: string;
  messagePlaceholder: string;
  sendMessage: string;
  sendingMessage: string;
  noMessages: string;
  you: string;
  providerStatus: Record<string, string>;
  leadStatus: Record<string, string>;
  actionProviderOpened: string;
  actionProviderReplied: string;
  actionCustomerReplied: string;
  actionProviderServiceCompleted: string;
  actionCustomerCompletionConfirmed: string;
  actionCancelled: string;
  sessionExpired: string;
}> = {
  es: {
    greeting: 'Hola',
    providerProfile: 'Mi perfil profesional',
    becomeProvider: '¿Ofrecés servicios?',
    becomeProviderDesc: 'Registrate como prestador desde el bot.',
    incomingRequests: 'Solicitudes recibidas',
    myRequests: 'Mis solicitudes',
    empty: 'Todavía no hay solicitudes.',
    openRequest: 'Abrir solicitud',
    cancelRequest: 'Cancelar solicitud',
    noSession: 'Abrí tu gabinete desde el bot de BuenServ.',
    sessionExpired: 'La sesión venció. Abrí tu gabinete nuevamente desde el bot de BuenServ.',
    loadError: 'No pudimos cargar tu gabinete.',
    loading: 'Cargando…',
    messagesTitle: 'Mensajes',
    messagePlaceholder: 'Escribí tu respuesta…',
    sendMessage: 'Enviar mensaje',
    sendingMessage: 'Enviando…',
    noMessages: 'Todavía no hay mensajes.',
    you: 'Vos',
    providerStatus: {draft: 'Borrador', pending: 'En moderación', approved: 'Aprobado', rejected: 'Necesita cambios', suspended: 'Suspendido'},
    leadStatus: {created: 'Creada', contacted: 'Enviada', provider_replied: 'Respondida', success: 'Finalizada', no_response: 'Sin respuesta', cancelled: 'Cancelada'},
    actionProviderOpened: 'Abrir solicitud',
    actionProviderReplied: 'Responder',
    actionCustomerReplied: 'Cliente respondió',
    actionProviderServiceCompleted: 'Marcar como realizado',
    actionCustomerCompletionConfirmed: 'Confirmar finalización',
    actionCancelled: 'Cancelar'
  },
  ru: {
    greeting: 'Привет',
    providerProfile: 'Мой профиль',
    becomeProvider: 'Предлагаете услуги?',
    becomeProviderDesc: 'Зарегистрируйтесь как исполнитель через бота.',
    incomingRequests: 'Входящие заявки',
    myRequests: 'Мои заявки',
    empty: 'Пока нет заявок.',
    openRequest: 'Открыть заявку',
    cancelRequest: 'Отменить заявку',
    noSession: 'Откройте кабинет из бота BuenServ.',
    sessionExpired: 'Сессия истекла. Откройте заявку снова из BuenServ bot.',
    loadError: 'Не удалось загрузить кабинет.',
    loading: 'Загрузка…',
    messagesTitle: 'Сообщения',
    messagePlaceholder: 'Напишите ответ…',
    sendMessage: 'Отправить',
    sendingMessage: 'Отправка…',
    noMessages: 'Сообщений пока нет.',
    you: 'Вы',
    providerStatus: {draft: 'Черновик', pending: 'На модерации', approved: 'Одобрен', rejected: 'Нужны правки', suspended: 'Приостановлен'},
    leadStatus: {created: 'Создана', contacted: 'Отправлена', provider_replied: 'Ответили', success: 'Завершена', no_response: 'Нет ответа', cancelled: 'Отменена'},
    actionProviderOpened: 'Открыть заявку',
    actionProviderReplied: 'Ответить',
    actionCustomerReplied: 'Клиент ответил',
    actionProviderServiceCompleted: 'Отметить выполненным',
    actionCustomerCompletionConfirmed: 'Подтвердить завершение',
    actionCancelled: 'Отменить'
  },
  en: {
    greeting: 'Hello',
    providerProfile: 'My profile',
    becomeProvider: 'Do you offer services?',
    becomeProviderDesc: 'Register as a provider via the bot.',
    incomingRequests: 'Incoming requests',
    myRequests: 'My requests',
    empty: 'No requests yet.',
    openRequest: 'Open request',
    cancelRequest: 'Cancel request',
    noSession: 'Open your cabinet from the BuenServ bot.',
    sessionExpired: 'Session expired. Open the request again from the BuenServ bot.',
    loadError: 'Could not load your cabinet.',
    loading: 'Loading…',
    messagesTitle: 'Messages',
    messagePlaceholder: 'Write your reply…',
    sendMessage: 'Send message',
    sendingMessage: 'Sending…',
    noMessages: 'No messages yet.',
    you: 'You',
    providerStatus: {draft: 'Draft', pending: 'Pending review', approved: 'Approved', rejected: 'Needs changes', suspended: 'Suspended'},
    leadStatus: {created: 'Created', contacted: 'Sent', provider_replied: 'Replied', success: 'Completed', no_response: 'No response', cancelled: 'Cancelled'},
    actionProviderOpened: 'Open request',
    actionProviderReplied: 'Reply',
    actionCustomerReplied: 'Customer replied',
    actionProviderServiceCompleted: 'Mark as done',
    actionCustomerCompletionConfirmed: 'Confirm completion',
    actionCancelled: 'Cancel'
  }
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

  // Try multiple strategies to extract Telegram init data from the page.
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
      setError(I18N[lang].noSession);
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
        if (response.status === 401) throw new Error(I18N[lang].sessionExpired);
        throw new Error(body.error ?? I18N[lang].loadError);
      }
      // Refetch lead data to update state
      fetchLeadData();
    })
    .catch((reason) => setError(reason instanceof Error ? reason.message : I18N[lang].loadError));
  }

  async function submitMessage() {
    const text = messageBody.trim();
    if (!text) return;
    const initData = getTelegramInitData();
    if (!initData) {
      setError(I18N[lang].noSession);
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
        if (response.status === 401) throw new Error(I18N[lang].sessionExpired);
        throw new Error(body.error ?? I18N[lang].loadError);
      }
      setMessageBody('');
      await fetchLeadData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : I18N[lang].loadError);
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
        setError(I18N[lang].noSession);
        return;
      }
      const response = await fetch(`/api/mini-app/leads/${leadId}`, {headers: {'x-telegram-init-data': initData}});
      if (!response.ok) {
        const body = await response.json();
        if (response.status === 401) throw new Error(I18N[lang].sessionExpired);
        throw new Error(body.error ?? I18N[lang].loadError);
      }
      const leadData = await response.json();
      setLead(leadData.lead);
      // Set locale from profile if available in lead data (we don't have it, so we'll keep current or default)
      // In a real app, we might get this from the lead data or a separate profile fetch
    } catch (err) {
      setError(err instanceof Error ? err.message : I18N[lang].loadError);
    } finally {
      setLoading(false);
    }
  }, [leadId, lang]);

  useEffect(() => {
    // Expand the Mini App to full screen
    try {
      const w = window as unknown as {Telegram?: {WebApp?: {expand?: () => void}}};
      w.Telegram?.WebApp?.expand?.();
    } catch { /* ignore */ }
    
    // Fetch initial data
    fetchLeadData();
    
    // Set locale from hash or default
    try {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const langFromHash = hash.get('lang') as Lang;
      if (langFromHash && ['es', 'ru', 'en'].includes(langFromHash)) {
        setLang(langFromHash);
      }
    } catch { /* ignore */ }
    // Hydrate locale from the canonical profile (profiles.locale is the source of truth).
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
      <div style={{padding: 20, textAlign: 'center'}}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => router.push('/mini-app')} style={{marginTop: 10}}>
          Volver al inicio
        </button>
      </div>
    );
  }

  if (loading || !lead) {
    return (
      <div style={{padding: 20, textAlign: 'center'}}>
        <p>Cargando...</p>
      </div>
    );
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

  return (
    <div style={{padding: 20, maxWidth: 500, margin: '0 auto'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
        <h1 style={{margin: 0, fontSize: 24}}>{t.greeting}</h1>
        <div style={{display: 'flex', gap: 10}}>
          <button onClick={() => router.push('/mini-app')} style={{padding: '8px 12px', fontSize: 14}}>
            {t.becomeProvider}
          </button>
        </div>
      </div>
      
      <div style={{background: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 20}}>
        <div style={{fontSize: 18, fontWeight: 'bold', marginBottom: 8}}>
          {catName} · {barrioName}
        </div>
        <div style={{color: '#666', fontSize: 14, marginBottom: 12}}>
          {leadStatusText}
        </div>
        {lead.provider && (
          <div style={{borderTop: '1px solid #eee', paddingTop: 12, marginTop: 12}}>
            <div style={{fontSize: 16, fontWeight: 'bold', marginBottom: 4}}>
              {t.providerProfile}
            </div>
            <div style={{color: '#666', fontSize: 14}}>
              {providerName}
            </div>
            {providerStatusText && (
              <div style={{marginTop: 4, fontSize: 14}}>
                {providerStatusText}
              </div>
            )}
          </div>
        )}
        <div style={{marginTop: 16, fontSize: 16, fontWeight: 'bold'}}>
          Historia
        </div>
        {lead.events.length > 0 ? (
          <div style={{marginTop: 8}}>
            {lead.events.map((event, index) => (
              <div key={index} style={{padding: 8, background: '#fff', borderRadius: 8, marginBottom: 4}}>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13}}>
                  <span>
                    {event.actor_type === 'provider' 
                      ? (event.event_type === 'provider_opened' ? 'Abrió la solicitud' : 
                         event.event_type === 'provider_replied' ? 'Respondió' : 
                         event.event_type)
                      : event.actor_type === 'customer'
                        ? (event.event_type === 'customer_replied' ? 'El cliente respondió' : 
                           event.event_type === 'cancelled' ? 'Canceló la solicitud' : 
                           event.event_type)
                        : event.event_type}
                  </span>
                  <span style={{color: '#666'}}>
                    {formatDateTime(event.created_at, locale)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{color: '#666', fontSize: 14, textAlign: 'center'}}>
            Sin historial
          </p>
        )}
      </div>

      <section style={{background: '#f8f9fa', borderRadius: 12, padding: 16}}>
        <h2 style={{fontSize: 18, margin: 0}}>{t.messagesTitle}</h2>
        <div style={{marginTop: 12, display: 'grid', gap: 8}}>
          {lead.messages.length > 0 ? lead.messages.map((message) => {
            const isMine = (lead.isCustomer && message.senderRole === 'customer') || (lead.isProvider && message.senderRole === 'provider');
            return (
              <article key={message.id} style={{padding: 12, borderRadius: 12, background: isMine ? '#dff1ff' : '#fff', border: '1px solid #e7e7e7'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: '#666'}}>
                  <strong style={{color: '#111'}}>{isMine ? t.you : (message.senderDisplayName ?? message.senderRole)}</strong>
                  <time dateTime={message.createdAt}>{formatDateTime(message.createdAt, locale)}</time>
                </div>
                <p style={{margin: '8px 0 0', whiteSpace: 'pre-wrap'}}>{message.body}</p>
              </article>
            );
          }) : <p style={{color: '#666', fontSize: 14, textAlign: 'center', margin: 0}}>{t.noMessages}</p>}
        </div>

        {canCompose && (
          <div style={{marginTop: 12, display: 'grid', gap: 8}}>
            <textarea
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              placeholder={t.messagePlaceholder}
              rows={4}
              style={{width: '100%', resize: 'vertical', padding: 12, borderRadius: 10, border: '1px solid #d9d9d9', font: 'inherit'}}
            />
            <button
              onClick={submitMessage}
              disabled={sendingMessage}
              style={{
                padding: '12px 16px',
                fontSize: 16,
                border: 'none',
                borderRadius: 8,
                background: sendingMessage ? '#8fbbe0' : '#2481cc',
                color: '#fff',
                cursor: sendingMessage ? 'wait' : 'pointer'
              }}
            >
              {sendingMessage ? t.sendingMessage : t.sendMessage}
            </button>
          </div>
        )}
      </section>
      
      {lead.allowedActions.length > 0 && (
        <div style={{marginTop: 20}}>
          <h2 style={{fontSize: 18, marginBottom: 12}}>Acciones disponibles</h2>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
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
                <button 
                  key={index} 
                  onClick={() => submitAction(action as any)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 16,
                    border: 'none',
                    borderRadius: 8,
                    background: '#2481cc',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      <div style={{marginTop: 30, textAlign: 'center'}}>
        <button onClick={() => router.push('/mini-app')} style={{padding: '10px 16px', fontSize: 14}}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
