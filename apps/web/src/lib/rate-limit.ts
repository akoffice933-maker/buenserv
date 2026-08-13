import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';

/**
 * Simple server-side rate limiter backed by Supabase. Uses a per-key counter
 * table with a sliding window. This is a basic guard for public endpoints;
 * a production deployment should additionally use Vercel/edge rate limiting.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{allowed: boolean; retryAfterSeconds?: number}> {
  const supabase = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  // Delete expired windows opportunistically.
  await supabase.from('rate_limit_counters').delete().lt('window_start', windowStart.toISOString());

  const {data: row, error} = await supabase
    .from('rate_limit_counters')
    .select('count, window_start')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    // Fail open on infra errors so a rate-limit outage never blocks the product.
    return {allowed: true};
  }

  if (!row) {
    await supabase.from('rate_limit_counters').insert({key, count: 1, window_start: now.toISOString()});
    return {allowed: true};
  }

  // If the window has rolled over, reset the counter.
  if (new Date(row.window_start) < windowStart) {
    await supabase.from('rate_limit_counters').update({count: 1, window_start: now.toISOString()}).eq('key', key);
    return {allowed: true};
  }

  if (row.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((new Date(row.window_start).getTime() + windowSeconds * 1000 - now.getTime()) / 1000));
    return {allowed: false, retryAfterSeconds};
  }

  await supabase.from('rate_limit_counters').update({count: row.count + 1}).eq('key', key);
  return {allowed: true};
}
