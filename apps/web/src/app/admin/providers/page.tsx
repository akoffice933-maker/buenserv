import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAdminActor, isResponse} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {normalizeModerationProviders} from '@/lib/moderation';
import {ProviderManagement} from '@/components/provider-management';

export const dynamic = 'force-dynamic';

export default async function AdminProvidersPage() {
  const actor = await requireAdminActor();
  if (isResponse(actor)) redirect('/admin/login');
  const {data} = await createAdminClient().from('providers').select('id,slug,status,bio,onboarding_payload,created_at,profiles(display_name,telegram_user_id),provider_categories(price_from_ars,categories(slug)),provider_barrios(barrios(slug,name_es,name_ru,name_en))').eq('status', 'approved').order('created_at', {ascending: false});
  return <main className="mx-auto min-h-screen max-w-5xl px-5 py-10"><Link href="/admin" className="text-sm font-bold text-bs-primary">← Cola de moderación</Link><header className="my-8 flex items-end justify-between gap-4"><div><span className="text-xs font-extrabold tracking-[.12em] text-bs-primary uppercase">BuenServ · Admin</span><h1 className="font-display mt-2 text-4xl font-extrabold tracking-[-.06em]">Perfiles activos</h1><p className="mt-2 text-sm text-bs-muted">Suspensión requiere motivo y confirmación explícita.</p></div></header><ProviderManagement initialProviders={normalizeModerationProviders(data ?? [])} role={actor.role}/></main>;
}
