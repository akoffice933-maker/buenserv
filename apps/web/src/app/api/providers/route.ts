import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {createPublicDirectoryClient} from '@/lib/supabase/public';
import {filterDirectoryProviders, type DirectoryProvider} from '@/lib/directory';

export const dynamic = 'force-dynamic';

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
    let query = supabase.from('providers').select('id,slug,photo_path,rating,reviews_count,accepts_usdt,profiles(display_name),provider_categories(price_from_ars,categories(slug)),provider_barrios(barrios(slug,name_es,name_ru,name_en))').eq('status', 'approved').order('rating', {ascending: false}).limit(parsed.data.limit);
    if (parsed.data.usdt === 'true') query = query.eq('accepts_usdt', true);
    const {data, error} = await query;
    if (error) return NextResponse.json({error: 'Directory unavailable'}, {status: 503});

    const rows = (data ?? []) as unknown as DirectoryProvider[];
    const filtered = filterDirectoryProviders(rows, {
      category: parsed.data.category,
      barrio: parsed.data.barrio,
      usdt: parsed.data.usdt === 'true'
    });
    return NextResponse.json({providers: filtered});
  } catch {
    return NextResponse.json({error: 'Directory unavailable'}, {status: 503});
  }
}
