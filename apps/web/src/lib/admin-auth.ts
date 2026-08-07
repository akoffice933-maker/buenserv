import 'server-only';
import {NextResponse} from 'next/server';
import {createServerClient} from '@/lib/supabase/server';

export type AdminActor = {profileId: string; role: 'admin' | 'moderator' | 'support'};

export async function requireAdminActor(): Promise<AdminActor | NextResponse> {
  const supabase = await createServerClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const {data: profile, error} = await supabase.from('profiles').select('id,role').eq('auth_user_id', user.id).maybeSingle();
  if (error || !profile || !['admin', 'moderator', 'support'].includes(profile.role)) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  return {profileId: profile.id, role: profile.role as AdminActor['role']};
}

export function isResponse(value: AdminActor | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
