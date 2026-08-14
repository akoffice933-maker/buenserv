import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';

/**
 * Server-side atomic rate limiter backed by the service-role RPC consume_rate_limit,
 * which locks/upserts the counter, checks the sliding window, and increments in a
 * single transaction. A production deployment should additionally use Vercel/edge
 * rate limiting.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{allowed: boolean; retryAfterSeconds?: number}> {
  const supabase = createAdminClient();
  const {data, error} = await supabase.rpc('consume_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds
  });

  if (error) {
    // Fail open on infra errors so a rate-limit outage never blocks the product.
    return {allowed: true};
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return {allowed: true};
  return {allowed: !!row.allowed, retryAfterSeconds: row.retry_after_seconds ?? undefined};
}
