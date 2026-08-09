// Explicit FK names prevent PostgREST PGRST201 ambiguity as schemas gain audit/moderation foreign keys.
export const PROVIDER_PUBLIC_SELECT = 'id,slug,photo_path,rating,reviews_count,accepts_usdt,profiles!providers_profile_id_fkey(display_name),provider_categories(price_from_ars,categories!provider_categories_category_id_fkey(slug)),provider_barrios(barrios!provider_barrios_barrio_id_fkey(slug,name_es,name_ru,name_en))';

export const PROVIDER_PROFILE_SELECT = `${PROVIDER_PUBLIC_SELECT},bio,reviews(rating,body,locale,created_at)`;

export const PROVIDER_ADMIN_SELECT = 'id,slug,status,bio,onboarding_payload,created_at,profiles!providers_profile_id_fkey(display_name,telegram_user_id),provider_categories(price_from_ars,categories!provider_categories_category_id_fkey(slug)),provider_barrios(barrios!provider_barrios_barrio_id_fkey(slug,name_es,name_ru,name_en))';

export const REPORT_ADMIN_SELECT = 'id,reason,details,status,created_at,providers!reports_provider_id_fkey(slug,profiles!providers_profile_id_fkey(display_name)),profiles!reports_reporter_profile_id_fkey(display_name,telegram_user_id)';

export const SUPPORT_ADMIN_SELECT = 'id,details,status,created_at,profiles!support_requests_profile_id_fkey(display_name,telegram_user_id)';

export const AUDIT_ADMIN_SELECT = 'id,action,entity_type,entity_id,metadata,created_at,profiles!audit_events_actor_profile_id_fkey(display_name)';
