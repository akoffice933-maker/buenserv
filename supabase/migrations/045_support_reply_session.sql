-- P0: support continuation must be explicit. A user only sends support replies when
-- an active support-reply session exists; otherwise normal bot flows (onboarding,
-- provider confirmation, etc.) are never hijacked by an open support request.

create table public.telegram_support_reply_sessions (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  support_request_id uuid not null references public.support_requests(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '30 minutes',
  updated_at timestamptz not null default now()
);
alter table public.telegram_support_reply_sessions enable row level security;
revoke all on table public.telegram_support_reply_sessions from public, anon, authenticated;

-- Start (or refresh) an explicit support-reply session for the user's open request.
create or replace function public.start_support_reply_session(
  p_profile_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
begin
  select id into v_request_id
  from support_requests
  where profile_id = p_profile_id and status in ('open', 'reviewing')
  order by created_at desc
  limit 1;
  if v_request_id is null then raise exception 'no_open_support_request'; end if;

  insert into telegram_support_reply_sessions (profile_id, support_request_id, expires_at, updated_at)
  values (p_profile_id, v_request_id, now() + interval '30 minutes', now())
  on conflict (profile_id) do update set
    support_request_id = excluded.support_request_id,
    expires_at = now() + interval '30 minutes',
    updated_at = now();

  return v_request_id;
end;
$$;

-- Customer reply: only allowed when an active (non-expired) support-reply session exists.
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

  -- Require an active support-reply session.
  select support_request_id into v_request_id
  from telegram_support_reply_sessions
  where profile_id = p_profile_id and expires_at > now()
  for update;
  if v_request_id is null then raise exception 'no_active_support_reply_session'; end if;

  select id into v_message_id
  from support_request_messages
  where external_source = p_external_source and external_id = p_external_id;
  if v_message_id is not null then return v_message_id; end if;

  insert into support_request_messages (support_request_id, sender_profile_id, sender_role, body, external_source, external_id)
  values (v_request_id, p_profile_id, 'customer', v_body, p_external_source, p_external_id)
  returning id into v_message_id;

  -- Audit the customer reply for a complete support history.
  insert into audit_events (actor_profile_id, action, entity_type, entity_id, metadata)
  values (p_profile_id, 'customer_replied_support', 'support_request', v_request_id,
          jsonb_build_object('message_id', v_message_id));

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

revoke all on function public.start_support_reply_session(uuid) from public, anon, authenticated;
revoke all on function public.customer_reply_support_request(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.start_support_reply_session(uuid) to service_role;
grant execute on function public.customer_reply_support_request(uuid, text, text, text) to service_role;
