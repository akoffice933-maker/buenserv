-- Authenticated Telegram report flow, linked to reporter_profile_id.
create type public.report_step as enum ('reason','details');
create table public.telegram_report_sessions (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  step public.report_step not null default 'reason',
  reason text,
  updated_at timestamptz not null default now()
);
alter table public.telegram_report_sessions enable row level security;
