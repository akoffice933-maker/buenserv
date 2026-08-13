import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getMiniAppInitData, resolveMiniAppIdentity} from '@/lib/telegram/mini-app-auth';

type RouteContext = {params: Promise<{id: string}>};

type LeadMessageRow = {
  id: string;
  body: string;
  sender_role: string;
  created_at: string;
  sender_profile?: {display_name?: string | null} | Array<{display_name?: string | null}> | null;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Read-only lead detail route uses a longer initData freshness window.
    const identity = await resolveMiniAppIdentity(getMiniAppInitData(request), 3600);
    if (!identity) return NextResponse.json({error: 'Mini App profile not found'}, {status: 404});

    const {id: leadId} = await context.params;
    if (!leadId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json({error: 'Invalid lead'}, {status: 400});
    }

    const supabase = createAdminClient();

    // Fetch lead with related data
    const {data: lead, error: leadError} = await supabase
      .from('leads')
      .select(`
        id,
        customer_profile_id,
        status,
        created_at,
        updated_at,
        categories!leads_category_id_fkey(slug),
        barrios!leads_barrio_id_fkey(name_es, name_ru, name_en),
        providers!leads_provider_id_fkey(id, profile_id, slug, status, profiles!providers_profile_id_fkey(display_name))
      `)
      .eq('id', leadId)
      .maybeSingle();

    if (leadError) throw leadError;
    if (!lead) return NextResponse.json({error: 'Lead not found'}, {status: 404});

    const providerRow = Array.isArray(lead.providers) ? lead.providers[0] : lead.providers;
    const isCustomer = lead.customer_profile_id === identity.profileId;
    const isProvider = providerRow?.profile_id === identity.profileId;

    if (!isCustomer && !isProvider) {
      return NextResponse.json({error: 'Not allowed'}, {status: 403});
    }

    // Fetch lead events (immutable timeline)
    const {data: events, error: eventsError} = await supabase
      .from('lead_events')
      .select('event_type, actor_type, created_at, metadata')
      .eq('lead_id', leadId)
      .order('created_at', {ascending: true});

    if (eventsError) throw eventsError;

    const {data: messages, error: messagesError} = await supabase
      .from('lead_messages')
      .select('id, body, sender_role, created_at, sender_profile:profiles!lead_messages_sender_profile_id_fkey(display_name)')
      .eq('lead_id', leadId)
      .order('created_at', {ascending: true});

    if (messagesError) throw messagesError;

    // Determine last event type and allowed actions
    const lastEvent = events.length > 0 ? events[events.length - 1] : null;
    const lastEventType = lastEvent?.event_type as string | null;

    // Define allowed actions based on last event and ownership
    let allowedActions: string[] = [];
    if (isProvider) {
      switch (lastEventType) {
        case 'provider_notified':
          allowedActions = ['provider_opened'];
          break;
        case 'provider_opened':
          allowedActions = ['provider_replied'];
          break;
        case 'provider_replied':
        case 'customer_replied':
          // Provider may mark the service as done after any reply.
          allowedActions = ['provider_service_completed'];
          break;
        case 'provider_service_completed':
          // Waiting for customer to confirm completion.
          allowedActions = [];
          break;
        case 'customer_completion_confirmed':
          allowedActions = [];
          break;
        default:
          allowedActions = [];
      }
    } else if (isCustomer) {
      switch (lastEventType) {
        case 'success':
        case 'cancelled':
        case 'expired':
          allowedActions = [];
          break;
        case 'provider_replied':
          allowedActions = ['customer_replied', 'cancelled'];
          break;
        case 'customer_replied':
          allowedActions = ['cancelled'];
          break;
        case 'provider_service_completed':
          // Customer confirms the service was completed.
          allowedActions = ['customer_completion_confirmed', 'cancelled'];
          break;
        default:
          allowedActions = ['cancelled'];
      }
    }

    const category = Array.isArray(lead.categories) ? lead.categories[0] : lead.categories;
    const barrio = Array.isArray(lead.barrios) ? lead.barrios[0] : lead.barrios;
    const providerProfile = providerRow && Array.isArray(providerRow.profiles) ? providerRow.profiles[0] : providerRow?.profiles;

    const providerDisplayName = Array.isArray(providerProfile)
      ? providerProfile[0]?.display_name ?? ''
      : providerProfile?.display_name ?? '';

    // Format lead data for frontend
    const formattedLead = {
      id: lead.id,
      status: lead.status,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      category: category ? category.slug : null,
      barrio: {
        name_es: barrio?.name_es ?? '',
        name_ru: barrio?.name_ru ?? '',
        name_en: barrio?.name_en ?? '',
      },
      provider: providerRow ? {
        id: providerRow.id,
        slug: providerRow.slug,
        status: providerRow.status,
        profile: {
          display_name: providerDisplayName
        }
      } : null,
      events: events.map(e => ({
        event_type: e.event_type,
        actor_type: e.actor_type,
        created_at: e.created_at
      })),
      messages: (messages ?? []).map((message: LeadMessageRow) => {
        const senderProfile = Array.isArray(message.sender_profile) ? message.sender_profile[0] : message.sender_profile;
        return {
          id: message.id,
          body: message.body,
          senderRole: message.sender_role,
          senderDisplayName: senderProfile?.display_name ?? null,
          createdAt: message.created_at
        };
      }),
      lastEventType,
      allowedActions,
      isCustomer,
      isProvider
    };

    return NextResponse.json({lead: formattedLead});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load lead';
    const status = message.includes('init data') || message.includes('signature') ? 401 : 500;
    return NextResponse.json({error: status === 401 ? 'Invalid Telegram Mini App session' : 'Unable to load lead'}, {status});
  }
}
