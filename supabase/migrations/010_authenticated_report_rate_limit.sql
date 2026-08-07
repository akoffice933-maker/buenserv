-- Telegram-authenticated reports are attributed and rate-limited per reporter profile.
create or replace function public.submit_authenticated_report(
  p_reporter_profile_id uuid,
  p_provider_id uuid,
  p_reason text,
  p_details text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id uuid;
  v_recent_count integer;
begin
  -- Serialise report creation for one authenticated profile.
  perform 1 from profiles where id = p_reporter_profile_id for update;
  if not found then raise exception 'reporter_not_found'; end if;
  select count(*) into v_recent_count from reports where reporter_profile_id = p_reporter_profile_id and created_at > now() - interval '1 hour';
  if v_recent_count >= 5 then raise exception 'report_rate_limited'; end if;
  if not exists (select 1 from providers where id = p_provider_id and status = 'approved') then raise exception 'provider_not_found'; end if;
  if exists (select 1 from providers where id = p_provider_id and profile_id = p_reporter_profile_id) then raise exception 'self_report_forbidden'; end if;
  insert into reports (provider_id, reporter_profile_id, reason, details, status)
  values (p_provider_id, p_reporter_profile_id, p_reason, p_details, 'open')
  returning id into v_report_id;
  return v_report_id;
end;
$$;
