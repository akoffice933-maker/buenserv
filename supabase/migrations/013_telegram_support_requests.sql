-- Telegram-first support requests.
create type public.support_request_status as enum ('open', 'reviewing', 'closed');
create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  details text not null check (char_length(details) between 10 and 2000),
  status public.support_request_status not null default 'open',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create table public.telegram_support_sessions (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  updated_at timestamptz not null default now()
);
alter table public.support_requests enable row level security;
alter table public.telegram_support_sessions enable row level security;
