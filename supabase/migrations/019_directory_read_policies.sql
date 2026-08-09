-- Public directory reads use the anon key and require explicit RLS policies for embedded relations.
create policy "public can read profiles of approved providers" on public.profiles
  for select using (
    exists (select 1 from public.providers where providers.profile_id = profiles.id and providers.status = 'approved')
  );

create policy "public can read categories of approved providers" on public.provider_categories
  for select using (
    exists (select 1 from public.providers where providers.id = provider_categories.provider_id and providers.status = 'approved')
  );

create policy "public can read barrios of approved providers" on public.provider_barrios
  for select using (
    exists (select 1 from public.providers where providers.id = provider_barrios.provider_id and providers.status = 'approved')
  );
