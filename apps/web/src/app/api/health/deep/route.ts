import {NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const {error} = await supabase.from('categories').select('id', {head: true, count: 'exact'}).limit(1);
    if (error) return NextResponse.json({status: 'unavailable', dependency: 'supabase'}, {status: 503});
    return NextResponse.json({status: 'ok', dependencies: {supabase: 'ok'}, timestamp: new Date().toISOString()});
  } catch {
    return NextResponse.json({status: 'unavailable', dependency: 'configuration'}, {status: 503});
  }
}
