'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';

type Lang = 'es' | 'ru' | 'en';

type Lead = {id: string; status: string; created_at: string; updated_at: string; categories: {slug: string} | null; barrios: {name_es: string; name_ru: string; name_en: string} | null; providers?: {slug: string} | null};
type Dashboard = {profile: {firstName: string; locale: string}; provider: {id: string; slug: string; status: string} | null; customerLeads: Lead[]; providerLeads: Lead[]};

const CAT_LABELS: Record<Lang, Record<string, string>> = {
  es: {limpieza: 'Limpieza', reparaciones: 'Reparaciones', mascotas: 'Mascotas', mudanzas: 'Mudanzas', clases: 'Clases', mensajeria: 'Mensajería', 'taxi-traslados': 'Taxi'},
  ru: {limpieza: 'Уборка', reparaciones: 'Ремонт', mascotas: 'Питомцы', mudanzas: 'Переезды', clases: 'Занятия', mensajeria: 'Курьеры', 'taxi-traslados': 'Такси'},
  en: {limpieza: 'Cleaning', reparaciones: 'Repairs', mascotas: 'Pets', mudanzas: 'Moving', clases: 'Lessons', mensajeria: 'Delivery', 'taxi-traslados': 'Taxi'}
};

const I18N: Record<Lang, {
  greeting: string; providerProfile: string; becomeProvider: string; becomeProviderDesc: string;
  incomingRequests: string; myRequests: string; empty: string; openRequest: string; cancelRequest: string;
  noSession: string; sessionExpired: string; reopen: string; loadError: string; loading: string;
  openLabel: string;
  providerStatus: Record<string, string>; leadStatus: Record<string, string>;
}> = {
  es: {
    greeting: 'Hola', providerProfile: 'Mi perfil profesional', becomeProvider: '¿Ofrecés servicios?',
    becomeProviderDesc: 'Registrate como prestador desde el bot.',
    incomingRequests: 'Solicitudes recibidas', myRequests: 'Mis solicitudes',
    empty: 'Todavía no hay solicitudes.', openRequest: 'Abrir solicitud', cancelRequest: 'Cancelar solicitud',
    noSession: 'Abrí tu gabinete desde el bot de BuenServ.', sessionExpired: 'La sesión venció. Abrí tu gabinete nuevamente desde el bot de BuenServ.', reopen: 'Volver al bot', loadError: 'No pudimos cargar tu gabinete.', loading: 'Cargando…',
    openLabel: 'Abrir',
    providerStatus: {draft: 'Borrador', pending: 'En moderación', approved: 'Aprobado', rejected: 'Necesita cambios', suspended: 'Suspendido'},
    leadStatus: {created: 'Creada', contacted: 'Enviada', provider_replied: 'Respondida', success: 'Finalizada', no_response: 'Sin respuesta', cancelled: 'Cancelada'}
  },
  ru: {
    greeting: 'Привет', providerProfile: 'Мой профиль', becomeProvider: 'Предлагаете услуги?',
    becomeProviderDesc: 'Зарегистрируйтесь как исполнитель через бота.',
    incomingRequests: 'Входящие заявки', myRequests: 'Мои заявки',
    empty: 'Пока нет заявок.', openRequest: 'Посмотреть заявку', cancelRequest: 'Отменить заявку',
    noSession: 'Откройте кабинет из бота BuenServ.', sessionExpired: 'Сессия истекла. Откройте кабинет заново из BuenServ bot.', reopen: 'Вернуться в бот', loadError: 'Не удалось загрузить кабинет.', loading: 'Загрузка…',
    openLabel: 'Открыть',
    providerStatus: {draft: 'Черновик', pending: 'На модерации', approved: 'Одобрен', rejected: 'Нужны правки', suspended: 'Приостановлен'},
    leadStatus: {created: 'Создана', contacted: 'Отправлена', provider_replied: 'Ответили', success: 'Завершена', no_response: 'Нет ответа', cancelled: 'Отменена'}
  },
  en: {
    greeting: 'Hello', providerProfile: 'My profile', becomeProvider: 'Do you offer services?',
    becomeProviderDesc: 'Register as a provider via the bot.',
    incomingRequests: 'Incoming requests', myRequests: 'My requests',
    empty: 'No requests yet.', openRequest: 'Open request', cancelRequest: 'Cancel request',
    noSession: 'Open your cabinet from the BuenServ bot.', sessionExpired: 'Session expired. Open your cabinet again from the BuenServ bot.', reopen: 'Back to the bot', loadError: 'Could not load your cabinet.', loading: 'Loading…',
    openLabel: 'Open',
    providerStatus: {draft: 'Draft', pending: 'Pending review', approved: 'Approved', rejected: 'Needs changes', suspended: 'Suspended'},
    leadStatus: {created: 'Created', contacted: 'Sent', provider_replied: 'Replied', success: 'Completed', no_response: 'No response', cancelled: 'Cancelled'}
  }
};

