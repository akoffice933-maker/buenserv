import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getMiniAppInitData, resolveMiniAppIdentity} from '@/lib/telegram/mini-app-auth';

export async function GET(request: NextRequest) {
  try {
    const identity = await resolveMiniAppIdentity(getMiniAppInitData(request));
    if (!identity) return NextResponse.json({error: 'Mini App profile not found'}, {status: 404});

    const supabase = createAdminClient();
    const {data: profileLocale, error: profileLocaleError} = await supabase
      .from('profiles')
      .select('locale')
      .eq('id', identity.profileId)
      .maybeSingle();
    if (profileLocaleError) throw profileLocaleError;

    const {data: provider, error: providerError} = await supabase
      .from('providers')
      .select('id, slug, status')
      .eq('profile_id', identity.profileId)
      .maybeSingle();
    if (providerError) throw providerError;

    const customerLeads = await supabase
      .from('leads')
      .select('id, status, created_at, updated_at, categories!leads_category_id_fkey(slug), barrios!leads_barrio_id_fkey(name_es, name_ru, name_en), providers!leads_provider_id_fkey(slug)')
      .eq('customer_profile_id', identity.profileId)
      .order('updated_at', {ascending: false})
      .limit(20);
    if (customerLeads.error) throw customerLeads.error;

    const providerLeads = provider ? await supabase
      .from('leads')
      .select('id, status, created_at, updated_at, categories!leads_category_id_fkey(slug), barrios!leads_barrio_id_fkey(name_es, name_ru, name_en)')
      .eq('provider_id', provider.id)
      .order('updated_at', {ascending: false})
      .limit(20) : {data: [], error: null};
    if (providerLeads.error) throw providerLeads.error;

    return NextResponse.json({
      profile: {id: identity.profileId, firstName: identity.telegramUser.first_name ?? '', locale: profileLocale?.locale ?? 'es-AR'},
      provider,
      customerLeads: customerLeads.data ?? [],
      providerLeads: providerLeads.data ?? []
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load Mini App dashboard';
    const status = message.includes('init data') || message.includes('signature') ? 401 : 500;
    return NextResponse.json({error: status === 401 ? 'Invalid Telegram Mini App session' : 'Unable to load dashboard'}, {status});
  }
}
