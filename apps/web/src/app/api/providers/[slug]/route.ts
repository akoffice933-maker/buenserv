import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {getApprovedProviderBySlug} from '@/lib/provider-query';

const paramsSchema = z.object({slug: z.string().regex(/^[a-z0-9-]+$/).max(120)});
export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, {params}: {params: Promise<{slug: string}>}) {
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) return NextResponse.json({error: 'Invalid provider slug'}, {status: 400});
  try {
    const provider = await getApprovedProviderBySlug(parsed.data.slug);
    if (!provider) return NextResponse.json({error: 'Not found'}, {status: 404});
    return NextResponse.json({provider});
  } catch { return NextResponse.json({error: 'Directory unavailable'}, {status: 503}); }
}
