import {createClient} from '@supabase/supabase-js';
import {getServerEnv} from '@/lib/env';

/** Server-only privileged client. Never import from a Client Component. */
export function createAdminClient() {
  const env = getServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {autoRefreshToken: false, persistSession: false}
  });
}
