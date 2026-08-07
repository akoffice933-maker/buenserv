'use client';

import {useState} from 'react';
import type {ModerationProvider} from '@/lib/moderation';

export function ProviderManagement({initialProviders, role}: {initialProviders: ModerationProvider[]; role: 'admin' | 'moderator' | 'support'}) {
  const [providers, setProviders] = useState(initialProviders);
  const [error, setError] = useState<string | null>(null);
  async function suspend(providerId: string) {
    const reason = window.prompt('Motivo de la suspensión para el prestador:')?.trim();
    if (!reason || !window.confirm('¿Confirmás que querés suspender este perfil del directorio?')) return;
    setError(null);
    const response = await fetch('/api/admin/moderation', {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({providerId, decision: 'suspended', reason})});
    if (!response.ok) { setError('No se pudo suspender el perfil. Intentá de nuevo.'); return; }
    setProviders(current => current.filter(provider => provider.id !== providerId));
  }
  return <div className="grid gap-4">{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}{!providers.length ? <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-sm text-bs-muted">No hay perfiles activos.</div> : providers.map(provider => <article key={provider.id} className="rounded-2xl border border-black/8 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-xl font-extrabold">{provider.applicant?.displayName ?? provider.slug}</h2><p className="mt-1 text-sm text-bs-muted">{provider.categories.map(item => item.category?.slug).filter(Boolean).join(', ')} · {provider.barrios.map(item => item.barrio?.name_es).filter(Boolean).join(', ')}</p></div><span className="rounded-full bg-bs-mint px-2 py-1 text-xs font-bold text-bs-primary-dark">Activo</span></div>{role === 'support' ? <p className="mt-4 text-sm text-bs-muted">Acceso de solo lectura</p> : <button onClick={() => suspend(provider.id)} className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-extrabold text-amber-800">Suspender</button>}</article>)}</div>;
}
