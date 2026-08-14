-- Customer can continue the support thread: when a customer writes to the bot and
-- has an open support request, the message is appended to support_request_messages
-- and an admin alert is enqueued so support staff can reply.

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

  -- Find the customer's most recent open support request.
  select id into v_request_id
  from support_requests
  where profile_id = p_profile_id and status in ('open', 'reviewing')
  order by created_at desc
  limit 1
  for update;

  if v_request_id is null then raise exception 'no_open_support_request'; end if;

  select id into v_message_id
  from support_request_messages
  where external_source = p_external_source and external_id = p_external_id;
  if v_message_id is not null then return v_message_id; end if;

  insert into support_request_messages (support_request_id, sender_profile_id, sender_role, body, external_source, external_id)
  values (v_request_id, p_profile_id, 'customer', v_body, p_external_source, p_external_id)
  returning id into v_message_id;

  -- Notify support staff via the admin bot outbox.
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

revoke all on function public.customer_reply_support_request(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.customer_reply_support_request(uuid, text, text, text) to service_role;
