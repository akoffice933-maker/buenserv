-- P1: atomic rate limit consumption. A single service-role RPC locks/upserts the
-- counter, checks the window, and increments — all in one transaction, eliminating
-- the read-then-write race in the previous best-effort client-side limiter.

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_key is null or p_key = '' then raise exception 'key_required'; end if;
  if p_limit is null or p_limit < 1 then raise exception 'limit_required'; end if;
  if p_window_seconds is null or p_window_seconds < 1 then raise exception 'window_required'; end if;

  v_window_start := v_now - make_interval(secs => p_window_seconds);

  -- Atomically lock the counter row (or create it).
  insert into rate_limit_counters (key, count, window_start, updated_at)
  values (p_key, 1, v_now, v_now)
  on conflict (key) do update set
    count = case
      when rate_limit_counters.window_start < v_window_start then 1
      else rate_limit_counters.count + 1
    end,
    window_start = case
      when rate_limit_counters.window_start < v_window_start then v_now
      else rate_limit_counters.window_start
    end,
    updated_at = v_now
  returning (case
      when rate_limit_counters.window_start < v_window_start then 1
      else rate_limit_counters.count + 1
    end), (case
      when rate_limit_counters.window_start < v_window_start then v_now
      else rate_limit_counters.window_start
    end)
  into v_count, v_window_start;

  -- v_window_start now holds the counter's window start after the upsert.
  if v_count <= p_limit then
    return query select true, 0;
  else
    return query select false, greatest(1, ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - v_now)))::integer);
  end if;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
