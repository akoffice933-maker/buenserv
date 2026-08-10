-- Marketplace lead foundation. Leads are created only when a provider-contact flow is implemented.
create type public.lead_status as enum ('created', 'contacted', 'provider_replied', 'success', 'no_response', 'cancelled');

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid references public.profiles(id) on delete set null,
  provider_id uuid not null references public.providers(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  barrio_id uuid references public.barrios(id) on delete set null,
  source text not null default 'telegram',
  source_detail text,
  status public.lead_status not null default 'created',
  telegram_started_at timestamptz,
  provider_contacted_at timestamptz,
  provider_replied_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.leads enable row level security;
create index leads_provider_created_idx on public.leads(provider_id, created_at desc);
create index leads_customer_created_idx on public.leads(customer_profile_id, created_at desc);
create index leads_status_created_idx on public.leads(status, created_at desc);
