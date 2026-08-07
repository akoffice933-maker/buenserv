import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {createPublicDirectoryClient} from '@/lib/supabase/public';

const paramsSchema = z.object({slug: z.string().regex(/^[a-z0-9-]+$/).max(120)});
export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, {params}: {params: Promise<{slug: string}>}) {
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) return NextResponse.json({error: 'Invalid provider slug'}, {status: 400});
  try {
    const supabase = createPublicDirectoryClient();
    const {data, error} = await supabase.from('providers').select('id,slug,photo_path,rating,reviews_count,accepts_usdt,bio,profiles(display_name),provider_categories(price_from_ars,categories(slug)),provider_barrios(barrios(slug,name_es,name_ru,name_en)),reviews(rating,body,locale,created_at)').eq('status', 'approved').eq('slug', parsed.data.slug).maybeSingle();
    if (error) return NextResponse.json({error: 'Directory unavailable'}, {status: 503});
    if (!data) return NextResponse.json({error: 'Not found'}, {status: 404});
    return NextResponse.json({provider: data});
  } catch { return NextResponse.json({error: 'Directory unavailable'}, {status: 503}); }
}
