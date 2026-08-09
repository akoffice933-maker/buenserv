import {NextResponse} from 'next/server';
import {requireAdminActor, isResponse} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {normalizeAuditRows} from '@/lib/audit';
import {AUDIT_ADMIN_SELECT} from '@/lib/supabase/selects';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await requireAdminActor();
  if (isResponse(actor)) return actor;
  if (actor.role === 'support') return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const {data, error} = await createAdminClient().from('audit_events').select(AUDIT_ADMIN_SELECT).order('created_at', {ascending: false}).limit(100);
  if (error) return NextResponse.json({error: 'Audit log unavailable'}, {status: 503});
  return NextResponse.json({events: normalizeAuditRows(data ?? [])});
}
