import {NextResponse} from 'next/server';
import {requireAdminActor, isResponse} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {normalizeModerationProviders} from '@/lib/moderation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await requireAdminActor();
  if (isResponse(actor)) return actor;
  const {data, error} = await createAdminClient().from('providers').select('id,slug,status,bio,onboarding_payload,created_at,profiles!providers_profile_id_fkey(display_name,telegram_user_id),provider_categories(price_from_ars,categories!provider_categories_category_id_fkey(slug)),provider_barrios(barrios!provider_barrios_barrio_id_fkey(slug,name_es,name_ru,name_en))').eq('status', 'approved').order('created_at', {ascending: false});
  if (error) return NextResponse.json({error: 'Provider directory unavailable'}, {status: 503});
  return NextResponse.json({providers: normalizeModerationProviders(data ?? [])});
}
