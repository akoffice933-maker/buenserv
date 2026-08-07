-- Anonymous web reports are rate-limited and never auto-moderate a provider.
create table public.report_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null default now(),
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now()
);
alter table public.report_rate_limits enable row level security;

create or replace function public.submit_public_report(
  p_key_hash text,
  p_provider_id uuid,
  p_reason text,
  p_details text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit report_rate_limits%rowtype;
  v_report_id uuid;
begin
  select * into v_limit from report_rate_limits where key_hash = p_key_hash for update;
  if not found then
    insert into report_rate_limits (key_hash, count) values (p_key_hash, 1);
  elsif now() - v_limit.window_started_at < interval '1 hour' then
    if v_limit.count >= 3 then raise exception 'report_rate_limited'; end if;
    update report_rate_limits set count = count + 1, updated_at = now() where key_hash = p_key_hash;
  else
    update report_rate_limits set window_started_at = now(), count = 1, updated_at = now() where key_hash = p_key_hash;
  end if;

  if not exists (select 1 from providers where id = p_provider_id and status = 'approved') then raise exception 'provider_not_found'; end if;
  insert into reports (provider_id, reason, details, status) values (p_provider_id, p_reason, p_details, 'open') returning id into v_report_id;
  return v_report_id;
end;
$$;
