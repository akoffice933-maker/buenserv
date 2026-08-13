import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {createAdminClient} from '@/lib/supabase/admin';
import {getMiniAppInitData, resolveMiniAppIdentity} from '@/lib/telegram/mini-app-auth';
import {actorForLeadAction, isMiniAppLeadAction} from '@/lib/telegram/lead-actions';

const actionBody = z.object({action: z.string(), idempotencyKey: z.string().uuid()});

type RouteContext = {params: Promise<{id: string}>};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // State-changing: short freshness window on purpose — see resolveMiniAppIdentity.
    const identity = await resolveMiniAppIdentity(getMiniAppInitData(request), 600);
    if (!identity) return NextResponse.json({error: 'Mini App profile not found'}, {status: 404});
    const {id: leadId} = await context.params;
    if (!z.string().uuid().safeParse(leadId).success) return NextResponse.json({error: 'Invalid lead'}, {status: 400});
    const body = actionBody.safeParse(await request.json());
    if (!body.success || !isMiniAppLeadAction(body.data.action)) return NextResponse.json({error: 'Invalid action'}, {status: 400});

    const supabase = createAdminClient();
    const {data: lead, error: leadError} = await supabase
      .from('leads')
      .select('id, customer_profile_id, provider_id, providers!leads_provider_id_fkey(profile_id)')
      .eq('id', leadId)
      .maybeSingle();
    if (leadError) throw leadError;
    if (!lead) return NextResponse.json({error: 'Lead not found'}, {status: 404});

    const provider = lead.providers as unknown as {profile_id: string} | null;
    const isCustomer = lead.customer_profile_id === identity.profileId;
    const isProvider = provider?.profile_id === identity.profileId;
    const actor = actorForLeadAction(body.data.action, isCustomer, isProvider);
    if (!actor) return NextResponse.json({error: 'Not allowed'}, {status: 403});

    // The service-role RPC locks the lead and validates the immutable transition.
    const {data: eventId, error: eventError} = await supabase.rpc('record_lead_event', {
      p_lead_id: lead.id,
      p_event_type: body.data.action,
      p_actor_type: actor,
      p_actor_profile_id: identity.profileId,
      p_external_source: 'mini_app_action',
      p_external_id: `${lead.id}:${identity.profileId}:${body.data.action}:${body.data.idempotencyKey}`,
      p_metadata: {channel: 'mini_app'}
    });
    if (eventError) {
      const known = ['invalid_lead_transition', 'lead_not_found', 'external_idempotency_required'];
      const status = known.some((item) => eventError.message.includes(item)) ? 409 : 500;
      return NextResponse.json({error: status === 409 ? 'Action is no longer available for this lead' : 'Unable to update lead'}, {status});
    }
    return NextResponse.json({ok: true, eventId});
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('init data') || message.includes('signature') ? 401 : 400;
    return NextResponse.json({error: status === 401 ? 'Invalid Telegram Mini App session' : 'Invalid request'}, {status});
  }
}
