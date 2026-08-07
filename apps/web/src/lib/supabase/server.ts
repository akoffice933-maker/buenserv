import 'server-only';
import {createServerClient as createSupabaseServerClient, type CookieOptions} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {getPublicServerEnv} from '@/lib/env';

type CookieToSet = {name: string; value: string; options: CookieOptions};

export async function createServerClient() {
  const store = await cookies();
  const env = getPublicServerEnv();
  return createSupabaseServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values: CookieToSet[]) => { try { values.forEach(value => store.set(value.name, value.value, value.options)); } catch {} }
    }
  });
}
