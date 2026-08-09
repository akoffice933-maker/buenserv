-- BuenServ Supabase staging bootstrap
-- Generated from schema.sql, seed.sql and ordered migrations.
-- Apply once to a fresh staging project via Supabase SQL Editor.

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

-- Development / soft-launch seed data. Replace provider names, photos and reviews with consented, moderated data before production.
insert into public.categories (id, slug, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'limpieza', 1),
  ('10000000-0000-0000-0000-000000000002', 'reparaciones', 2),
  ('10000000-0000-0000-0000-000000000003', 'mascotas', 3),
  ('10000000-0000-0000-0000-000000000004', 'mudanzas', 4),
  ('10000000-0000-0000-0000-000000000005', 'clases', 5),
  ('10000000-0000-0000-0000-000000000006', 'mensajeria', 6),
  ('10000000-0000-0000-0000-000000000007', 'taxi-traslados', 7)
on conflict (slug) do nothing;

insert into public.barrios (id, slug, name_es, name_ru, name_en) values
  ('20000000-0000-0000-0000-000000000001', 'palermo', 'Palermo', 'Палермо', 'Palermo'),
  ('20000000-0000-0000-0000-000000000002', 'recoleta', 'Recoleta', 'Реколета', 'Recoleta'),
  ('20000000-0000-0000-0000-000000000003', 'belgrano', 'Belgrano', 'Бельграно', 'Belgrano'),
  ('20000000-0000-0000-0000-000000000004', 'caballito', 'Caballito', 'Кабальито', 'Caballito')
on conflict (slug) do nothing;

-- Note: seed profiles are intentionally omitted. Provider creation must go through
-- the moderated Telegram onboarding flow once it is enabled.

-- BEGIN supabase/migrations/002_provider_onboarding.sql
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
-- END supabase/migrations/002_provider_onboarding.sql

-- BEGIN supabase/migrations/003_provider_submission.sql
-- Persist the moderated provider submission after Telegram onboarding confirmation.
alter table public.providers add column if not exists bio text;
alter table public.providers add column if not exists onboarding_payload jsonb not null default '{}'::jsonb;

alter table public.providers add constraint providers_bio_length check (bio is null or char_length(bio) between 20 and 800);
-- END supabase/migrations/003_provider_submission.sql

-- BEGIN supabase/migrations/004_atomic_provider_submission.sql
-- Atomic provider submission. All provider, category and barrio mutations succeed or fail together.
alter table public.telegram_updates add column if not exists processed_at timestamptz;

