import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {createAdminClient} from '@/lib/supabase/admin';
import {getMiniAppInitData, resolveMiniAppIdentity} from '@/lib/telegram/mini-app-auth';

const messageBody = z.object({
  body: z.string().trim().min(1).max(2000),
  idempotencyKey: z.string().uuid()
});

type RouteContext = {params: Promise<{id: string}>};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const identity = await resolveMiniAppIdentity(getMiniAppInitData(request));
    if (!identity) return NextResponse.json({error: 'Mini App profile not found'}, {status: 404});

    const {id: leadId} = await context.params;
    if (!z.string().uuid().safeParse(leadId).success) return NextResponse.json({error: 'Invalid lead'}, {status: 400});

    const parsed = messageBody.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({error: 'Invalid message'}, {status: 400});

    const supabase = createAdminClient();
    const {data: lead, error: leadError} = await supabase
      .from('leads')
      .select('id, customer_profile_id, status, providers!leads_provider_id_fkey(profile_id)')
      .eq('id', leadId)
      .maybeSingle();
    if (leadError) throw leadError;
    if (!lead) return NextResponse.json({error: 'Lead not found'}, {status: 404});

    const provider = lead.providers as unknown as {profile_id: string} | null;
    const isCustomer = lead.customer_profile_id === identity.profileId;
    const isProvider = provider?.profile_id === identity.profileId;
    if (!isCustomer && !isProvider) return NextResponse.json({error: 'Not allowed'}, {status: 403});

    const {data: messageId, error: messageError} = await supabase.rpc('send_lead_message', {
      p_lead_id: lead.id,
      p_actor_profile_id: identity.profileId,
      p_body: parsed.data.body,
      p_external_source: 'mini_app_message',
      p_external_id: `${lead.id}:${identity.profileId}:${parsed.data.idempotencyKey}`,
      p_metadata: {channel: 'mini_app'}
    });

    if (messageError) {
      const known = ['lead_not_found', 'lead_closed', 'not_lead_participant', 'external_idempotency_required', 'message_body_required', 'message_body_too_long', 'invalid_lead_transition'];
      const status = known.some((item) => messageError.message.includes(item)) ? 409 : 500;
      return NextResponse.json({error: status === 409 ? 'Message is no longer available for this lead' : 'Unable to send message'}, {status});
    }

    return NextResponse.json({ok: true, messageId});
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('init data') || message.includes('signature') ? 401 : 400;
    return NextResponse.json({error: status === 401 ? 'Invalid Telegram Mini App session' : 'Invalid request'}, {status});
  }
}
