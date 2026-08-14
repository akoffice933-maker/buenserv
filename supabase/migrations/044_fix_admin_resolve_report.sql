-- Fix admin_resolve_report: the reports table has no updated_at column
-- (only created_at, resolved_at). The 028 version referenced updated_at,
-- which caused "column updated_at does not exist" when closing a report.

create or replace function public.admin_resolve_report(
  p_actor_profile_id uuid,
  p_report_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_actor_role text;
begin
  select role into v_actor_role from profiles where id = p_actor_profile_id;
  if v_actor_role not in ('admin', 'moderator') then raise exception 'permission_denied'; end if;
  update reports set status = 'resolved', resolved_at = now() where id = p_report_id and status = 'open';
  if not found then raise exception 'report_not_found_or_already_resolved'; end if;
  insert into audit_events (actor_profile_id, action, entity_type, entity_id, metadata)
  values (p_actor_profile_id, 'report_resolved', 'report', p_report_id, '{}'::jsonb);
end;
$$;

revoke all on function public.admin_resolve_report(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_resolve_report(uuid, uuid) to service_role;
