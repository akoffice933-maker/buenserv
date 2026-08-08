import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAdminActor, isResponse} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {normalizeAuditRows} from '@/lib/audit';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const actor = await requireAdminActor(); if (isResponse(actor)) redirect('/admin/login'); if (actor.role === 'support') redirect('/admin');
  const {data} = await createAdminClient().from('audit_events').select('id,action,entity_type,entity_id,metadata,created_at,profiles(display_name)').order('created_at', {ascending: false}).limit(100);
  const events = normalizeAuditRows(data ?? []);
  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-10"><Link href="/admin" className="text-sm font-bold text-bs-primary">← Cola de moderación</Link><header className="my-8"><span className="text-xs font-extrabold tracking-[.12em] text-bs-primary uppercase">BuenServ · Admin</span><h1 className="font-display mt-2 text-4xl font-extrabold tracking-[-.06em]">Audit log</h1><p className="mt-2 text-sm text-bs-muted">Últimos 100 eventos internos.</p></header><div className="overflow-x-auto rounded-2xl border border-black/8 bg-white"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-black/8 text-xs text-bs-muted"><tr><th className="p-4">Fecha</th><th className="p-4">Actor</th><th className="p-4">Acción</th><th className="p-4">Entidad</th><th className="p-4">Detalle</th></tr></thead><tbody>{events.map(event => <tr key={event.id} className="border-b border-black/6 last:border-0"><td className="p-4 text-bs-muted">{new Date(event.createdAt).toLocaleString()}</td><td className="p-4">{event.actor?.displayName ?? 'System'}</td><td className="p-4 font-bold">{event.action}</td><td className="p-4 text-bs-muted">{event.entityType}</td><td className="p-4"><details><summary className="cursor-pointer text-bs-primary">Ver</summary><pre className="mt-2 max-w-xs overflow-auto rounded bg-black/4 p-2 text-[11px] text-bs-muted">{JSON.stringify(event.metadata, null, 2)}</pre></details></td></tr>)}</tbody></table></div></main>;
}
