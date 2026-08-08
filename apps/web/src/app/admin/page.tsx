import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAdminActor, isResponse} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {normalizeModerationProviders} from '@/lib/moderation';
import {ModerationQueue} from '@/components/moderation-queue';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const actor = await requireAdminActor();
  if (isResponse(actor)) redirect('/admin/login');
  const {data} = await createAdminClient().from('providers').select('id,slug,status,bio,onboarding_payload,created_at,profiles(display_name,telegram_user_id),provider_categories(price_from_ars,categories(slug)),provider_barrios(barrios(slug,name_es,name_ru,name_en))').eq('status', 'pending').order('created_at');
  const providers = normalizeModerationProviders(data ?? []);
  return <main className="mx-auto min-h-screen max-w-5xl px-5 py-10"><header className="mb-9 flex items-end justify-between gap-4"><div><span className="text-xs font-extrabold tracking-[.12em] text-bs-primary uppercase">BuenServ · Admin</span><h1 className="font-display mt-2 text-4xl font-extrabold tracking-[-.06em]">Cola de moderación</h1><p className="mt-2 text-sm text-bs-muted">Rol actual: {actor.role}</p></div><div className="flex items-center gap-3"><Link href="/admin/providers" className="text-sm font-bold text-bs-primary">Perfiles activos →</Link><Link href="/admin/reports" className="text-sm font-bold text-bs-primary">Reportes →</Link><Link href="/admin/support" className="text-sm font-bold text-bs-primary">Soporte →</Link>{actor.role !== 'support' && <Link href="/admin/audit" className="text-sm font-bold text-bs-primary">Audit →</Link>}<span className="rounded-full bg-bs-mint px-3 py-2 text-sm font-extrabold text-bs-primary-dark">{providers.length} pendientes</span></div></header><ModerationQueue initialProviders={providers} role={actor.role}/></main>;
}
