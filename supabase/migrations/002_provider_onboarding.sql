-- Telegram provider onboarding and moderation queue.
create type public.onboarding_step as enum ('category','barrio','description','price','photo','confirm');

create table public.telegram_updates (
  update_id bigint primary key,
  received_at timestamptz not null default now()
);

create table public.provider_onboarding_sessions (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  step public.onboarding_step not null default 'category',
  draft jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.provider_onboarding_sessions enable row level security;
alter table public.telegram_updates enable row level security;

-- Service-role webhook is the only writer; no client-facing policy is created.
create index provider_onboarding_sessions_updated_at_idx on public.provider_onboarding_sessions(updated_at);
