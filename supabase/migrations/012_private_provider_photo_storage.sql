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
