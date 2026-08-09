import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdminActor, isResponse} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {normalizeSupportRows} from '@/lib/support';
import {SUPPORT_ADMIN_SELECT} from '@/lib/supabase/selects';

export const dynamic = 'force-dynamic';
const updateSchema = z.object({requestId: z.string().uuid(), status: z.enum(['reviewing', 'closed']), note: z.string().max(1000).optional()});

export async function GET() {
  const actor = await requireAdminActor();
  if (isResponse(actor)) return actor;
  const {data, error} = await createAdminClient().from('support_requests').select(SUPPORT_ADMIN_SELECT).in('status', ['open', 'reviewing']).order('created_at');
  if (error) return NextResponse.json({error: 'Support queue unavailable'}, {status: 503});
  return NextResponse.json({requests: normalizeSupportRows(data ?? [])});
}

export async function PATCH(request: NextRequest) {
  const actor = await requireAdminActor();
  if (isResponse(actor)) return actor;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({error: 'Invalid support update'}, {status: 400});
  const {error} = await createAdminClient().rpc('resolve_support_request', {p_request_id: parsed.data.requestId, p_actor_profile_id: actor.profileId, p_status: parsed.data.status, p_note: parsed.data.note ?? null});
  if (error) return NextResponse.json({error: 'Support update failed'}, {status: 503});
  return NextResponse.json({ok: true});
}
