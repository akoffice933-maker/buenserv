-- Immutable lead facts complement the current-state leads table.
create type public.lead_event_type as enum ('created', 'customer_contacted', 'provider_notified', 'provider_opened', 'provider_replied', 'customer_replied', 'completed', 'cancelled', 'expired');
create type public.lead_actor_type as enum ('customer', 'provider', 'admin', 'system');

alter table public.leads add column if not exists external_source text;
alter table public.leads add column if not exists external_id text;
create unique index leads_external_source_id_unique on public.leads(external_source, external_id) where external_source is not null and external_id is not null;

create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  event_type public.lead_event_type not null,
  actor_type public.lead_actor_type not null default 'system',
  actor_profile_id uuid references public.profiles(id) on delete set null,
  external_source text,
  external_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.lead_events enable row level security;
create unique index lead_events_external_source_id_unique on public.lead_events(external_source, external_id) where external_source is not null and external_id is not null;
create index lead_events_lead_created_idx on public.lead_events(lead_id, created_at);
