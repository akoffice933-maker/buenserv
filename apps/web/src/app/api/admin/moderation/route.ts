import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdminActor, isResponse} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {normalizeModerationProviders} from '@/lib/moderation';
import {getServerEnv} from '@/lib/env';
import {onboardingText, sendTelegramMessage, type BotLocale} from '@/lib/telegram/provider-onboarding';

export const dynamic = 'force-dynamic';

const decisionSchema = z.object({providerId: z.string().uuid(), decision: z.enum(['approved', 'rejected', 'suspended']), reason: z.string().max(1000).optional()}).superRefine((value, context) => {
  if ((value.decision === 'rejected' || value.decision === 'suspended') && !value.reason?.trim()) context.addIssue({code: 'custom', message: 'Reason is required'});
});

export async function GET() {
  const actor = await requireAdminActor();
  if (isResponse(actor)) return actor;
  const {data, error} = await createAdminClient().from('providers').select('id,slug,status,bio,onboarding_payload,created_at,profiles(display_name,telegram_user_id),provider_categories(price_from_ars,categories(slug)),provider_barrios(barrios(slug,name_es,name_ru,name_en))').eq('status', 'pending').order('created_at');
  if (error) return NextResponse.json({error: 'Moderation queue unavailable'}, {status: 503});
  return NextResponse.json({providers: normalizeModerationProviders(data ?? [])});
}

export async function PATCH(request: NextRequest) {
  const actor = await requireAdminActor();
  if (isResponse(actor)) return actor;
  if (actor.role === 'support') return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const input = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({error: 'Invalid moderation request'}, {status: 400});
  const admin = createAdminClient();
  const {data: target, error: targetError} = await admin.from('providers').select('profiles(telegram_user_id,locale)').eq('id', input.data.providerId).single();
  if (targetError || !target) return NextResponse.json({error: 'Provider not found'}, {status: 404});
  const {error} = await admin.rpc('moderate_provider', {
    p_provider_id: input.data.providerId,
    p_actor_profile_id: actor.profileId,
    p_decision: input.data.decision,
    p_reason: input.data.reason ?? null
  });
  if (error) return NextResponse.json({error: 'Moderation update failed'}, {status: 503});

  const profile = (Array.isArray(target.profiles) ? target.profiles[0] : target.profiles) as {telegram_user_id?: number; locale?: string} | null;
  let notification: 'sent' | 'skipped' | 'failed' = 'skipped';
  if (profile?.telegram_user_id) {
    const locale: BotLocale = profile.locale === 'ru' ? 'ru' : profile.locale === 'en' ? 'en' : 'es-AR';
    const base = onboardingText(locale, input.data.decision);
    const reason = input.data.decision !== 'approved' && input.data.reason ? `\n\n${input.data.reason}` : '';
    try { await sendTelegramMessage(getServerEnv(), profile.telegram_user_id, `${base}${reason}`); notification = 'sent'; } catch { notification = 'failed'; }
  }
  return NextResponse.json({ok: true, notification});
}
