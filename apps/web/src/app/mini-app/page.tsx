'use client';

import {useEffect, useState} from 'react';

type Lead = {id: string; status: string; created_at: string; updated_at: string; categories: {slug: string} | null; barrios: {name_es: string; name_ru: string; name_en: string} | null; providers?: {slug: string} | null};
type Dashboard = {profile: {firstName: string}; provider: {id: string; slug: string; status: string} | null; customerLeads: Lead[]; providerLeads: Lead[]};

const providerStatus: Record<string, string> = {draft: 'Borrador', pending: 'En moderación', approved: 'Aprobado', rejected: 'Necesita cambios', suspended: 'Suspendido'};
const leadStatus: Record<string, string> = {created: 'Creada', contacted: 'Enviada', provider_replied: 'Respondida', success: 'Finalizada', no_response: 'Sin respuesta', cancelled: 'Cancelada'};

/** Try multiple strategies to extract Telegram init data from the page. */
function getTelegramInitData(): string {
  // 1) Standard Telegram WebApp API (injected by Telegram's webview)
  try {
    const w = window as unknown as {Telegram?: {WebApp?: {initData?: string}}};
    if (w.Telegram?.WebApp?.initData) return w.Telegram.WebApp.initData;
  } catch { /* ignore */ }
  // 2) URL hash fragment — Telegram passes init data as #tgWebAppData=...
  try {
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      const tgWebAppData = hashParams.get('tgWebAppData');
      if (tgWebAppData) return tgWebAppData;
    }
  } catch { /* ignore */ }
  // 3) URL search params (some Telegram clients / test environments)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const tgWebAppData = urlParams.get('tgWebAppData');
    if (tgWebAppData) return tgWebAppData;
  } catch { /* ignore */ }
  return '';
}

function LeadList({title, leads, action, actionLabel, actionStatuses}: {title: string; leads: Lead[]; action?: (lead: Lead) => void; actionLabel?: string; actionStatuses?: string[]}) {
  return <section style={{display: 'grid', gap: 8}}><h2 style={{fontSize: 17, margin: '8px 0 0'}}>{title}</h2>
    {leads.length === 0 ? <p style={{margin: 0, color: 'var(--tg-theme-hint-color, #777)'}}>Todavía no hay solicitudes.</p> : leads.map((lead) => <article key={lead.id} style={{padding: 14, borderRadius: 12, background: 'var(--tg-theme-secondary-bg-color, #f2f2f2)'}}>
      <strong style={{display: 'block'}}>{lead.categories?.slug ?? 'Servicio'} · {lead.barrios?.name_es ?? 'Buenos Aires'}</strong>
      <span style={{fontSize: 14, color: 'var(--tg-theme-hint-color, #777)'}}>{leadStatus[lead.status] ?? lead.status}</span>
      {action && actionStatuses?.includes(lead.status) && <button onClick={() => action(lead)} style={{display: 'block', marginTop: 10, border: 0, background: 'var(--tg-theme-button-color, #2481cc)', color: 'var(--tg-theme-button-text-color, #fff)', padding: '8px 12px', borderRadius: 8}}>{actionLabel}</button>}
    </article>)}</section>;
}

export default function MiniAppDashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const info: string[] = [];
    // Expand the Mini App to full screen via raw Telegram WebApp API
    try {
      const w = window as unknown as {Telegram?: {WebApp?: {expand?: () => void}}};
      if (w.Telegram?.WebApp) { info.push('WebApp: yes'); w.Telegram.WebApp.expand?.(); }
      else info.push('WebApp: no');
    } catch { info.push('WebApp: error'); }
    const initData = getTelegramInitData();
    info.push(`initData len: ${initData.length}`);
    if (!initData) {
      info.push('WARNING: initData is EMPTY');
      setDebugInfo(info.join(' | '));
      setError('Abrí tu gabinete desde el bot de BuenServ.');
      return;
    }
    info.push(`preview: ${initData.slice(0, 60)}...`);
    setDebugInfo(info.join(' | '));
    fetch('/api/mini-app/dashboard', {headers: {'x-telegram-init-data': initData}})
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? 'No pudimos cargar tu gabinete.');
        return body as Dashboard;
      })
      .then(setDashboard)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'No pudimos cargar tu gabinete.'));
  }, []);

  const submitAction = async (lead: Lead, action: 'provider_opened' | 'cancelled') => {
    try {
      const initData = getTelegramInitData();
      if (!initData) { setError('Sesión no válida. Abrí el gabinete desde el bot de Telegram.'); return; }
      const response = await fetch(`/api/mini-app/leads/${lead.id}/action`, {
        method: 'POST',
        headers: {'content-type': 'application/json', 'x-telegram-init-data': initData},
        body: JSON.stringify({action, idempotencyKey: crypto.randomUUID()})
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'No pudimos actualizar la solicitud.');
      window.location.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos actualizar la solicitud.'); }
  };

  const shell: React.CSSProperties = {minHeight: '100vh', padding: 16, display: 'grid', gap: 16, background: 'var(--tg-theme-bg-color, #fff)', color: 'var(--tg-theme-text-color, #111)'};
  if (error) return <main style={shell}><h1 style={{fontSize: 22, margin: 0}}>BuenServ</h1>{debugInfo && <details style={{fontSize: 10, color: '#999', opacity: 0.7}}><summary>🔍 Debug</summary><pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>{debugInfo}</pre></details>}<p>{error}</p></main>;
  if (!dashboard) return <main style={shell}><p>Загрузка…</p></main>;

  return <main style={shell}>
    <header><p style={{margin: 0, color: 'var(--tg-theme-hint-color, #777)'}}>BuenServ</p><h1 style={{fontSize: 24, margin: '4px 0'}}>Hola, {dashboard.profile.firstName || 'amigo'}</h1></header>
    {dashboard.provider ? <section style={{padding: 14, borderRadius: 12, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)'}}>
      <strong>Mi perfil profesional</strong><p style={{margin: '6px 0 0'}}>{providerStatus[dashboard.provider.status] ?? dashboard.provider.status}</p>
    </section> : <section style={{padding: 14, borderRadius: 12, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)'}}><strong>¿Ofrecés servicios?</strong><p style={{margin: '6px 0 0'}}>Registrate como prestador desde el bot.</p></section>}
    {dashboard.provider && <LeadList title="Solicitudes recibidas" leads={dashboard.providerLeads} action={(lead) => submitAction(lead, 'provider_opened')} actionLabel="Abrir solicitud" actionStatuses={['contacted']} />}
    <LeadList title="Mis solicitudes" leads={dashboard.customerLeads} action={(lead) => submitAction(lead, 'cancelled')} actionLabel="Cancelar solicitud" actionStatuses={['created', 'contacted', 'provider_replied']} />
  </main>;
}
