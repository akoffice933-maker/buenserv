import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getMiniAppInitData, resolveMiniAppIdentity} from '@/lib/telegram/mini-app-auth';

export async function GET(request: NextRequest) {
  try {
    // Read-only discovery route may tolerate a longer Mini App session.
    const identity = await resolveMiniAppIdentity(getMiniAppInitData(request), 3600);
    if (!identity) return NextResponse.json({error: 'Mini App profile not found'}, {status: 404});

    const supabase = createAdminClient();
    const categorySlug = request.nextUrl.searchParams.get('category');
    const barrioSlug = request.nextUrl.searchParams.get('barrio');

    // Categories (with truthful provider counts only when a filter is applied).
    const {data: categories, error: catError} = await supabase
      .from('categories')
      .select('id, slug, name_es, name_ru, name_en, icon')
      .eq('active', true)
      .order('sort_order', {ascending: true});
    if (catError) throw catError;

    const {data: barrios, error: barrioError} = await supabase
      .from('barrios')
      .select('id, slug, name_es, name_ru, name_en')
      .eq('active', true)
      .order('name_es', {ascending: true});
    if (barrioError) throw barrioError;

    // Approved providers with canonical Telegram identity.
    let query = supabase
      .from('providers')
      .select(`
        id, slug, status, photo_path, rating, reviews_count,
        profiles!providers_profile_id_fkey(display_name),
        provider_categories!provider_categories_provider_id_fkey(category_id, price_from_ars, categories!provider_categories_category_id_fkey(slug, name_es, name_ru, name_en)),
        provider_barrios!provider_barrios_provider_id_fkey(barrio_id, barrios!provider_barrios_barrio_id_fkey(slug, name_es, name_ru, name_en))
      `)
      .eq('status', 'approved')
      .not('profiles.telegram_user_id', 'is', null);

    if (categorySlug) {
      query = query.eq('provider_categories.categories.slug', categorySlug);
    }
    if (barrioSlug) {
      query = query.eq('provider_barrios.barrios.slug', barrioSlug);
    }

    const {data: providers, error: provError} = await query.order('created_at', {ascending: false}).limit(50);
    if (provError) throw provError;

    return NextResponse.json({
      categories: categories ?? [],
      barrios: barrios ?? [],
      providers: providers ?? []
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load search';
    const status = message.includes('init data') || message.includes('signature') ? 401 : 500;
    return NextResponse.json({error: status === 401 ? 'Invalid Telegram Mini App session' : 'Unable to load search'}, {status});
  }
}
