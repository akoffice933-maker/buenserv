-- Admin support reply: durable message thread between support staff and the customer.
-- Each admin reply is stored immutably and delivered to the customer via the public bot.

create table public.support_request_messages (
  id uuid primary key default gen_random_uuid(),
  support_request_id uuid not null references public.support_requests(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'admin', 'moderator', 'support')),
  body text not null check (char_length(btrim(body)) > 0 and char_length(body) <= 2000),
  external_source text not null,
  external_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (external_source, external_id)
);

alter table public.support_request_messages enable row level security;
create index support_request_messages_request_created_idx on public.support_request_messages(support_request_id, created_at);

create policy "participants can read support messages" on public.support_request_messages
  for select using (
    exists (
      select 1
      from public.support_requests sr
      left join public.profiles customer_profile on customer_profile.id = sr.profile_id
      where sr.id = support_request_messages.support_request_id
        and (
          customer_profile.auth_user_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.auth_user_id = auth.uid() and p.role in ('admin', 'moderator', 'support')
          )
        )
    )
  );

revoke all on table public.support_request_messages from public, anon, authenticated;

-- Admin replies to a support request. The RPC validates the actor role, stores the
-- message immutably, and returns the customer's telegram_user_id so the webhook can
-- deliver it through the public bot.
create or replace function public.admin_reply_support_request(
  p_actor_profile_id uuid,
  p_request_id uuid,
  p_body text,
  p_external_source text,
  p_external_id text
) returns table (message_id uuid, customer_telegram_user_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_message_id uuid;
  v_customer_telegram_user_id bigint;
begin
  if p_external_source is null or p_external_id is null then raise exception 'external_idempotency_required'; end if;
  if char_length(btrim(p_body)) = 0 then raise exception 'message_body_required'; end if;
  if char_length(p_body) > 2000 then raise exception 'message_body_too_long'; end if;

  select role into v_actor_role from profiles where id = p_actor_profile_id;
  if v_actor_role not in ('admin', 'moderator', 'support') then raise exception 'permission_denied'; end if;

  select id into v_message_id from support_request_messages where external_source = p_external_source and external_id = p_external_id;
  if v_message_id is not null then
    select sr.profile_id into v_customer_telegram_user_id from support_requests sr where sr.id = p_request_id;
    return query select v_message_id, (select telegram_user_id from profiles where id = v_customer_telegram_user_id);
    return;
  end if;

  -- Lock the request row to keep the thread ordered.
  perform 1 from support_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;

  insert into support_request_messages (support_request_id, sender_profile_id, sender_role, body, external_source, external_id)
  values (p_request_id, p_actor_profile_id, v_actor_role, p_body, p_external_source, p_external_id)
  returning id into v_message_id;

  -- Reopen a closed request when an admin replies, so the customer can continue the thread.
  update support_requests set status = 'reviewing', closed_at = null where id = p_request_id and status = 'closed';

  select telegram_user_id into v_customer_telegram_user_id
  from profiles where id = (select profile_id from support_requests where id = p_request_id);

  return query select v_message_id, v_customer_telegram_user_id;
exception when unique_violation then
  select id into v_message_id from support_request_messages where external_source = p_external_source and external_id = p_external_id;
  if v_message_id is not null then
    select telegram_user_id into v_customer_telegram_user_id
    from profiles where id = (select profile_id from support_requests where id = p_request_id);
    return query select v_message_id, v_customer_telegram_user_id;
  end if;
  raise;
end;
$$;

revoke all on function public.admin_reply_support_request(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_reply_support_request(uuid, uuid, text, text, text) to service_role;