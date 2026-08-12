import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getMiniAppInitData, resolveMiniAppIdentity} from '@/lib/telegram/mini-app-auth';

type RouteContext = {params: Promise<{id: string}>};

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
        status,
        created_at,
        updated_at,
        categories!leads_category_id_fkey(slug),
        barrios!leads_barrio_id_fkey(name_es, name_ru, name_en),
        providers!leads_provider_id_fkey(id, slug, status, profiles!providers_profile_id_fkey(first_name, last_name))
      `)
      .eq('id', leadId)
      .maybeSingle();

    if (leadError) throw leadError;
    if (!lead) return NextResponse.json({error: 'Lead not found'}, {status: 404});

    // Check ownership: customer or provider
    const isCustomer = lead.customer_profile_id === identity.profileId;
    const provider = lead.providers as unknown as {id: string} | null;
    const isProvider = provider?.id === identity.profileId;

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

    // Determine last event type and allowed actions
    const lastEvent = events.length > 0 ? events[events.length - 1] : null;
    const lastEventType = lastEvent?.event_type as string | null;

    // Define allowed actions based on last event and ownership
    let allowedActions: string[] = [];
    if (isProvider) {
      switch (lastEventType) {
        case null:
        case 'provider_notified':
          allowedActions = ['provider_opened'];
          break;
        case 'provider_opened':
          allowedActions = ['provider_replied'];
          break;
        case 'provider_replied':
          // Waiting for customer reply
          allowedActions = [];
          break;
        case 'customer_replied':
          // Provider can reply again or complete
          allowedActions = ['provider_replied', 'completed'];
          break;
        default:
          // completed, cancelled, etc.
          allowedActions = [];
      }
    } else if (isCustomer) {
      switch (lastEventType) {
        case null:
        case 'customer_contacted':
          allowedActions = ['cancelled'];
          break;
        case 'provider_replied':
          allowedActions = ['customer_replied'];
          break;
        case 'customer_replied':
          // Waiting for provider
          allowedActions = [];
          break;
        default:
          allowedActions = [];
      }
    }

    // Format lead data for frontend
    const formattedLead = {
      id: lead.id,
      status: lead.status,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      category: lead.categories ? lead.categories.slug : null,
      barrio: {
        name_es: lead.barrios?.name_es ?? '',
        name_ru: lead.barrios?.name_ru ?? '',
        name_en: lead.barrios?.name_en ?? '',
      },
      provider: lead.providers ? {
        id: lead.providers.id,
        slug: lead.providers.slug,
        status: lead.providers.status,
        profile: {
          first_name: lead.providers.profiles?.first_name ?? '',
          last_name: lead.providers.profiles?.last_name ?? '',
        }
      } : null,
      events: events.map(e => ({
        event_type: e.event_type,
        actor_type: e.actor_type,
        created_at: e.created_at,
        metadata: e.metadata
      })),
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