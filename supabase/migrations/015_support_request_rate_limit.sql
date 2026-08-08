-- Authenticated Telegram support requests are rate-limited per profile.
create or replace function public.submit_support_request(
  p_profile_id uuid,
  p_details text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_count integer;
  v_request_id uuid;
begin
  perform 1 from profiles where id = p_profile_id for update;
  if not found then raise exception 'profile_not_found'; end if;
  select count(*) into v_recent_count from support_requests where profile_id = p_profile_id and created_at > now() - interval '1 hour';
  if v_recent_count >= 5 then raise exception 'support_rate_limited'; end if;
  if char_length(p_details) < 10 or char_length(p_details) > 2000 then raise exception 'invalid_support_details'; end if;
  insert into support_requests (profile_id, details, status) values (p_profile_id, p_details, 'open') returning id into v_request_id;
  return v_request_id;
end;
$$;
