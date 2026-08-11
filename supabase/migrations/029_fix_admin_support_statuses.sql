-- Fix admin bot RPCs: the support_requests table uses 'reviewing'/'closed' not 'in_progress'/'resolved'
-- Also the table doesn't have updated_at, it has closed_at and handled_by

create or replace function public.admin_take_support_request(
  p_actor_profile_id uuid,
  p_request_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_actor_role text;
begin
  select role into v_actor_role from profiles where id = p_actor_profile_id;
  if v_actor_role not in ('admin', 'moderator', 'support') then raise exception 'permission_denied'; end if;
  update support_requests set status = 'reviewing', handled_by = p_actor_profile_id where id = p_request_id and status = 'open';
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
  update support_requests set status = 'closed', closed_at = now(), handled_by = p_actor_profile_id where id = p_request_id and status <> 'closed';
  if not found then raise exception 'request_not_found_or_already_closed'; end if;
end;
$$;

revoke all on function public.admin_take_support_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_resolve_support_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_take_support_request(uuid, uuid) to service_role;
grant execute on function public.admin_resolve_support_request(uuid, uuid) to service_role;