'use server';

import {redirect} from 'next/navigation';
import {createServerClient} from '@/lib/supabase/server';

export async function signOutAdmin() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
