'use client';

import {useState} from 'react';
import type {SupportRequest} from '@/lib/support';

export function SupportQueue({initialRequests}: {initialRequests: SupportRequest[]}) {
  const [requests, setRequests] = useState(initialRequests); const [error, setError] = useState<string | null>(null);
  async function close(id: string) { const note = window.prompt('Nota de cierre (opcional):')?.trim(); const response = await fetch('/api/admin/support', {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({requestId: id, status: 'closed', note})}); if (!response.ok) { setError('No se pudo cerrar la consulta.'); return; } setRequests(current => current.filter(item => item.id !== id)); }
  if (!requests.length) return <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-sm text-bs-muted">No hay consultas abiertas.</div>;
  return <div className="grid gap-4">{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}{requests.map(item => <article key={item.id} className="rounded-2xl border border-black/8 bg-white p-5"><p className="font-display text-xl font-extrabold">{item.requester?.displayName ?? 'Telegram user'}</p><p className="mt-1 text-xs text-bs-muted">{item.requester?.telegramUserId ? `Telegram ${item.requester.telegramUserId}` : 'Profile unavailable'}</p><p className="mt-4 text-sm text-bs-ink/80">{item.details}</p><button onClick={() => close(item.id)} className="mt-4 rounded-lg bg-bs-primary px-3 py-2 text-sm font-extrabold text-white">Cerrar</button></article>)}</div>;
}
