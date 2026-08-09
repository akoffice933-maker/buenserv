import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAdminActor, isResponse} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {ReportQueue} from '@/components/report-queue';
import {normalizeReportRows} from '@/lib/reporting';
import {AdminSignOut} from '@/components/admin-sign-out';
import {REPORT_ADMIN_SELECT} from '@/lib/supabase/selects';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const actor = await requireAdminActor();
  if (isResponse(actor)) redirect('/admin/login');
const {data} = await createAdminClient().from('reports').select(REPORT_ADMIN_SELECT).in('status', ['open', 'reviewing']).order('created_at');
  return <><AdminSignOut/><main className="mx-auto min-h-screen max-w-5xl px-5 py-10"><Link href="/admin" className="text-sm font-bold text-bs-primary">← Cola de moderación</Link><header className="my-8"><span className="text-xs font-extrabold tracking-[.12em] text-bs-primary uppercase">BuenServ · Admin</span><h1 className="font-display mt-2 text-4xl font-extrabold tracking-[-.06em]">Reportes abiertos</h1><p className="mt-2 text-sm text-bs-muted">Los reportes no suspenden perfiles automáticamente.</p></header><ReportQueue initialReports={normalizeReportRows(data ?? [])}/></main></>;
}
