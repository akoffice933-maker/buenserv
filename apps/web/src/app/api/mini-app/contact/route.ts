import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {createAdminClient} from '@/lib/supabase/admin';
import {getMiniAppInitData, resolveMiniAppIdentity} from '@/lib/telegram/mini-app-auth';
import {checkRateLimit} from '@/lib/rate-limit';

const contactBody = z.object({
  providerId: z.string().uuid(),
  categoryId: z.string().uuid(),
  barrioId: z.string().uuid(),
  description: z.string().trim().max(2000).optional().default(''),
  idempotencyKey: z.string().uuid()
});

// GET /api/mini-app/contact?providerId=... — returns the provider's available
// categories and barrios so the customer can make an explicit choice.
export async function GET(request: NextRequest) {
  try {
    const identity = await resolveMiniAppIdentity(getMiniAppInitData(request), 3600);
    if (!identity) return NextResponse.json({error: 'Mini App profile not found'}, {status: 404});

    const providerId = request.nextUrl.searchParams.get('providerId') ?? '';
    if (!z.string().uuid().safeParse(providerId).success) return NextResponse.json({error: 'Invalid provider'}, {status: 400});

    const supabase = createAdminClient();
    const {data: provider, error: providerError} = await supabase
      .from('providers')
      .select(`
        id,
        slug,
        profiles!providers_profile_id_fkey(display_name),
        provider_categories!provider_categories_provider_id_fkey(price_from_ars, categories!provider_categories_category_id_fkey(id, slug)),
        provider_barrios!provider_barrios_provider_id_fkey(barrios!provider_barrios_barrio_id_fkey(id, slug, name_es, name_ru, name_en))
      `)
      .eq('id', providerId)
      .eq('status', 'approved')
      .maybeSingle();
    if (providerError) throw providerError;
    if (!provider) return NextResponse.json({error: 'Provider not found'}, {status: 404});

    const cats = (provider.provider_categories as unknown as Array<{price_from_ars: number; categories: {id: string; slug: string}}>) ?? [];
    const barrios = (provider.provider_barrios as unknown as Array<{barrios: {id: string; slug: string; name_es: string; name_ru: string; name_en: string}}>) ?? [];

    const profileRow = Array.isArray(provider.profiles) ? provider.profiles[0] : provider.profiles;

    return NextResponse.json({
      provider: {
        id: provider.id,
        slug: provider.slug,
        displayName: profileRow?.display_name ?? '',
        categories: cats.map((c) => ({id: c.categories.id, slug: c.categories.slug, priceFromArs: c.price_from_ars})),
        barrios: barrios.map((b) => ({id: b.barrios.id, slug: b.barrios.slug, nameEs: b.barrios.name_es, nameRu: b.barrios.name_ru, nameEn: b.barrios.name_en}))
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('init data') || message.includes('signature') ? 401 : 500;
    return NextResponse.json({error: status === 401 ? 'Invalid Telegram Mini App session' : 'Unable to load provider'}, {status});
  }
}

export async function POST(request: NextRequest) {
  try {
    // State-changing: short freshness window on purpose.
    const identity = await resolveMiniAppIdentity(getMiniAppInitData(request), 600);
    if (!identity) return NextResponse.json({error: 'Mini App profile not found'}, {status: 404});

    const parsed = contactBody.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({error: 'Invalid request'}, {status: 400});

    // Rate limit lead creation per customer to prevent abuse.
    const rate = await checkRateLimit(`contact:${identity.profileId}`, 20, 3600);
    if (!rate.allowed) {
      return NextResponse.json({error: 'Too many requests'}, {status: 429, headers: {'Retry-After': String(rate.retryAfterSeconds ?? 60)}});
    }

    const supabase = createAdminClient();
    const {providerId, categoryId, barrioId, description, idempotencyKey} = parsed.data;

    // Verify the provider is approved and actually offers this category/barrio.
    const {data: provider, error: providerError} = await supabase
      .from('providers')
      .select('id, provider_categories!provider_categories_provider_id_fkey(category_id), provider_barrios!provider_barrios_provider_id_fkey(barrio_id)')
      .eq('id', providerId)
      .eq('status', 'approved')
      .maybeSingle();
    if (providerError) throw providerError;
    if (!provider) return NextResponse.json({error: 'Provider not found'}, {status: 404});

    const cats = provider.provider_categories as unknown as Array<{category_id: string}> | undefined;
    const barrios = provider.provider_barrios as unknown as Array<{barrio_id: string}> | undefined;
    const offersCategory = cats?.some((c) => c.category_id === categoryId);
    const offersBarrio = barrios?.some((b) => b.barrio_id === barrioId);
    if (!offersCategory || !offersBarrio) {
      return NextResponse.json({error: 'Provider does not offer this service in this area'}, {status: 400});
    }

    const externalId = `mini_app_contact:${identity.profileId}:${providerId}:${idempotencyKey}`;

    // Step 1: create_lead with explicit category/barrio.
    const {data: leadId, error: leadError} = await supabase.rpc('create_lead', {
      p_customer_profile_id: identity.profileId,
      p_provider_id: providerId,
      p_category_id: categoryId,
      p_barrio_id: barrioId,
      p_source: 'mini_app',
      p_source_detail: 'customer_contact',
      p_external_source: 'mini_app_contact',
      p_external_id: externalId,
      p_metadata: {channel: 'mini_app', description}
    });
    if (leadError) {
      const known = ['provider_not_found', 'external_idempotency_required'];
      const status = known.some((item) => leadError.message.includes(item)) ? 409 : 500;
      return NextResponse.json({error: status === 409 ? 'Unable to create request' : 'Unable to create request'}, {status});
    }

    // Step 2: customer_contacted → status = contacted.
    const {error: contactedError} = await supabase.rpc('record_lead_event', {
      p_lead_id: leadId,
      p_event_type: 'customer_contacted',
      p_actor_type: 'customer',
      p_actor_profile_id: identity.profileId,
      p_external_source: 'mini_app_contact',
      p_external_id: `${externalId}:customer_contacted`,
      p_metadata: {channel: 'mini_app'}
    });
    if (contactedError) {
      return NextResponse.json({error: 'Unable to create request'}, {status: 500});
    }

    // Step 3: provider_notified → creates outbox record automatically.
    const {error: notifiedError} = await supabase.rpc('record_lead_event', {
      p_lead_id: leadId,
      p_event_type: 'provider_notified',
      p_actor_type: 'system',
      p_actor_profile_id: null,
      p_external_source: 'mini_app_contact',
      p_external_id: `${externalId}:provider_notified`,
      p_metadata: {channel: 'mini_app'}
    });
    if (notifiedError) {
      return NextResponse.json({error: 'Unable to create request'}, {status: 500});
    }

    return NextResponse.json({ok: true, leadId});
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('init data') || message.includes('signature') ? 401 : 400;
    return NextResponse.json({error: status === 401 ? 'Invalid Telegram Mini App session' : 'Invalid request'}, {status});
  }
}
