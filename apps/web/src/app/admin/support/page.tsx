import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAdminActor, isResponse} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {normalizeSupportRows} from '@/lib/support';
import {SupportQueue} from '@/components/support-queue';
import {AdminSignOut} from '@/components/admin-sign-out';

export const dynamic = 'force-dynamic';

export default async function AdminSupportPage() {
  const actor = await requireAdminActor(); if (isResponse(actor)) redirect('/admin/login');
  const {data} = await createAdminClient().from('support_requests').select('id,details,status,created_at,profiles!support_requests_profile_id_fkey(display_name,telegram_user_id)').in('status', ['open', 'reviewing']).order('created_at');
  return <><AdminSignOut/><main className="mx-auto min-h-screen max-w-5xl px-5 py-10"><Link href="/admin" className="text-sm font-bold text-bs-primary">← Cola de moderación</Link><header className="my-8"><span className="text-xs font-extrabold tracking-[.12em] text-bs-primary uppercase">BuenServ · Admin</span><h1 className="font-display mt-2 text-4xl font-extrabold tracking-[-.06em]">Consultas de soporte</h1></header><SupportQueue initialRequests={normalizeSupportRows(data ?? [])}/></main></>;
}
