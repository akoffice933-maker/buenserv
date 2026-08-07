import type {DirectoryBarrio, DirectoryCategory} from '@/lib/directory';

export type ModerationProvider = {
  id: string;
  slug: string;
  status: 'pending';
  bio: string | null;
  onboardingPayload: Record<string, unknown>;
  createdAt: string;
  applicant: {displayName: string | null; telegramUserId: number | null} | null;
  categories: Array<{priceFromArs: number | null; category: DirectoryCategory | null}>;
  barrios: Array<{barrio: DirectoryBarrio | null}>;
};

export function normalizeModerationProviders(rows: unknown[]): ModerationProvider[] {
  return rows.map((row: any) => ({
    id: row.id,
    slug: row.slug,
    status: row.status,
    bio: row.bio,
    onboardingPayload: row.onboarding_payload ?? {},
    createdAt: row.created_at,
    applicant: Array.isArray(row.profiles) ? row.profiles[0] ? {displayName: row.profiles[0].display_name, telegramUserId: row.profiles[0].telegram_user_id} : null : row.profiles ? {displayName: row.profiles.display_name, telegramUserId: row.profiles.telegram_user_id} : null,
    categories: (row.provider_categories ?? []).map((item: any) => ({priceFromArs: item.price_from_ars, category: Array.isArray(item.categories) ? item.categories[0] ?? null : item.categories ?? null})),
    barrios: (row.provider_barrios ?? []).map((item: any) => ({barrio: Array.isArray(item.barrios) ? item.barrios[0] ?? null : item.barrios ?? null}))
  }));
}