/** Try multiple strategies to extract Telegram init data from the page. */
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

function localizedBarrio(barrios: {name_es: string; name_ru: string; name_en: string} | null, lang: Lang): string {
  if (!barrios) return 'Buenos Aires';
  if (lang === 'ru' && barrios.name_ru) return barrios.name_ru;
  if (lang === 'en' && barrios.name_en) return barrios.name_en;
  return barrios.name_es;
}

function LeadList({title, leads, lang, onOpen, action, actionLabel, actionStatuses, i18n}: {
  title: string; leads: Lead[]; lang: Lang;
  onOpen: (lead: Lead) => void;
  action?: (lead: Lead) => void; actionLabel?: string; actionStatuses?: string[];
  i18n: {leadStatus: Record<string, string>; empty: string; openLabel: string};
}) {
  const catLabels = CAT_LABELS[lang];
  return <section style={{display: 'grid', gap: 8}}><h2 style={{fontSize: 17, margin: '8px 0 0'}}>{title}</h2>
    {leads.length === 0 ? <p style={{margin: 0, color: 'var(--tg-theme-hint-color, #777)'}}>{i18n.empty}</p> : leads.map((lead) => {
      const catName = catLabels[lead.categories?.slug ?? ''] ?? lead.categories?.slug ?? 'Servicio';
      const barrioName = localizedBarrio(lead.barrios, lang);
      return <article key={lead.id} onClick={() => onOpen(lead)} style={{padding: 14, borderRadius: 12, background: 'var(--tg-theme-secondary-bg-color, #f2f2f2)', cursor: 'pointer'}}>
        <strong style={{display: 'block'}}>{catName} · {barrioName}</strong>
        <span style={{fontSize: 14, color: 'var(--tg-theme-hint-color, #777)'}}>{i18n.leadStatus[lead.status] ?? lead.status}</span>
        <button onClick={(e) => { e.stopPropagation(); onOpen(lead); }} style={{display: 'block', marginTop: 10, border: 0, background: 'var(--tg-theme-button-color, #2481cc)', color: 'var(--tg-theme-button-text-color, #fff)', padding: '8px 12px', borderRadius: 8}}>{i18n.openLabel ?? 'Abrir'}</button>
        {action && actionStatuses?.includes(lead.status) && <button onClick={(e) => { e.stopPropagation(); action(lead); }} style={{display: 'block', marginTop: 8, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)', background: 'transparent', color: 'var(--tg-theme-text-color, #111)', padding: '8px 12px', borderRadius: 8}}>{actionLabel}</button>}
      </article>;
    })}</section>;
}

export default function MiniAppDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [lang, setLang] = useState<Lang>('es');

  const closeMiniApp = () => {
    try {
      const w = window as unknown as {Telegram?: {WebApp?: {close?: () => void}}};
      w.Telegram?.WebApp?.close?.();
    } catch { /* ignore — nothing else we can do from here */ }
  };

  useEffect(() => {
    // Expand the Mini App to full screen
    try {
      const w = window as unknown as {Telegram?: {WebApp?: {expand?: () => void}}};
      w.Telegram?.WebApp?.expand?.();
    } catch { /* ignore */ }
    const initData = getTelegramInitData();
    if (!initData) {
      setError(I18N.es.noSession);
      return;
    }
    fetch('/api/mini-app/dashboard', {headers: {'x-telegram-init-data': initData}})
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          if (response.status === 401) { setSessionExpired(true); throw new Error(I18N[lang].sessionExpired); }
          throw new Error(body.error ?? I18N[lang].loadError);
        }
        const dash = body as Dashboard;
        const l = (dash.profile.locale?.startsWith('ru') ? 'ru' : dash.profile.locale?.startsWith('en') ? 'en' : 'es') as Lang;
        setLang(l);
        return dash;
      })
      .then(setDashboard)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : I18N[lang].loadError));
  }, [lang]);

  const submitAction = async (lead: Lead, action: 'cancelled') => {
    try {
      const initData = getTelegramInitData();
      if (!initData) { setError(I18N[lang].noSession); return; }
      const response = await fetch(`/api/mini-app/leads/${lead.id}/action`, {
        method: 'POST',
        headers: {'content-type': 'application/json', 'x-telegram-init-data': initData},
        body: JSON.stringify({action, idempotencyKey: crypto.randomUUID()})
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 401) { setSessionExpired(true); throw new Error(I18N[lang].sessionExpired); }
        throw new Error(body.error ?? I18N[lang].loadError);
      }
      window.location.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : I18N[lang].loadError); }
  };

  const viewLeadDetail = (lead: Lead) => {
    router.push(`/mini-app/leads/${lead.id}`);
  };

  const t = I18N[lang];
  const shell: React.CSSProperties = {minHeight: '100vh', padding: 16, display: 'grid', gap: 16, background: 'var(--tg-theme-bg-color, #fff)', color: 'var(--tg-theme-text-color, #111)'};
  if (error) return <main style={shell}>
    <h1 style={{fontSize: 22, margin: 0}}>BuenServ</h1>
    <p>{error}</p>
    {sessionExpired && <button onClick={closeMiniApp} style={{padding: '10px 16px', borderRadius: 10, border: 'none', background: 'var(--tg-theme-button-color, #2481cc)', color: 'var(--tg-theme-button-text-color, #fff)', fontWeight: 600}}>{t.reopen}</button>}
  </main>;
  if (!dashboard) return <main style={shell}><p>{t.loading}</p></main>;

  return <main style={shell}>
    <header><p style={{margin: 0, color: 'var(--tg-theme-hint-color, #777)'}}>BuenServ</p><h1 style={{fontSize: 24, margin: '4px 0'}}>{t.greeting}, {dashboard.profile.firstName || 'amigo'} 👋</h1></header>
    {dashboard.provider ? <section style={{padding: 14, borderRadius: 12, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)'}}>
      <strong>{t.providerProfile}</strong><p style={{margin: '6px 0 0'}}>{t.providerStatus[dashboard.provider.status] ?? dashboard.provider.status}</p>
    </section> : <section style={{padding: 14, borderRadius: 12, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)'}}><strong>{t.becomeProvider}</strong><p style={{margin: '6px 0 0'}}>{t.becomeProviderDesc}</p></section>}
    {dashboard.provider && <LeadList title={t.incomingRequests} leads={dashboard.providerLeads} lang={lang} onOpen={viewLeadDetail} i18n={{leadStatus: t.leadStatus, empty: t.empty, openLabel: t.openLabel}} />}
    <LeadList title={t.myRequests} leads={dashboard.customerLeads} lang={lang} onOpen={viewLeadDetail} action={(lead) => submitAction(lead, 'cancelled')} actionLabel={t.cancelRequest} actionStatuses={['created', 'contacted', 'provider_replied']} i18n={{leadStatus: t.leadStatus, empty: t.empty, openLabel: t.openLabel}} />
  </main>;
}
