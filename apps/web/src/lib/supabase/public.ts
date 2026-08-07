import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {getPublicServerEnv} from '@/lib/env';

/** Server-side public-directory client, restricted by Supabase RLS. */
export function createPublicDirectoryClient() {
  const env = getPublicServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {autoRefreshToken: false, persistSession: false}
  });
}
