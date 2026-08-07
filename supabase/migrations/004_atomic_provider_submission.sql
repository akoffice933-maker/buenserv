-- Atomic provider submission. All provider, category and barrio mutations succeed or fail together.
alter table public.telegram_updates add column if not exists processed_at timestamptz;

create or replace function public.submit_provider(
  p_profile_id uuid,
  p_telegram_id bigint,
  p_display_name text,
  p_category_slug text,
  p_barrio_slug text,
  p_description text,
  p_price_from_ars numeric,
  p_telegram_photo_file_id text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_id uuid;
  v_barrio_id uuid;
  v_provider_id uuid;
  v_slug text;
begin
  select id into v_category_id from categories where slug = p_category_slug and active = true;
  if v_category_id is null then raise exception 'Unknown active category'; end if;
  select id into v_barrio_id from barrios where slug = p_barrio_slug and active = true;
  if v_barrio_id is null then raise exception 'Unknown active barrio'; end if;
  if char_length(p_description) < 20 or char_length(p_description) > 800 then raise exception 'Invalid bio length'; end if;
  if p_price_from_ars <= 0 then raise exception 'Invalid price'; end if;

  v_slug := coalesce(nullif(regexp_replace(lower(p_display_name), '[^a-z0-9]+', '-', 'g'), ''), 'provider') || '-' || p_telegram_id::text;
  v_slug := trim(both '-' from v_slug);

  insert into providers (profile_id, slug, status, bio, photo_path, onboarding_payload)
  values (p_profile_id, v_slug, 'pending', p_description, null, jsonb_build_object('telegram_photo_file_id', p_telegram_photo_file_id))
  on conflict (profile_id) do update set
    slug = excluded.slug,
    status = 'pending',
    bio = excluded.bio,
    photo_path = null,
    onboarding_payload = excluded.onboarding_payload,
    updated_at = now()
  returning id into v_provider_id;

  delete from provider_categories where provider_id = v_provider_id;
  delete from provider_barrios where provider_id = v_provider_id;
  insert into provider_categories (provider_id, category_id, price_from_ars) values (v_provider_id, v_category_id, p_price_from_ars);
  insert into provider_barrios (provider_id, barrio_id) values (v_provider_id, v_barrio_id);
  return v_provider_id;
end;
$$;
