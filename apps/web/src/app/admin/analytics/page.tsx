import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAdminActor, isResponse} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {aggregatePayloads} from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const actor = await requireAdminActor(); if (isResponse(actor)) redirect('/admin/login'); if (actor.role === 'support') redirect('/admin');
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const {data} = await createAdminClient().from('telegram_start_events').select('payload,created_at').gte('created_at', since).order('created_at', {ascending: false}).limit(1000);
  const metrics = aggregatePayloads(data ?? []);
  return <main className="mx-auto min-h-screen max-w-5xl px-5 py-10"><Link href="/admin" className="text-sm font-bold text-bs-primary">← Cola de moderación</Link><header className="my-8"><span className="text-xs font-extrabold tracking-[.12em] text-bs-primary uppercase">BuenServ · Admin</span><h1 className="font-display mt-2 text-4xl font-extrabold tracking-[-.06em]">Telegram attribution</h1><p className="mt-2 text-sm text-bs-muted">Últimos 30 días · {data?.length ?? 0} starts</p></header><div className="overflow-x-auto rounded-2xl border border-black/8 bg-white"><table className="w-full min-w-[480px] text-left text-sm"><thead className="border-b border-black/8 text-xs text-bs-muted"><tr><th className="p-4">Payload</th><th className="p-4">Starts</th></tr></thead><tbody>{metrics.map(metric => <tr key={metric.payload} className="border-b border-black/6 last:border-0"><td className="p-4 font-bold">{metric.payload}</td><td className="p-4">{metric.count}</td></tr>)}</tbody></table></div></main>;
}
