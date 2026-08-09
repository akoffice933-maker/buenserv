'use client';

import {useState} from 'react';
import type {SupportRequest} from '@/lib/support';

export function SupportQueue({initialRequests}: {initialRequests: SupportRequest[]}) {
  const [requests, setRequests] = useState(initialRequests); const [error, setError] = useState<string | null>(null);
  async function update(id: string, status: 'reviewing' | 'closed') { const note = status === 'closed' ? window.prompt('Nota de cierre (opcional):')?.trim() : undefined; const response = await fetch('/api/admin/support', {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({requestId: id, status, note})}); if (!response.ok) { setError('No se pudo actualizar la consulta.'); return; } if (status === 'closed') setRequests(current => current.filter(item => item.id !== id)); else setRequests(current => current.map(item => item.id === id ? {...item, status: 'reviewing'} : item)); }
  if (!requests.length) return <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-sm text-bs-muted">No hay consultas abiertas.</div>;
  return <div className="grid gap-4">{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}{requests.map(item => <article key={item.id} className="rounded-2xl border border-black/8 bg-white p-5"><p className="font-display text-xl font-extrabold">{item.requester?.displayName ?? 'Telegram user'}</p><p className="mt-1 text-xs text-bs-muted">{item.requester?.telegramUserId ? `Telegram ${item.requester.telegramUserId}` : 'Profile unavailable'} · {item.status}</p><p className="mt-4 text-sm text-bs-ink/80">{item.details}</p><div className="mt-4 flex gap-2"><button onClick={() => update(item.id, 'reviewing')} disabled={item.status === 'reviewing'} className="rounded-lg border border-black/12 bg-white px-3 py-2 text-sm font-extrabold disabled:opacity-50">Tomar</button><button onClick={() => update(item.id, 'closed')} className="rounded-lg bg-bs-primary px-3 py-2 text-sm font-extrabold text-white">Cerrar</button></div></article>)}</div>;
}