create or replace function public.submit_provider(
  p_profile_id uuid,
  p_telegram_id bigint,
  p_display_name text,
  p_category_slug text,
  p_barrio_slug text,
  p_description text,
  p_price_from_ars numeric,
  p_telegram_photo_file_id text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_id uuid;
  v_barrio_id uuid;
  v_provider_id uuid;
  v_slug text;
begin
  select id into v_category_id from categories where slug = p_category_slug and active = true;
  if v_category_id is null then raise exception 'Unknown active category'; end if;
  select id into v_barrio_id from barrios where slug = p_barrio_slug and active = true;
  if v_barrio_id is null then raise exception 'Unknown active barrio'; end if;
  if char_length(p_description) < 20 or char_length(p_description) > 800 then raise exception 'Invalid bio length'; end if;
  if p_price_from_ars <= 0 then raise exception 'Invalid price'; end if;

  v_slug := coalesce(nullif(regexp_replace(lower(p_display_name), '[^a-z0-9]+', '-', 'g'), ''), 'provider') || '-' || p_telegram_id::text;
  v_slug := trim(both '-' from v_slug);

  insert into providers (profile_id, slug, status, bio, photo_path, onboarding_payload)
  values (p_profile_id, v_slug, 'pending', p_description, null, jsonb_build_object('telegram_photo_file_id', p_telegram_photo_file_id))
  on conflict (profile_id) do update set
    slug = excluded.slug,
    status = 'pending',
    bio = excluded.bio,
    photo_path = null,
    onboarding_payload = excluded.onboarding_payload,
    updated_at = now()
  returning id into v_provider_id;

  delete from provider_categories where provider_id = v_provider_id;
  delete from provider_barrios where provider_id = v_provider_id;
  insert into provider_categories (provider_id, category_id, price_from_ars) values (v_provider_id, v_category_id, p_price_from_ars);
  insert into provider_barrios (provider_id, barrio_id) values (v_provider_id, v_barrio_id);
  return v_provider_id;
end;
$$;
-- END supabase/migrations/004_atomic_provider_submission.sql

-- BEGIN supabase/migrations/005_admin_moderation.sql
-- Link internal Supabase Auth users to BuenServ roles and retain moderation decisions.
alter table public.profiles add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;
alter table public.providers add column if not exists moderated_by uuid references public.profiles(id) on delete set null;
alter table public.providers add column if not exists moderated_at timestamptz;
alter table public.providers add column if not exists moderation_reason text;

create or replace function public.moderate_provider(
  p_provider_id uuid,
  p_actor_profile_id uuid,
  p_decision public.provider_status,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_decision not in ('approved', 'rejected', 'suspended') then raise exception 'Invalid moderation decision'; end if;
  update providers set status = p_decision, moderated_by = p_actor_profile_id, moderated_at = now(), moderation_reason = p_reason, updated_at = now() where id = p_provider_id;
  if not found then raise exception 'Provider not found'; end if;
  insert into audit_events (actor_profile_id, action, entity_type, entity_id, metadata)
  values (p_actor_profile_id, 'provider_moderated', 'provider', p_provider_id, jsonb_build_object('decision', p_decision, 'reason', p_reason));
end;
$$;
-- END supabase/migrations/005_admin_moderation.sql

-- BEGIN supabase/migrations/006_profile_self_read_policy.sql
-- Required for Supabase Auth / RBAC lookups through the cookie-backed anon client.
create policy "users can read own profile" on public.profiles
  for select using (auth.uid() = auth_user_id);
-- END supabase/migrations/006_profile_self_read_policy.sql

-- BEGIN supabase/migrations/007_moderation_state_machine.sql
-- Guard moderation transitions even when RPC is called outside the dashboard UI.
create or replace function public.moderate_provider(
  p_provider_id uuid,
  p_actor_profile_id uuid,
  p_decision public.provider_status,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.provider_status;
begin
  select status into v_current from providers where id = p_provider_id for update;
  if v_current is null then raise exception 'Provider not found'; end if;
  if p_decision not in ('approved', 'rejected', 'suspended') then raise exception 'Invalid moderation decision'; end if;
  if (p_decision = 'rejected' or p_decision = 'suspended') and coalesce(nullif(trim(p_reason), ''), '') = '' then raise exception 'Moderation reason required'; end if;
  if not (
    (v_current = 'pending' and p_decision in ('approved', 'rejected')) or
    (v_current = 'approved' and p_decision = 'suspended') or
    (v_current = 'suspended' and p_decision = 'approved')
  ) then raise exception 'Invalid provider status transition: % -> %', v_current, p_decision; end if;

  update providers set status = p_decision, moderated_by = p_actor_profile_id, moderated_at = now(), moderation_reason = p_reason, updated_at = now() where id = p_provider_id;
  insert into audit_events (actor_profile_id, action, entity_type, entity_id, metadata)
  values (p_actor_profile_id, 'provider_moderated', 'provider', p_provider_id, jsonb_build_object('from', v_current, 'decision', p_decision, 'reason', p_reason));
end;
$$;
-- END supabase/migrations/007_moderation_state_machine.sql

-- BEGIN supabase/migrations/008_public_report_rate_limit.sql
-- Anonymous web reports are rate-limited and never auto-moderate a provider.
create table public.report_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null default now(),
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now()
);
alter table public.report_rate_limits enable row level security;

create or replace function public.submit_public_report(
  p_key_hash text,
  p_provider_id uuid,
  p_reason text,
  p_details text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit report_rate_limits%rowtype;
  v_report_id uuid;
begin
  select * into v_limit from report_rate_limits where key_hash = p_key_hash for update;
  if not found then
    insert into report_rate_limits (key_hash, count) values (p_key_hash, 1);
  elsif now() - v_limit.window_started_at < interval '1 hour' then
    if v_limit.count >= 3 then raise exception 'report_rate_limited'; end if;
    update report_rate_limits set count = count + 1, updated_at = now() where key_hash = p_key_hash;
  else
    update report_rate_limits set window_started_at = now(), count = 1, updated_at = now() where key_hash = p_key_hash;
  end if;

  if not exists (select 1 from providers where id = p_provider_id and status = 'approved') then raise exception 'provider_not_found'; end if;
  insert into reports (provider_id, reason, details, status) values (p_provider_id, p_reason, p_details, 'open') returning id into v_report_id;
  return v_report_id;
end;
$$;
-- END supabase/migrations/008_public_report_rate_limit.sql

-- BEGIN supabase/migrations/009_telegram_report_flow.sql
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
-- END supabase/migrations/009_telegram_report_flow.sql

-- BEGIN supabase/migrations/010_authenticated_report_rate_limit.sql
-- Telegram-authenticated reports are attributed and rate-limited per reporter profile.
create or replace function public.submit_authenticated_report(
  p_reporter_profile_id uuid,
  p_provider_id uuid,
  p_reason text,
  p_details text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id uuid;
  v_recent_count integer;
begin
  -- Serialise report creation for one authenticated profile.
  perform 1 from profiles where id = p_reporter_profile_id for update;
  if not found then raise exception 'reporter_not_found'; end if;
  select count(*) into v_recent_count from reports where reporter_profile_id = p_reporter_profile_id and created_at > now() - interval '1 hour';
  if v_recent_count >= 5 then raise exception 'report_rate_limited'; end if;
  if not exists (select 1 from providers where id = p_provider_id and status = 'approved') then raise exception 'provider_not_found'; end if;
  if exists (select 1 from providers where id = p_provider_id and profile_id = p_reporter_profile_id) then raise exception 'self_report_forbidden'; end if;
  insert into reports (provider_id, reporter_profile_id, reason, details, status)
  values (p_provider_id, p_reporter_profile_id, p_reason, p_details, 'open')
  returning id into v_report_id;
  return v_report_id;
end;
$$;
-- END supabase/migrations/010_authenticated_report_rate_limit.sql

-- BEGIN supabase/migrations/011_report_moderation.sql
-- Report moderation audit trail.
alter table public.reports add column if not exists resolved_by uuid references public.profiles(id) on delete set null;
alter table public.reports add column if not exists resolution_note text;

create or replace function public.resolve_report(
  p_report_id uuid,
  p_actor_profile_id uuid,
  p_status public.report_status,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('reviewing', 'resolved', 'dismissed') then raise exception 'Invalid report status'; end if;
  update reports set status = p_status, resolved_by = case when p_status in ('resolved', 'dismissed') then p_actor_profile_id else null end, resolved_at = case when p_status in ('resolved', 'dismissed') then now() else null end, resolution_note = p_note where id = p_report_id and status <> 'dismissed' and status <> 'resolved';
  if not found then raise exception 'Report not found or already closed'; end if;
  insert into audit_events (actor_profile_id, action, entity_type, entity_id, metadata)
  values (p_actor_profile_id, 'report_status_updated', 'report', p_report_id, jsonb_build_object('status', p_status, 'note', p_note));
end;
$$;
-- END supabase/migrations/011_report_moderation.sql

-- BEGIN supabase/migrations/012_private_provider_photo_storage.sql
-- Private provider image storage preparation. No public bucket or direct browser upload policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('provider-photos', 'provider-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create type public.provider_photo_status as enum ('pending', 'approved', 'rejected');
create table public.provider_photos (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  storage_path text not null unique,
  status public.provider_photo_status not null default 'pending',
  source text not null check (source in ('telegram', 'admin')),
  created_at timestamptz not null default now(),
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  rejection_reason text
);
alter table public.provider_photos enable row level security;
create index provider_photos_provider_status_idx on public.provider_photos(provider_id, status);

-- Storage object access intentionally has no public or client upload policy.
-- Service-role image workers will create validated variants; moderation grants public use later.
-- END supabase/migrations/012_private_provider_photo_storage.sql

-- BEGIN supabase/migrations/013_telegram_support_requests.sql
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
-- END supabase/migrations/013_telegram_support_requests.sql

-- BEGIN supabase/migrations/014_support_request_moderation.sql
-- Internal support request handling.
alter table public.support_requests add column if not exists handled_by uuid references public.profiles(id) on delete set null;
alter table public.support_requests add column if not exists resolution_note text;

create or replace function public.resolve_support_request(
  p_request_id uuid,
  p_actor_profile_id uuid,
  p_status public.support_request_status,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('reviewing', 'closed') then raise exception 'Invalid support status'; end if;
  update support_requests set status = p_status, handled_by = case when p_status = 'closed' then p_actor_profile_id else null end, closed_at = case when p_status = 'closed' then now() else null end, resolution_note = p_note where id = p_request_id and status <> 'closed';
  if not found then raise exception 'Support request not found or already closed'; end if;
  insert into audit_events (actor_profile_id, action, entity_type, entity_id, metadata)
  values (p_actor_profile_id, 'support_status_updated', 'support_request', p_request_id, jsonb_build_object('status', p_status, 'note', p_note));
end;
$$;
-- END supabase/migrations/014_support_request_moderation.sql

-- BEGIN supabase/migrations/015_support_request_rate_limit.sql
-- Authenticated Telegram support requests are rate-limited per profile.
create or replace function public.submit_support_request(
  p_profile_id uuid,
  p_details text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_count integer;
  v_request_id uuid;
begin
  perform 1 from profiles where id = p_profile_id for update;
  if not found then raise exception 'profile_not_found'; end if;
  select count(*) into v_recent_count from support_requests where profile_id = p_profile_id and created_at > now() - interval '1 hour';
  if v_recent_count >= 5 then raise exception 'support_rate_limited'; end if;
  if char_length(p_details) < 10 or char_length(p_details) > 2000 then raise exception 'invalid_support_details'; end if;
  insert into support_requests (profile_id, details, status) values (p_profile_id, p_details, 'open') returning id into v_request_id;
  return v_request_id;
end;
$$;
-- END supabase/migrations/015_support_request_rate_limit.sql

-- BEGIN supabase/migrations/016_telegram_start_attribution.sql
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
-- END supabase/migrations/016_telegram_start_attribution.sql

-- BEGIN supabase/migrations/017_billing_trial_foundation.sql
-- Billing/trial data foundation. No payment collection or automatic charging is enabled by this migration.
create type public.billing_trial_status as enum ('draft', 'active', 'paused', 'ended', 'cancelled');
create type public.billing_event_type as enum ('trial_started', 'trial_ended', 'subscription_created', 'subscription_cancelled', 'invoice_created', 'payment_confirmed', 'refund_issued');

create table public.provider_billing_trials (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null unique references public.providers(id) on delete cascade,
  offer_version text not null,
  status public.billing_trial_status not null default 'draft',
  started_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'active' and started_at is not null and ends_at is not null) or status <> 'active'),
  check (ends_at is null or started_at is null or ends_at > started_at)
);

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  trial_id uuid references public.provider_billing_trials(id) on delete set null,
  event_type public.billing_event_type not null,
  amount_ars numeric(14,2),
  external_reference text unique,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.provider_billing_trials enable row level security;
alter table public.billing_events enable row level security;
create index billing_events_provider_created_idx on public.billing_events(provider_id, created_at desc);
-- END supabase/migrations/017_billing_trial_foundation.sql

-- BEGIN supabase/migrations/018_restrict_security_definer_rpc.sql
-- Security-definer RPCs are invoked only from server-side service-role clients.
revoke all on function public.submit_provider(uuid, bigint, text, text, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.submit_provider(uuid, bigint, text, text, text, text, numeric, text) to service_role;

revoke all on function public.moderate_provider(uuid, uuid, public.provider_status, text) from public, anon, authenticated;
grant execute on function public.moderate_provider(uuid, uuid, public.provider_status, text) to service_role;

revoke all on function public.resolve_report(uuid, uuid, public.report_status, text) from public, anon, authenticated;
grant execute on function public.resolve_report(uuid, uuid, public.report_status, text) to service_role;

revoke all on function public.submit_public_report(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_public_report(text, uuid, text, text) to service_role;

revoke all on function public.submit_authenticated_report(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_authenticated_report(uuid, uuid, text, text) to service_role;

revoke all on function public.submit_support_request(uuid, text) from public, anon, authenticated;
grant execute on function public.submit_support_request(uuid, text) to service_role;

revoke all on function public.resolve_support_request(uuid, uuid, public.support_request_status, text) from public, anon, authenticated;
grant execute on function public.resolve_support_request(uuid, uuid, public.support_request_status, text) to service_role;
-- END supabase/migrations/018_restrict_security_definer_rpc.sql
