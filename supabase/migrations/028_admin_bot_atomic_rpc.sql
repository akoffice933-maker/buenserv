-- Atomic admin action token consumption with SELECT FOR UPDATE.
-- Prevents concurrent callbacks from consuming the same token twice.
create or replace function public.consume_admin_action_token(
  p_token text,
  p_profile_id uuid
) returns table (
  action_type text,
  entity_type text,
  entity_id text,
  payload jsonb
) language plpgsql security definer set search_path = public as $$
declare
  v_row record;
begin
  select a.* into v_row
  from admin_action_tokens a
  where a.token = p_token
  for update;

  if not found then
    raise exception 'token_not_found';
  end if;

  if v_row.consumed_at is not null then
    raise exception 'token_already_consumed';
  end if;

  if v_row.expires_at < now() then
    raise exception 'token_expired';
  end if;

  if v_row.issued_for_profile_id <> p_profile_id then
    raise exception 'token_not_issued_for_this_profile';
  end if;

  update admin_action_tokens
  set consumed_at = now()
  where id = v_row.id;

  return query
  select
    v_row.action_type,
    v_row.entity_type,
    v_row.entity_id,
    v_row.payload;
end;
$$;

revoke all on function public.consume_admin_action_token(text, uuid) from public, anon, authenticated;
grant execute on function public.consume_admin_action_token(text, uuid) to service_role;

-- Service-role RPCs for admin bot operations (audited, permissioned)
create or replace function public.admin_resolve_report(
  p_actor_profile_id uuid,
  p_report_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_actor_role text;
begin
  select role into v_actor_role from profiles where id = p_actor_profile_id;
  if v_actor_role not in ('admin', 'moderator') then raise exception 'permission_denied'; end if;
  update reports set status = 'resolved', updated_at = now() where id = p_report_id and status = 'open';
  if not found then raise exception 'report_not_found_or_already_resolved'; end if;
end;
$$;

create or replace function public.admin_suspend_provider(
  p_actor_profile_id uuid,
  p_provider_id uuid,
  p_reason text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_actor_role text;
begin
  select role into v_actor_role from profiles where id = p_actor_profile_id;
  if v_actor_role <> 'admin' then raise exception 'permission_denied'; end if;
  perform moderate_provider(p_actor_profile_id, p_provider_id, 'suspended', p_reason);
end;
$$;

create or replace function public.admin_take_support_request(
  p_actor_profile_id uuid,
  p_request_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_actor_role text;
begin
  select role into v_actor_role from profiles where id = p_actor_profile_id;
  if v_actor_role not in ('admin', 'moderator', 'support') then raise exception 'permission_denied'; end if;
  update support_requests set status = 'in_progress', updated_at = now() where id = p_request_id and status = 'open';
  if not found then raise exception 'request_not_found_or_already_in_progress'; end if;
end;
$$;

create or replace function public.admin_resolve_support_request(
  p_actor_profile_id uuid,
  p_request_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_actor_role text;
begin
  select role into v_actor_role from profiles where id = p_actor_profile_id;
  if v_actor_role not in ('admin', 'moderator', 'support') then raise exception 'permission_denied'; end if;
  update support_requests set status = 'resolved', updated_at = now() where id = p_request_id and status = 'open';
  if not found then raise exception 'request_not_found_or_already_resolved'; end if;
end;
$$;

create or replace function public.admin_retry_notification_outbox(
  p_actor_profile_id uuid
) returns integer language plpgsql security definer set search_path = public as $$
declare
  v_actor_role text;
  v_count integer;
begin
  select role into v_actor_role from profiles where id = p_actor_profile_id;
  if v_actor_role <> 'admin' then raise exception 'permission_denied'; end if;
  update notification_outbox
  set status = 'pending', locked_at = null, next_attempt_at = now(), updated_at = now()
  where status = 'permanently_failed';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_resolve_report(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_suspend_provider(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_take_support_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_resolve_support_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_retry_notification_outbox(uuid) from public, anon, authenticated;
grant execute on function public.consume_admin_action_token(text, uuid) to service_role;
grant execute on function public.admin_resolve_report(uuid, uuid) to service_role;
grant execute on function public.admin_suspend_provider(uuid, uuid, text) to service_role;
grant execute on function public.admin_take_support_request(uuid, uuid) to service_role;
grant execute on function public.admin_resolve_support_request(uuid, uuid) to service_role;
grant execute on function public.admin_retry_notification_outbox(uuid) to service_role;