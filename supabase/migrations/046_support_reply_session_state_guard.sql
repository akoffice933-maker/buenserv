-- P0: a support-reply session must not let a customer write into an already-closed
-- request. Validate the request status (open/reviewing) under lock, and delete the
-- session when a request is closed so stale sessions cannot be reused.

create or replace function public.customer_reply_support_request(
  p_profile_id uuid,
  p_body text,
  p_external_source text,
  p_external_id text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_message_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if p_external_source is null or p_external_id is null then raise exception 'external_idempotency_required'; end if;
  if char_length(v_body) = 0 then raise exception 'message_body_required'; end if;
  if char_length(v_body) > 2000 then raise exception 'message_body_too_long'; end if;

  -- Require an active session AND an open/reviewing request, both under lock.
  select sr.id into v_request_id
  from support_requests sr
  join telegram_support_reply_sessions s on s.support_request_id = sr.id
  where s.profile_id = p_profile_id
    and s.expires_at > now()
    and sr.status in ('open', 'reviewing')
  for update of sr;
  if v_request_id is null then raise exception 'no_active_support_reply_session'; end if;

  select id into v_message_id
  from support_request_messages
  where external_source = p_external_source and external_id = p_external_id;
  if v_message_id is not null then return v_message_id; end if;

  insert into support_request_messages (support_request_id, sender_profile_id, sender_role, body, external_source, external_id)
  values (v_request_id, p_profile_id, 'customer', v_body, p_external_source, p_external_id)
  returning id into v_message_id;

  insert into audit_events (actor_profile_id, action, entity_type, entity_id, metadata)
  values (p_profile_id, 'customer_replied_support', 'support_request', v_request_id,
          jsonb_build_object('message_id', v_message_id));

  perform public.enqueue_admin_alert('admin_new_support_request', jsonb_build_object('support_request_id', v_request_id, 'body', left(v_body, 200)));

  return v_message_id;
exception when unique_violation then
  select id into v_message_id
  from support_request_messages
  where external_source = p_external_source and external_id = p_external_id;
  if v_message_id is not null then return v_message_id; end if;
  raise;
end;
$$;

-- When an admin closes a support request, drop any lingering reply session.
create or replace function public.admin_resolve_support_request(
  p_actor_profile_id uuid,
  p_request_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_actor_role text;
begin
  select role into v_actor_role from profiles where id = p_actor_profile_id;
  if v_actor_role not in ('admin', 'moderator', 'support') then raise exception 'permission_denied'; end if;
  update support_requests set status = 'closed', closed_at = now(), handled_by = p_actor_profile_id where id = p_request_id and status <> 'closed';
  if not found then raise exception 'request_not_found_or_already_closed'; end if;
  delete from telegram_support_reply_sessions where support_request_id = p_request_id;
end;
$$;

revoke all on function public.customer_reply_support_request(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_resolve_support_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.customer_reply_support_request(uuid, text, text, text) to service_role;
grant execute on function public.admin_resolve_support_request(uuid, uuid) to service_role;
