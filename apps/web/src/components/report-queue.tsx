'use client';

import {useState} from 'react';
import type {ModerationReport} from '@/lib/reporting';

export function ReportQueue({initialReports}: {initialReports: ModerationReport[]}) {
  const [reports, setReports] = useState(initialReports);
  const [error, setError] = useState<string | null>(null);
  async function update(id: string, status: 'resolved' | 'dismissed') {
    const note = window.prompt('Nota de resolución (opcional):')?.trim();
    const response = await fetch('/api/admin/reports', {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({reportId: id, status, note})});
    if (!response.ok) { setError('No se pudo actualizar el reporte.'); return; }
    setReports(current => current.filter(report => report.id !== id));
  }
  if (!reports.length) return <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-sm text-bs-muted">No hay reportes abiertos.</div>;
  return <div className="grid gap-4">{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}{reports.map(report => <article key={report.id} className="rounded-2xl border border-black/8 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-display text-xl font-extrabold">{report.provider?.displayName ?? report.provider?.slug ?? 'Provider'}</p><p className="mt-1 text-xs text-bs-muted">Reportado por: {report.reporter?.displayName ?? 'Web anónimo'}{report.reporter?.telegramUserId ? ` · Telegram ${report.reporter.telegramUserId}` : ''}</p><p className="mt-1 text-xs font-bold text-bs-secondary uppercase">{report.reason}</p></div><span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">{report.status}</span></div><p className="mt-4 text-sm text-bs-ink/80">{report.details}</p><div className="mt-4 flex gap-2 border-t border-black/7 pt-4"><button onClick={() => update(report.id, 'resolved')} className="rounded-lg bg-bs-primary px-3 py-2 text-sm font-extrabold text-white">Resolver</button><button onClick={() => update(report.id, 'dismissed')} className="rounded-lg border border-black/12 px-3 py-2 text-sm font-extrabold">Descartar</button></div></article>)}</div>;
}
