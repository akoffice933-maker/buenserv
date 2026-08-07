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
