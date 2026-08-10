'use client';

import {useEffect, useState} from 'react';
import {postEvent, retrieveLaunchParams} from '@telegram-apps/sdk';

type Lead = {id: string; status: string; created_at: string; updated_at: string; categories: {slug: string} | null; barrios: {name_es: string; name_ru: string; name_en: string} | null; providers?: {slug: string} | null};
type Dashboard = {profile: {firstName: string}; provider: {id: string; slug: string; status: string} | null; customerLeads: Lead[]; providerLeads: Lead[]};

const providerStatus: Record<string, string> = {draft: 'Borrador', pending: 'En moderación', approved: 'Aprobado', rejected: 'Necesita cambios', suspended: 'Suspendido'};
const leadStatus: Record<string, string> = {created: 'Creada', contacted: 'Enviada', provider_replied: 'Respondida', success: 'Finalizada', no_response: 'Sin respuesta', cancelled: 'Cancelada'};

function LeadList({title, leads}: {title: string; leads: Lead[]}) {
  return <section style={{display: 'grid', gap: 8}}><h2 style={{fontSize: 17, margin: '8px 0 0'}}>{title}</h2>
    {leads.length === 0 ? <p style={{margin: 0, color: 'var(--tg-theme-hint-color, #777)'}}>Todavía no hay solicitudes.</p> : leads.map((lead) => <article key={lead.id} style={{padding: 14, borderRadius: 12, background: 'var(--tg-theme-secondary-bg-color, #f2f2f2)'}}>
      <strong style={{display: 'block'}}>{lead.categories?.slug ?? 'Servicio'} · {lead.barrios?.name_es ?? 'Buenos Aires'}</strong>
      <span style={{fontSize: 14, color: 'var(--tg-theme-hint-color, #777)'}}>{leadStatus[lead.status] ?? lead.status}</span>
    </article>)}</section>;
}

export default function MiniAppDashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try { postEvent('web_app_expand'); } catch {}
    let initData = '';
    try { initData = String(retrieveLaunchParams().tgWebAppData ?? ''); } catch {}
    if (!initData) { setError('Abrí tu gabinete desde el bot de BuenServ.'); return; }
    fetch('/api/mini-app/dashboard', {headers: {'x-telegram-init-data': initData}})
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? 'No pudimos cargar tu gabinete.');
        return body as Dashboard;
      })
      .then(setDashboard)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'No pudimos cargar tu gabinete.'));
  }, []);

  const shell: React.CSSProperties = {minHeight: '100vh', padding: 16, display: 'grid', gap: 16, background: 'var(--tg-theme-bg-color, #fff)', color: 'var(--tg-theme-text-color, #111)'};
  if (error) return <main style={shell}><h1 style={{fontSize: 22, margin: 0}}>BuenServ</h1><p>{error}</p></main>;
  if (!dashboard) return <main style={shell}><p>Загрузка…</p></main>;

  return <main style={shell}>
    <header><p style={{margin: 0, color: 'var(--tg-theme-hint-color, #777)'}}>BuenServ</p><h1 style={{fontSize: 24, margin: '4px 0'}}>Hola, {dashboard.profile.firstName || 'amigo'}</h1></header>
    {dashboard.provider ? <section style={{padding: 14, borderRadius: 12, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)'}}>
      <strong>Mi perfil profesional</strong><p style={{margin: '6px 0 0'}}>{providerStatus[dashboard.provider.status] ?? dashboard.provider.status}</p>
    </section> : <section style={{padding: 14, borderRadius: 12, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)'}}><strong>¿Ofrecés servicios?</strong><p style={{margin: '6px 0 0'}}>Registrate como prestador desde el bot.</p></section>}
    {dashboard.provider && <LeadList title="Solicitudes recibidas" leads={dashboard.providerLeads} />}
    <LeadList title="Mis solicitudes" leads={dashboard.customerLeads} />
  </main>;
}
