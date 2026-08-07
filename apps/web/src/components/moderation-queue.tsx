'use client';

import {useState} from 'react';
import type {ModerationProvider} from '@/lib/moderation';

export function ModerationQueue({initialProviders, role}: {initialProviders: ModerationProvider[]; role: 'admin' | 'moderator' | 'support'}) {
  const [providers, setProviders] = useState(initialProviders);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function decide(providerId: string, decision: 'approved' | 'rejected') {
    const reason = decision === 'rejected' ? window.prompt('Motivo del rechazo para el prestador:')?.trim() : undefined;
    if (decision === 'rejected' && !reason) return;
    setBusy(providerId); setError(null);
    try {
      const response = await fetch('/api/admin/moderation', {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({providerId, decision, reason})});
      if (!response.ok) throw new Error('moderation failed');
      setProviders(current => current.filter(provider => provider.id !== providerId));
    } catch { setError('No se pudo guardar la decisión. Intentá de nuevo.'); }
    finally { setBusy(null); }
  }
  if (!providers.length) return <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-sm text-bs-muted">No hay perfiles pendientes de moderación.</div>;
  return <div className="grid gap-4">{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}{providers.map(provider => <article key={provider.id} className="rounded-2xl border border-black/8 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-display text-xl font-extrabold">{provider.applicant?.displayName ?? provider.slug}</p><p className="mt-1 text-sm text-bs-muted">{provider.categories.map(item => item.category?.slug).filter(Boolean).join(', ')} · {provider.barrios.map(item => item.barrio?.name_es).filter(Boolean).join(', ')}</p></div><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">Pendiente</span></div><p className="mt-4 max-w-2xl text-sm leading-relaxed text-bs-ink/80">{provider.bio}</p><div className="mt-4 flex gap-2 border-t border-black/7 pt-4">{role === 'support' ? <span className="text-sm text-bs-muted">Acceso de solo lectura</span> : <><button disabled={busy === provider.id} onClick={() => decide(provider.id, 'approved')} className="rounded-lg bg-bs-primary px-3 py-2 text-sm font-extrabold text-white disabled:opacity-50">Aprobar</button><button disabled={busy === provider.id} onClick={() => decide(provider.id, 'rejected')} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-extrabold text-red-700 disabled:opacity-50">Rechazar</button></>}</div></article>)}</div>;
}
