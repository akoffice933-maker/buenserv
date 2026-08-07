import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {createAdminClient} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const reportSchema = z.object({
  providerId: z.string().uuid(),
  reason: z.enum(['profile_mismatch', 'no_response', 'spam', 'safety', 'other']),
  details: z.string().min(10).max(2000),
  website: z.string().max(0).optional()
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({error: 'Invalid report'}, {status: 400});
  if (parsed.data.website) return NextResponse.json({ok: true});

  const supabase = createAdminClient();
  const {data: provider, error: providerError} = await supabase.from('providers').select('id').eq('id', parsed.data.providerId).eq('status', 'approved').maybeSingle();
  if (providerError || !provider) return NextResponse.json({error: 'Provider not found'}, {status: 404});
  const {error} = await supabase.from('reports').insert({provider_id: provider.id, reason: parsed.data.reason, details: parsed.data.details, status: 'open'});
  if (error) return NextResponse.json({error: 'Report unavailable'}, {status: 503});
  return NextResponse.json({ok: true}, {status: 201});
}
