import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {createAdminClient} from '@/lib/supabase/admin';
import {getMiniAppInitData, resolveMiniAppIdentity} from '@/lib/telegram/mini-app-auth';
import {CATEGORY_LABELS, isCategorySlug} from '@/lib/categories';
import {one} from '@/lib/relations';

export async function GET(request: NextRequest, context: {params: Promise<{providerId: string}>}) {
  try {
    const identity = await resolveMiniAppIdentity(getMiniAppInitData(request), 3600);
    if (!identity) return NextResponse.json({error: 'Mini App profile not found'}, {status: 404});

    const {providerId} = await context.params;
    if (!z.string().uuid().safeParse(providerId).success) return NextResponse.json({error: 'Invalid provider'}, {status: 400});

    const supabase = createAdminClient();
    const {data: provider, error} = await supabase
      .from('providers')
      .select(`
        id, slug, status, bio, photo_path,
        profiles!providers_profile_id_fkey!inner(display_name, telegram_user_id),
        provider_categories!provider_categories_provider_id_fkey(category_id, price_from_ars, categories!provider_categories_category_id_fkey(slug)),
        provider_barrios!provider_barrios_provider_id_fkey(barrio_id, barrios!provider_barrios_barrio_id_fkey(slug, name_es, name_ru, name_en))
      `)
      .eq('id', providerId)
      .eq('status', 'approved')
      .maybeSingle();
    if (error) throw error;
    if (!provider) return NextResponse.json({error: 'Provider not found'}, {status: 404});

    const profile = one(provider.profiles as {display_name?: string | null; telegram_user_id?: number | null} | {display_name?: string | null; telegram_user_id?: number | null}[] | null);
    // Exclude approved providers without a canonical Telegram identity (unreachable).
    if (!profile?.telegram_user_id) return NextResponse.json({error: 'Provider not found'}, {status: 404});
    // Enrich category slugs with canonical labels/icons.
    const categories = (provider.provider_categories ?? []).map((pc: {category_id: string; price_from_ars?: number | null; categories: {slug: string} | {slug: string}[] | null}) => {
      const cat = one(pc.categories as {slug: string} | {slug: string}[] | null);
      const slug = cat?.slug ?? '';
      const meta = isCategorySlug(slug) ? CATEGORY_LABELS[slug] : null;
      return {
        categoryId: pc.category_id,
        priceFromArs: pc.price_from_ars ?? null,
        slug,
        name_es: meta?.es ?? slug,
        name_ru: meta?.ru ?? slug,
        name_en: meta?.en ?? slug,
        icon: meta?.icon ?? '•'
      };
    });

    return NextResponse.json({
      provider: {
        id: provider.id,
        slug: provider.slug,
        bio: provider.bio ?? null,
        photoPath: provider.photo_path ?? null,
        displayName: profile?.display_name ?? 'Profesional',
        categories,
        barrios: provider.provider_barrios ?? []
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load provider';
    const status = message.includes('init data') || message.includes('signature') ? 401 : 500;
    return NextResponse.json({error: status === 401 ? 'Invalid Telegram Mini App session' : 'Unable to load provider'}, {status});
  }
}
