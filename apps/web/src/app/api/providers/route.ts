import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {createPublicDirectoryClient} from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

type ProviderRow = {
  id: string;
  slug: string;
  photo_path: string | null;
  rating: number;
  reviews_count: number;
  accepts_usdt: boolean;
  provider_categories?: Array<{price_from_ars: number | null; categories?: {slug: string} | null}>;
  provider_barrios?: Array<{barrios?: {slug: string; name_es: string; name_ru: string; name_en: string} | null}>;
};

const querySchema = z.object({
  category: z.string().regex(/^[a-z0-9-]+$/).max(80).optional(),
  barrio: z.string().regex(/^[a-z0-9-]+$/).max(80).optional(),
  usdt: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(12)
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({error: 'Invalid query'}, {status: 400});

  try {
    const supabase = createPublicDirectoryClient();
    let query = supabase.from('providers').select('id,slug,photo_path,rating,reviews_count,accepts_usdt,provider_categories(price_from_ars,categories(slug)),provider_barrios(barrios(slug,name_es,name_ru,name_en))').eq('status', 'approved').order('rating', {ascending: false}).limit(parsed.data.limit);
    if (parsed.data.usdt === 'true') query = query.eq('accepts_usdt', true);
    const {data, error} = await query;
    if (error) return NextResponse.json({error: 'Directory unavailable'}, {status: 503});

    const rows = (data ?? []) as unknown as ProviderRow[];
    const filtered = rows.filter(provider => {
      const categoryOK = !parsed.data.category || provider.provider_categories?.some(item => item.categories?.slug === parsed.data.category);
      const barrioOK = !parsed.data.barrio || provider.provider_barrios?.some(item => item.barrios?.slug === parsed.data.barrio);
      return categoryOK && barrioOK;
    });
    return NextResponse.json({providers: filtered});
  } catch {
    return NextResponse.json({error: 'Directory unavailable'}, {status: 503});
  }
}
