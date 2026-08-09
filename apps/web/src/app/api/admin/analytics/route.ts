import {NextResponse} from 'next/server';
import {requireAdminActor, isResponse} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {aggregatePayloads} from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await requireAdminActor();
  if (isResponse(actor)) return actor;
  if (actor.role === 'support') return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const {data, error} = await createAdminClient().from('telegram_start_events').select('payload,created_at').gte('created_at', since).order('created_at', {ascending: false}).limit(1000);
  if (error) return NextResponse.json({error: 'Analytics unavailable'}, {status: 503});
  return NextResponse.json({periodDays: 30, totalStarts: data?.length ?? 0, byPayload: aggregatePayloads(data ?? [])});
}
