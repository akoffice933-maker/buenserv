import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env';

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const supabase = createAdminClient();

  try {
    const formData = await request.formData();
    const category = formData.get('category') as string;
    const barrio = formData.get('barrio') as string;
    const description = formData.get('description') as string;
    const price = formData.get('price') as string;
    const photo = formData.get('photo') as File | null;

    if (!category || !barrio || !description || !price) {
      return NextResponse.json({error: 'Missing required fields'}, {status: 400});
    }
    if (description.length < 20 || description.length > 800) {
      return NextResponse.json({error: 'Description must be 20-800 characters'}, {status: 400});
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0 || priceNum > 100_000_000) {
      return NextResponse.json({error: 'Invalid price'}, {status: 400});
    }

    // Create a temporary profile for the Telegram user (identified via Mini App init data)
    // In production, authenticate via Telegram WebApp init data.
    const {data: profile, error: profileError} = await supabase.from('profiles').insert({
      role: 'customer',
      display_name: 'Mini App User',
      locale: 'es-AR'
    }).select('id').single();

    if (profileError || !profile) {
      return NextResponse.json({error: 'Failed to create profile'}, {status: 500});
    }

    const {data: provider, error: providerError} = await supabase.from('providers').insert({
      profile_id: profile.id,
      slug: `mini-${Date.now()}`,
      status: 'pending',
      bio: description
    }).select('id').single();

    if (providerError || !provider) {
      await supabase.from('profiles').delete().eq('id', profile.id);
      return NextResponse.json({error: 'Failed to create provider'}, {status: 500});
    }

    // Link category
    const {data: catData} = await supabase.from('categories').select('id').eq('slug', category).maybeSingle();
    if (catData) {
      await supabase.from('provider_categories').insert({provider_id: provider.id, category_id: catData.id, price_from_ars: priceNum});
    }

    // Link barrio
    const {data: barrioData} = await supabase.from('barrios').select('id').eq('slug', barrio).maybeSingle();
    if (barrioData) {
      await supabase.from('provider_barrios').insert({provider_id: provider.id, barrio_id: barrioData.id});
    }

    return NextResponse.json({ok: true, providerId: provider.id});
  } catch (err) {
    console.error('Mini App submit error:', err);
    return NextResponse.json({error: 'Internal error'}, {status: 500});
  }
}