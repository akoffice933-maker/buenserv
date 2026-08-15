import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {createAdminClient} from '@/lib/supabase/admin';
import {getMiniAppInitData, resolveMiniAppIdentity} from '@/lib/telegram/mini-app-auth';

const localeSchema = z.object({locale: z.enum(['es-AR', 'ru', 'en'])});

export async function POST(request: NextRequest) {
  try {
    // Write route: shorter freshness window.
    const identity = await resolveMiniAppIdentity(getMiniAppInitData(request), 600);
    if (!identity) return NextResponse.json({error: 'Mini App profile not found'}, {status: 404});

    const parsed = localeSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({error: 'Invalid locale'}, {status: 400});

    const supabase = createAdminClient();
    const {error} = await supabase
      .from('profiles')
      .update({locale: parsed.data.locale, updated_at: new Date().toISOString()})
      .eq('id', identity.profileId);
    if (error) throw error;

    return NextResponse.json({ok: true, locale: parsed.data.locale});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update locale';
    const status = message.includes('init data') || message.includes('signature') ? 401 : 500;
    return NextResponse.json({error: status === 401 ? 'Invalid Telegram Mini App session' : 'Unable to update locale'}, {status});
  }
}
