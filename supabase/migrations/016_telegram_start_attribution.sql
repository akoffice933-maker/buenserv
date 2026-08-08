-- Attribute Telegram deep-link starts to product entry payloads.
create table public.telegram_start_events (
  id uuid primary key default gen_random_uuid(),
  update_id bigint not null unique references public.telegram_updates(update_id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  payload text not null,
  created_at timestamptz not null default now()
);
alter table public.telegram_start_events enable row level security;
create index telegram_start_events_payload_idx on public.telegram_start_events(payload, created_at desc);
