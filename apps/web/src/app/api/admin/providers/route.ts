import {NextResponse} from 'next/server';
import {requireAdminActor, isResponse} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {normalizeModerationProviders} from '@/lib/moderation';
import {PROVIDER_ADMIN_SELECT} from '@/lib/supabase/selects';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await requireAdminActor();
  if (isResponse(actor)) return actor;
  const {data, error} = await createAdminClient().from('providers').select(PROVIDER_ADMIN_SELECT).eq('status', 'approved').order('created_at', {ascending: false});
  if (error) return NextResponse.json({error: 'Provider directory unavailable'}, {status: 503});
  return NextResponse.json({providers: normalizeModerationProviders(data ?? [])});
}
