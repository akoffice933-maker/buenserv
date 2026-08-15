import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {createAdminClient} from '@/lib/supabase/admin';
import {getMiniAppInitData, resolveMiniAppIdentity} from '@/lib/telegram/mini-app-auth';

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
        id, slug, status, photo_path, rating, reviews_count,
        profiles!providers_profile_id_fkey(display_name),
        provider_categories!provider_categories_provider_id_fkey(category_id, price_from_ars, categories!provider_categories_category_id_fkey(slug, name_es, name_ru, name_en)),
        provider_barrios!provider_barrios_provider_id_fkey(barrio_id, barrios!provider_barrios_barrio_id_fkey(slug, name_es, name_ru, name_en))
      `)
      .eq('id', providerId)
      .eq('status', 'approved')
      .not('profiles.telegram_user_id', 'is', null)
      .maybeSingle();
    if (error) throw error;
    if (!provider) return NextResponse.json({error: 'Provider not found'}, {status: 404});

    return NextResponse.json({provider});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load provider';
    const status = message.includes('init data') || message.includes('signature') ? 401 : 500;
    return NextResponse.json({error: status === 401 ? 'Invalid Telegram Mini App session' : 'Unable to load provider'}, {status});
  }
}
