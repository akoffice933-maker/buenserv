import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getMiniAppInitData, resolveMiniAppIdentity} from '@/lib/telegram/mini-app-auth';
import {CATEGORY_LABELS, isCategorySlug} from '@/lib/categories';
import {one} from '@/lib/relations';

export async function GET(request: NextRequest) {
  try {
    // Read-only discovery route may tolerate a longer Mini App session.
    const identity = await resolveMiniAppIdentity(getMiniAppInitData(request), 3600);
    if (!identity) return NextResponse.json({error: 'Mini App profile not found'}, {status: 404});

    const supabase = createAdminClient();
    const categorySlug = request.nextUrl.searchParams.get('category');
    const barrioSlug = request.nextUrl.searchParams.get('barrio');

    // Categories: only real DB fields; presentation labels come from the canonical map.
    const {data: categories, error: catError} = await supabase
      .from('categories')
      .select('id, slug, sort_order')
      .eq('active', true)
      .order('sort_order', {ascending: true});
    if (catError) throw catError;

    const {data: barrios, error: barrioError} = await supabase
      .from('barrios')
      .select('id, slug, name_es, name_ru, name_en')
      .eq('active', true)
      .order('name_es', {ascending: true});
    if (barrioError) throw barrioError;

    // Resolve filter slugs to IDs first (robust, avoids fragile nested filters).
    let categoryId: string | null = null;
    if (categorySlug) {
      const {data: cat} = await supabase.from('categories').select('id').eq('slug', categorySlug).maybeSingle();
      if (!cat) return NextResponse.json({categories: categories ?? [], barrios: barrios ?? [], providers: []});
      categoryId = cat.id;
    }
    let barrioId: string | null = null;
    if (barrioSlug) {
      const {data: bar} = await supabase.from('barrios').select('id').eq('slug', barrioSlug).maybeSingle();
      if (!bar) return NextResponse.json({categories: categories ?? [], barrios: barrios ?? [], providers: []});
      barrioId = bar.id;
    }

    // Resolve provider IDs matching category/barrio filters.
    let providerIds: string[] | null = null;
    if (categoryId) {
      const {data: rows} = await supabase.from('provider_categories').select('provider_id').eq('category_id', categoryId);
      providerIds = rows?.map((r) => r.provider_id) ?? [];
    }
    if (barrioId) {
      const {data: rows} = await supabase.from('provider_barrios').select('provider_id').eq('barrio_id', barrioId);
      const barrioIds = rows?.map((r) => r.provider_id) ?? [];
      providerIds = providerIds === null ? barrioIds : providerIds.filter((id) => barrioIds.includes(id));
    }

    // Approved providers with canonical Telegram identity (explicit inner relation).
    let query = supabase
      .from('providers')
      .select(`
        id, slug, status, photo_path,
        profiles!providers_profile_id_fkey!inner(display_name, telegram_user_id),
        provider_categories!provider_categories_provider_id_fkey(category_id, price_from_ars, categories!provider_categories_category_id_fkey(slug)),
        provider_barrios!provider_barrios_provider_id_fkey(barrio_id, barrios!provider_barrios_barrio_id_fkey(slug, name_es, name_ru, name_en))
      `)
      .eq('status', 'approved');

    if (providerIds !== null) {
      query = query.in('id', providerIds.length ? providerIds : ['00000000-0000-0000-0000-000000000000']);
    }

    const {data: providers, error: provError} = await query.order('created_at', {ascending: false}).limit(50);
    if (provError) throw provError;

    // Exclude approved providers without a canonical Telegram identity (unreachable).
    const providersWithIdentity = (providers ?? []).filter((p) => {
      const profile = one(p.profiles as {telegram_user_id?: number | null} | {telegram_user_id?: number | null}[] | null);
      return Boolean(profile?.telegram_user_id);
    });

    // Enrich categories with canonical labels/icons.
    const enrichedCategories = (categories ?? []).map((c) => {
      const meta = isCategorySlug(c.slug) ? CATEGORY_LABELS[c.slug] : null;
      return {...c, name_es: meta?.es ?? c.slug, name_ru: meta?.ru ?? c.slug, name_en: meta?.en ?? c.slug, icon: meta?.icon ?? '•'};
    });

    return NextResponse.json({
      categories: enrichedCategories,
      barrios: barrios ?? [],
      providers: providersWithIdentity
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load search';
    const status = message.includes('init data') || message.includes('signature') ? 401 : 500;
    return NextResponse.json({error: status === 401 ? 'Invalid Telegram Mini App session' : 'Unable to load search'}, {status});
  }
}
