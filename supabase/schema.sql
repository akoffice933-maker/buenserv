-- BuenServ MVP schema — apply with Supabase SQL Editor or migration tooling.
create extension if not exists pgcrypto;

create type public.user_role as enum ('customer','provider','moderator','admin','support');
create type public.provider_status as enum ('draft','pending','approved','suspended','rejected');
create type public.report_status as enum ('open','reviewing','resolved','dismissed');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint unique,
  role public.user_role not null default 'customer',
  display_name text,
  locale text not null default 'es-AR' check (locale in ('es-AR','ru','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.barrios (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_es text not null,
  name_ru text not null,
  name_en text not null,
  active boolean not null default true
);

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  slug text not null unique,
  status public.provider_status not null default 'draft',
  photo_path text,
  rating numeric(2,1) not null default 0,
  reviews_count integer not null default 0,
  accepts_usdt boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.provider_categories (
  provider_id uuid references public.providers(id) on delete cascade,
  category_id uuid references public.categories(id) on delete restrict,
  price_from_ars numeric(14,2),
  primary key (provider_id,category_id)
);

create table public.provider_barrios (
  provider_id uuid references public.providers(id) on delete cascade,
  barrio_id uuid references public.barrios(id) on delete restrict,
  primary key (provider_id,barrio_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 1200),
  locale text not null default 'es-AR',
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid references public.profiles(id) on delete set null,
  provider_id uuid references public.providers(id) on delete set null,
  reason text not null,
  details text,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Public directory is read-only. Write policies are enabled after Telegram/admin auth is implemented.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.barrios enable row level security;
alter table public.providers enable row level security;
alter table public.provider_categories enable row level security;
alter table public.provider_barrios enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.audit_events enable row level security;

create policy "public can read active categories" on public.categories for select using (active = true);
create policy "public can read active barrios" on public.barrios for select using (active = true);
create policy "public can read approved providers" on public.providers for select using (status = 'approved');
create policy "public can read published reviews" on public.reviews for select using (published = true);
