import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env';

type AdminUpdate = {update_id: number; message?: {text?: string; chat?: {id: number}; from?: {id: number}}};

async function send(env: ReturnType<typeof getServerEnv>, token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({chat_id: chatId, text, parse_mode: 'HTML'})
  });
}

async function requireAdmin(token: string, supabase: ReturnType<typeof createAdminClient>, telegramId: number):
  Promise<{profileId: string; role: string} | null> {
  const {data: profile} = await supabase.from('profiles').select('id,role').eq('telegram_user_id', telegramId).maybeSingle();
  if (!profile || !['admin', 'moderator'].includes(profile.role)) return null;
  return {profileId: profile.id, role: profile.role};
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const adminToken = env.TELEGRAM_ADMIN_BOT_TOKEN;
  if (!adminToken) return NextResponse.json({error: 'Admin bot not configured'}, {status: 503});

  let update: AdminUpdate;
  try { update = await request.json() as AdminUpdate; } catch { return NextResponse.json({error: 'Invalid JSON'}, {status: 400}); }

  const message = update.message;
  const chatId = message?.chat?.id;
  const user = message?.from;
  const text = message?.text?.trim() ?? '';
  if (!chatId || !user) return NextResponse.json({ok: true});

  const supabase = createAdminClient();
  const admin = await requireAdmin(adminToken, supabase, user.id);
  if (!admin) {
    await send(env, adminToken, chatId, '⛔ Access denied. You are not registered as an admin.');
    return NextResponse.json({ok: true});
  }

  // Parse command
  const parts = text.split(/\s+/);
  const cmd = parts[0]?.toLowerCase() ?? '';

  switch (cmd) {
    case '/start':
    case '/help': {
      const help = `<b>🔧 BuenServ Admin Bot</b>\n\n` +
        `/pending — pending providers\n` +
        `/approve <id> — approve provider\n` +
        `/reject <id> <reason> — reject provider\n` +
        `/reports — open reports\n` +
        `/support — open support requests`;
      await send(env, adminToken, chatId, help);
      break;
    }

    case '/pending': {
      const {data: providers} = await supabase
        .from('providers')
        .select('id,slug,profiles!providers_profile_id_fkey(display_name),created_at,provider_categories(price_from_ars,categories!provider_categories_category_id_fkey(slug)),provider_barrios(barrios!provider_barrios_barrio_id_fkey(slug,name_es,name_ru,name_en))')
        .eq('status', 'pending')
        .order('created_at', {ascending: false})
        .limit(10);

      if (!providers || providers.length === 0) {
        await send(env, adminToken, chatId, '✅ No pending providers.');
        break;
      }

      for (const p of providers) {
        const name = (p.profiles as unknown as {display_name?: string | null})?.display_name ?? p.slug;
        const cat = (p.provider_categories as unknown as Array<{price_from_ars?: number | null; categories?: {slug: string} | null}>)?.map(c => `${c.categories?.slug ?? '?'}${c.price_from_ars ? ` $${c.price_from_ars}` : ''}`).join(', ') ?? '';
        const barrio = (p.provider_barrios as unknown as Array<{barrios?: {name_es?: string} | null}>)?.map(b => b.barrios?.name_es ?? '').filter(Boolean).join(', ') ?? '';
        const created = new Date(p.created_at).toLocaleDateString('ru-RU');
        const msg = `<b>${escapeHtml(name)}</b> (${escapeHtml(p.slug)})\n📅 ${created}\n📍 ${escapeHtml(barrio)}\n📂 ${escapeHtml(cat)}\n<code>${p.id}</code>`;
        await send(env, adminToken, chatId, msg);
      }
      break;
    }

    case '/approve': {
      const providerId = parts[1];
      if (!providerId) {
        await send(env, adminToken, chatId, 'Usage: /approve <provider-id>');
        break;
      }
      const {error} = await supabase.rpc('moderate_provider', {
        p_actor_profile_id: admin.profileId,
        p_provider_id: providerId,
        p_decision: 'approved',
        p_reason: null
      });
      if (error) {
        await send(env, adminToken, chatId, `❌ Error: ${error.message}`);
      } else {
        await send(env, adminToken, chatId, `✅ Provider ${providerId.slice(0, 8)}... approved.`);
      }
      break;
    }

    case '/reject': {
      const providerId = parts[1];
      const reason = parts.slice(2).join(' ') || 'Not specified';
      if (!providerId) {
        await send(env, adminToken, chatId, 'Usage: /reject <provider-id> <reason>');
        break;
      }
      const {error} = await supabase.rpc('moderate_provider', {
        p_actor_profile_id: admin.profileId,
        p_provider_id: providerId,
        p_decision: 'rejected',
        p_reason: reason
      });
      if (error) {
        await send(env, adminToken, chatId, `❌ Error: ${error.message}`);
      } else {
        await send(env, adminToken, chatId, `❌ Provider ${providerId.slice(0, 8)}... rejected. Reason: ${escapeHtml(reason)}`);
      }
      break;
    }

    case '/reports': {
      const {data: reports} = await supabase
        .from('reports')
        .select('id,reason,details,status,created_at,providers!reports_provider_id_fkey(slug)')
        .eq('status', 'open')
        .order('created_at', {ascending: false})
        .limit(10);

      if (!reports || reports.length === 0) {
        await send(env, adminToken, chatId, '✅ No open reports.');
        break;
      }

      for (const r of reports) {
        const providerSlug = (r.providers as unknown as {slug?: string})?.slug ?? '?';
        const msg = `<b>Report</b> on ${escapeHtml(providerSlug)}\n📅 ${new Date(r.created_at).toLocaleDateString('ru-RU')}\n📌 ${escapeHtml(r.reason)}\n📝 ${escapeHtml((r.details ?? '').slice(0, 200))}\n<code>${r.id}</code>`;
        await send(env, adminToken, chatId, msg);
      }
      break;
    }

    case '/support': {
      const {data: requests} = await supabase
        .from('support_requests')
        .select('id,details,status,created_at,profiles!support_requests_profile_id_fkey(display_name)')
        .eq('status', 'open')
        .order('created_at', {ascending: false})
        .limit(10);

      if (!requests || requests.length === 0) {
        await send(env, adminToken, chatId, '✅ No open support requests.');
        break;
      }

      for (const r of requests) {
        const name = (r.profiles as unknown as {display_name?: string | null})?.display_name ?? '?';
        const msg = `<b>Support</b> from ${escapeHtml(name)}\n📅 ${new Date(r.created_at).toLocaleDateString('ru-RU')}\n📝 ${escapeHtml((r.details ?? '').slice(0, 200))}\n<code>${r.id}</code>`;
        await send(env, adminToken, chatId, msg);
      }
      break;
    }

    default:
      await send(env, adminToken, chatId, 'Unknown command. Use /help for available commands.');
  }

  return NextResponse.json({ok: true});
}