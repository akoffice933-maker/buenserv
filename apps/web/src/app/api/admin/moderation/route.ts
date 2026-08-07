import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdminActor, isResponse} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {normalizeModerationProviders} from '@/lib/moderation';

export const dynamic = 'force-dynamic';

const decisionSchema = z.object({providerId: z.string().uuid(), decision: z.enum(['approved', 'rejected', 'suspended']), reason: z.string().max(1000).optional()});

export async function GET() {
  const actor = await requireAdminActor();
  if (isResponse(actor)) return actor;
  const {data, error} = await createAdminClient().from('providers').select('id,slug,status,bio,onboarding_payload,created_at,profiles(display_name,telegram_user_id),provider_categories(price_from_ars,categories(slug)),provider_barrios(barrios(slug,name_es,name_ru,name_en))').eq('status', 'pending').order('created_at');
  if (error) return NextResponse.json({error: 'Moderation queue unavailable'}, {status: 503});
  return NextResponse.json({providers: normalizeModerationProviders(data ?? [])});
}

export async function PATCH(request: NextRequest) {
  const actor = await requireAdminActor();
  if (isResponse(actor)) return actor;
  if (actor.role === 'support') return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const input = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({error: 'Invalid moderation request'}, {status: 400});
  const {error} = await createAdminClient().rpc('moderate_provider', {
    p_provider_id: input.data.providerId,
    p_actor_profile_id: actor.profileId,
    p_decision: input.data.decision,
    p_reason: input.data.reason ?? null
  });
  if (error) return NextResponse.json({error: 'Moderation update failed'}, {status: 503});
  return NextResponse.json({ok: true});
}
