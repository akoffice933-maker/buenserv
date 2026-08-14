-- Operational policy: a provider must have a real Telegram identity before being
-- approved, otherwise they can never receive lead notifications (Telegram 403 /
-- recipient_has_no_telegram_user_id). Guard this at the moderation RPC so an
-- approved provider is always reachable.

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
  v_telegram_user_id bigint;
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

  -- A provider cannot be approved without a real Telegram identity (they must have
  -- started the bot), otherwise lead notifications can never be delivered.
  if p_decision = 'approved' then
    select profiles.telegram_user_id into v_telegram_user_id
    from providers join profiles on profiles.id = providers.profile_id
    where providers.id = p_provider_id;
    if v_telegram_user_id is null then
      raise exception 'provider_requires_telegram_identity';
    end if;
  end if;

  update providers set status = p_decision, moderated_by = p_actor_profile_id, moderated_at = now(), moderation_reason = p_reason, updated_at = now() where id = p_provider_id;
  insert into audit_events (actor_profile_id, action, entity_type, entity_id, metadata)
  values (p_actor_profile_id, 'provider_moderated', 'provider', p_provider_id, jsonb_build_object('from', v_current, 'decision', p_decision, 'reason', p_reason));
end;
$$;

revoke all on function public.moderate_provider(uuid, uuid, public.provider_status, text) from public, anon, authenticated;
grant execute on function public.moderate_provider(uuid, uuid, public.provider_status, text) to service_role;
