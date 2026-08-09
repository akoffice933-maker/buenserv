import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdminActor, isResponse} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {normalizeReportRows} from '@/lib/reporting';

export const dynamic = 'force-dynamic';
const updateSchema = z.object({reportId: z.string().uuid(), status: z.enum(['reviewing', 'resolved', 'dismissed']), note: z.string().max(1000).optional()});

export async function GET() {
  const actor = await requireAdminActor();
  if (isResponse(actor)) return actor;
const {data, error} = await createAdminClient().from('reports').select('id,reason,details,status,created_at,providers!reports_provider_id_fkey(slug,profiles!providers_profile_id_fkey(display_name)),profiles!reports_reporter_profile_id_fkey(display_name,telegram_user_id)').in('status', ['open', 'reviewing']).order('created_at');
  if (error) return NextResponse.json({error: 'Reports unavailable'}, {status: 503});
  return NextResponse.json({reports: normalizeReportRows(data ?? [])});
}

export async function PATCH(request: NextRequest) {
  const actor = await requireAdminActor();
  if (isResponse(actor)) return actor;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({error: 'Invalid report update'}, {status: 400});
  const {error} = await createAdminClient().rpc('resolve_report', {p_report_id: parsed.data.reportId, p_actor_profile_id: actor.profileId, p_status: parsed.data.status, p_note: parsed.data.note ?? null});
  if (error) return NextResponse.json({error: 'Report update failed'}, {status: 503});
  return NextResponse.json({ok: true});
}
