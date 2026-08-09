import {createClient} from '@supabase/supabase-js';
const PROVIDER_PUBLIC_SELECT = 'id,slug,photo_path,rating,reviews_count,accepts_usdt,profiles!providers_profile_id_fkey(display_name),provider_categories(price_from_ars,categories!provider_categories_category_id_fkey(slug)),provider_barrios(barrios!provider_barrios_barrio_id_fkey(slug,name_es,name_ru,name_en))';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.');

const supabase = createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}});
const {data: categories, error: categoryError} = await supabase.from('categories').select('slug').eq('active', true);
if (categoryError) throw categoryError;
const {data: barrios, error: barrioError} = await supabase.from('barrios').select('slug').eq('active', true);
if (barrioError) throw barrioError;
const {data: providers, error: providerError} = await supabase.from('providers').select(PROVIDER_PUBLIC_SELECT).eq('status', 'approved').limit(5);
if (providerError) throw providerError;

console.log(JSON.stringify({categories: categories?.length ?? 0, barrios: barrios?.length ?? 0, approvedProvidersRead: providers?.length ?? 0}, null, 2));
if ((categories?.length ?? 0) < 7) throw new Error('Expected at least 7 active categories.');
if ((barrios?.length ?? 0) < 4) throw new Error('Expected at least 4 active barrios.');
