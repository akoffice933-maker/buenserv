-- Required for Supabase Auth / RBAC lookups through the cookie-backed anon client.
create policy "users can read own profile" on public.profiles
  for select using (auth.uid() = auth_user_id);
