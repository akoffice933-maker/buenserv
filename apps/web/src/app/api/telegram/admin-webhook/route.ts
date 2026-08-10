import {timingSafeEqual} from 'node:crypto';
import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env';

type AdminUpdate = {update_id: number; message?: {text?: string; chat?: {id: number}; from?: {id: number}}};

function secretsMatch(received: string | null, expected: string) {
  if (!received) return false;
  const left = Buffer.from(received); const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function send(token: string, chatId: number, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({chat_id: chatId, text, parse_mode: 'HTML'})});
  if (!response.ok) throw new Error(`Telegram admin send failed: ${response.status}`);
}

async function requireAdmin(supabase: ReturnType<typeof createAdminClient>, telegramId: number): Promise<{profileId: string; role: string} | null> {
  const {data: profile} = await supabase.from('profiles').select('id,role').eq('telegram_user_id', telegramId).maybeSingle();
  if (!profile || !['admin', 'moderator'].includes(profile.role)) return null;
  return {profileId: profile.id, role: profile.role};
}

function escapeHtml(text: string): string { return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

export async function POST(request: NextRequest) {
  const env = getServerEnv(); const adminToken = env.TELEGRAM_ADMIN_BOT_TOKEN; const secret = env.TELEGRAM_ADMIN_WEBHOOK_SECRET;
  if (!adminToken || !secret) return NextResponse.json({error: 'Admin bot not configured'}, {status: 503});
  if (!secretsMatch(request.headers.get('x-telegram-bot-api-secret-token'), secret)) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  let update: AdminUpdate; try { update = await request.json() as AdminUpdate; } catch { return NextResponse.json({error: 'Invalid JSON'}, {status: 400}); }
  const message = update.message; const chatId = message?.chat?.id; const user = message?.from; const text = message?.text?.trim() ?? '';
  if (!chatId || !user) return NextResponse.json({ok: true});
  const supabase = createAdminClient();
  const {data: existing, error: lookupError} = await supabase.from('admin_telegram_updates').select('processed_at').eq('update_id', update.update_id).maybeSingle();
  if (lookupError) return NextResponse.json({error: 'Temporary error'}, {status: 500});
  if (existing?.processed_at) return NextResponse.json({ok: true, duplicate: true});
  if (!existing) {
    const {error: insertError} = await supabase.from('admin_telegram_updates').insert({update_id: update.update_id});
    if (insertError?.code === '23505') return NextResponse.json({ok: true, duplicate: true});
    if (insertError) return NextResponse.json({error: 'Temporary error'}, {status: 500});
  }
  const markProcessed = () => supabase.from('admin_telegram_updates').update({processed_at: new Date().toISOString()}).eq('update_id', update.update_id);
  const admin = await requireAdmin(supabase, user.id);
  if (!admin) { await send(adminToken, chatId, '⛔ Access denied. You are not registered as an admin.'); await markProcessed(); return NextResponse.json({ok: true}); }

  const parts = text.split(/\s+/); const cmd = parts[0]?.toLowerCase() ?? '';
  switch (cmd) {
    case '/start': case '/help':
      await send(adminToken, chatId, `<b>🔧 BuenServ Admin Bot</b>\n\n/pending — pending providers\n/approve &lt;id&gt; — approve provider\n/reject &lt;id&gt; &lt;reason&gt; — reject provider\n/reports — open reports\n/support — open support requests`);
      break;
    case '/pending': {
      const {data: providers} = await supabase.from('providers').select('id,slug,profiles!providers_profile_id_fkey(display_name),created_at,provider_categories(price_from_ars,categories!provider_categories_category_id_fkey(slug)),provider_barrios(barrios!provider_barrios_barrio_id_fkey(slug,name_es,name_ru,name_en))').eq('status', 'pending').order('created_at', {ascending: false}).limit(10);
      if (!providers?.length) { await send(adminToken, chatId, '✅ No pending providers.'); break; }
      for (const p of providers) { const name = (p.profiles as unknown as {display_name?: string | null})?.display_name ?? p.slug; const cat = (p.provider_categories as unknown as Array<{price_from_ars?: number | null; categories?: {slug: string} | null}>)?.map(c => `${c.categories?.slug ?? '?'}${c.price_from_ars ? ` $${c.price_from_ars}` : ''}`).join(', ') ?? ''; const barrio = (p.provider_barrios as unknown as Array<{barrios?: {name_es?: string} | null}>)?.map(b => b.barrios?.name_es ?? '').filter(Boolean).join(', ') ?? ''; await send(adminToken, chatId, `<b>${escapeHtml(name)}</b> (${escapeHtml(p.slug)})\n📅 ${new Date(p.created_at).toLocaleDateString('ru-RU')}\n📍 ${escapeHtml(barrio)}\n📂 ${escapeHtml(cat)}\n<code>${p.id}</code>`); }
      break;
    }
    case '/approve': case '/reject': {
      const providerId = parts[1]; const rejecting = cmd === '/reject'; const reason = parts.slice(2).join(' ');
      if (!providerId || (rejecting && !reason)) { await send(adminToken, chatId, rejecting ? 'Usage: /reject <provider-id> <reason>' : 'Usage: /approve <provider-id>'); break; }
      const {error} = await supabase.rpc('moderate_provider', {p_actor_profile_id: admin.profileId, p_provider_id: providerId, p_decision: rejecting ? 'rejected' : 'approved', p_reason: rejecting ? reason : null});
      await send(adminToken, chatId, error ? `❌ Error: ${escapeHtml(error.message)}` : rejecting ? `❌ Provider ${providerId.slice(0, 8)}... rejected. Reason: ${escapeHtml(reason)}` : `✅ Provider ${providerId.slice(0, 8)}... approved.`);
      break;
    }
    case '/reports': {
      const {data: reports} = await supabase.from('reports').select('id,reason,details,status,created_at,providers!reports_provider_id_fkey(slug)').eq('status', 'open').order('created_at', {ascending: false}).limit(10);
      if (!reports?.length) { await send(adminToken, chatId, '✅ No open reports.'); break; }
      for (const r of reports) { const slug = (r.providers as unknown as {slug?: string})?.slug ?? '?'; await send(adminToken, chatId, `<b>Report</b> on ${escapeHtml(slug)}\n📅 ${new Date(r.created_at).toLocaleDateString('ru-RU')}\n📌 ${escapeHtml(r.reason)}\n📝 ${escapeHtml((r.details ?? '').slice(0, 200))}\n<code>${r.id}</code>`); }
      break;
    }
    case '/support': {
      const {data: requests} = await supabase.from('support_requests').select('id,details,status,created_at,profiles!support_requests_profile_id_fkey(display_name)').eq('status', 'open').order('created_at', {ascending: false}).limit(10);
      if (!requests?.length) { await send(adminToken, chatId, '✅ No open support requests.'); break; }
      for (const r of requests) { const name = (r.profiles as unknown as {display_name?: string | null})?.display_name ?? '?'; await send(adminToken, chatId, `<b>Support</b> from ${escapeHtml(name)}\n📅 ${new Date(r.created_at).toLocaleDateString('ru-RU')}\n📝 ${escapeHtml((r.details ?? '').slice(0, 200))}\n<code>${r.id}</code>`); }
      break;
    }
    default: await send(adminToken, chatId, 'Unknown command. Use /help for available commands.');
  }
  await markProcessed();
  return NextResponse.json({ok: true});
}
