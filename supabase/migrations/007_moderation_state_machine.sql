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
