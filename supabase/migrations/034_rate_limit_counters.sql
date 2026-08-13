-- Server-side rate limiting counters for public endpoints.
-- A basic guard; production should additionally use Vercel/edge rate limiting.

create table if not exists public.rate_limit_counters (
  key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rate_limit_counters enable row level security;
create index if not exists rate_limit_counters_window_idx on public.rate_limit_counters(window_start);

revoke all on table public.rate_limit_counters from public, anon, authenticated;
