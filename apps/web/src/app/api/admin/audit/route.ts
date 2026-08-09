import {NextResponse} from 'next/server';
import {requireAdminActor, isResponse} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {normalizeAuditRows} from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await requireAdminActor();
  if (isResponse(actor)) return actor;
  if (actor.role === 'support') return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const {data, error} = await createAdminClient().from('audit_events').select('id,action,entity_type,entity_id,metadata,created_at,profiles!audit_events_actor_profile_id_fkey(display_name)').order('created_at', {ascending: false}).limit(100);
  if (error) return NextResponse.json({error: 'Audit log unavailable'}, {status: 503});
  return NextResponse.json({events: normalizeAuditRows(data ?? [])});
}
