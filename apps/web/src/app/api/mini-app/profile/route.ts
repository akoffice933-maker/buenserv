import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getMiniAppInitData, resolveMiniAppIdentity} from '@/lib/telegram/mini-app-auth';

export async function GET(request: NextRequest) {
  try {
    const identity = await resolveMiniAppIdentity(getMiniAppInitData(request), 3600);
    if (!identity) return NextResponse.json({error: 'Mini App profile not found'}, {status: 404});

    const supabase = createAdminClient();
    const {data: profile, error: profileError} = await supabase
      .from('profiles')
      .select('id, display_name, locale, telegram_user_id')
      .eq('id', identity.profileId)
      .maybeSingle();
    if (profileError) throw profileError;

    const {data: provider, error: providerError} = await supabase
      .from('providers')
      .select('id, slug, status, moderation_reason')
      .eq('profile_id', identity.profileId)
      .maybeSingle();
    if (providerError) throw providerError;

    const {count: activeCount, error: countError} = await supabase
      .from('leads')
      .select('id', {count: 'exact', head: true})
      .eq('customer_profile_id', identity.profileId)
      .in('status', ['created', 'contacted', 'provider_replied']);
    if (countError) throw countError;

    return NextResponse.json({
      profile: {id: profile?.id, displayName: profile?.display_name ?? '', locale: profile?.locale ?? 'es-AR'},
      provider,
      activeRequestCount: activeCount ?? 0
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load profile';
    const status = message.includes('init data') || message.includes('signature') ? 401 : 500;
    return NextResponse.json({error: status === 401 ? 'Invalid Telegram Mini App session' : 'Unable to load profile'}, {status});
  }
}
