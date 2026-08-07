import {NextResponse} from 'next/server';
import {createPublicDirectoryClient} from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createPublicDirectoryClient();
    const {data, error} = await supabase.from('categories').select('slug,sort_order').eq('active', true).order('sort_order');
    if (error) return NextResponse.json({error: 'Directory unavailable'}, {status: 503});
    return NextResponse.json({categories: data ?? []});
  } catch {
    return NextResponse.json({error: 'Directory unavailable'}, {status: 503});
  }
}
