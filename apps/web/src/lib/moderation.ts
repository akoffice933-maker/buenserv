import type {DirectoryBarrio, DirectoryCategory} from '@/lib/directory';
import {one} from '@/lib/relations';

export type ModerationProvider = {
  id: string;
  slug: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
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
    applicant: one(row.profiles) ? {displayName: one(row.profiles)?.display_name, telegramUserId: one(row.profiles)?.telegram_user_id} : null,
    categories: (row.provider_categories ?? []).map((item: any) => ({priceFromArs: item.price_from_ars, category: one(item.categories)})),
    barrios: (row.provider_barrios ?? []).map((item: any) => ({barrio: one(item.barrios)}))
  }));
}
