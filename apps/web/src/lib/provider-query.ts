import 'server-only';
import {cache} from 'react';
import {createPublicDirectoryClient} from '@/lib/supabase/public';

const providerSelect = 'id,slug,photo_path,rating,reviews_count,accepts_usdt,bio,profiles!providers_profile_id_fkey(display_name),provider_categories(price_from_ars,categories!provider_categories_category_id_fkey(slug)),provider_barrios(barrios!provider_barrios_barrio_id_fkey(slug,name_es,name_ru,name_en)),reviews(rating,body,locale,created_at)';

export const getApprovedProviderBySlug = cache(async (slug: string) => {
  const supabase = createPublicDirectoryClient();
  const {data, error} = await supabase.from('providers').select(providerSelect).eq('status', 'approved').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
});
