import {NextRequest, NextResponse} from 'next/server';
import {getServerEnv} from '@/lib/env';
import {deliverOutboxBatch} from '@/lib/telegram/deliver-outbox';

export const runtime = 'nodejs';

const AUTH_HEADER = 'authorization';

function timingSafeEqualString(a: string, b: string) {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const auth = request.headers.get(AUTH_HEADER) ?? '';
  if (!auth.startsWith('Bearer ')) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const token = auth.slice(7).trim();
  if (!token || !timingSafeEqualString(token, env.CRON_SECRET)) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  try {
    const batchSize = Number(request.nextUrl.searchParams.get('batchSize') ?? '20');
    const {claimed, sent} = await deliverOutboxBatch(batchSize);
    return NextResponse.json({ok: true, claimed, sent});
  } catch {
    return NextResponse.json({error: 'Unable to deliver outbox'}, {status: 500});
  }
}
