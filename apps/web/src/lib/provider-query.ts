import 'server-only';
import {cache} from 'react';
import {createPublicDirectoryClient} from '@/lib/supabase/public';
import {PROVIDER_PROFILE_SELECT} from '@/lib/supabase/selects';

export const getApprovedProviderBySlug = cache(async (slug: string) => {
  const supabase = createPublicDirectoryClient();
  const {data, error} = await supabase.from('providers').select(PROVIDER_PROFILE_SELECT).eq('status', 'approved').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
});
