import 'server-only';
import {createPublicDirectoryClient} from '@/lib/supabase/public';

const providerSelect = 'id,slug,photo_path,rating,reviews_count,accepts_usdt,bio,profiles(display_name),provider_categories(price_from_ars,categories(slug)),provider_barrios(barrios(slug,name_es,name_ru,name_en)),reviews(rating,body,locale,created_at)';

export async function getApprovedProviderBySlug(slug: string) {
  const supabase = createPublicDirectoryClient();
  const {data, error} = await supabase.from('providers').select(providerSelect).eq('status', 'approved').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}
