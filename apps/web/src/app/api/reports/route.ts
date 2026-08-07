import {createHash} from 'node:crypto';
import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {createAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env';

export const dynamic = 'force-dynamic';

const reportSchema = z.object({providerId: z.string().uuid(), reason: z.enum(['profile_mismatch', 'no_response', 'spam', 'safety', 'other']), details: z.string().min(10).max(2000), website: z.string().max(0).optional()});

function reportKey(request: NextRequest, salt: string) {
  const ip = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({error: 'Invalid report'}, {status: 400});
  if (parsed.data.website) return NextResponse.json({ok: true}, {status: 201});
  const {error} = await createAdminClient().rpc('submit_public_report', {
    p_key_hash: reportKey(request, getServerEnv().REPORT_RATE_LIMIT_SALT),
    p_provider_id: parsed.data.providerId,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details
  });
  if (error?.message.includes('report_rate_limited')) return NextResponse.json({error: 'Too many reports'}, {status: 429});
  if (error?.message.includes('provider_not_found')) return NextResponse.json({error: 'Provider not found'}, {status: 404});
  if (error) return NextResponse.json({error: 'Report unavailable'}, {status: 503});
  return NextResponse.json({ok: true}, {status: 201});
}
