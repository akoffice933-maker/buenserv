import {one} from '@/lib/relations';

export type ModerationReport = {
  id: string;
  reason: string;
  details: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: string;
  provider: {slug: string; displayName: string | null} | null;
  reporter: {displayName: string | null; telegramUserId: number | null} | null;
};

type PersonRow = {display_name?: string | null; telegram_user_id?: number | null};
type ProviderRow = {slug?: string; profiles?: PersonRow | PersonRow[] | null};

export function normalizeReportRows(rows: unknown[]): ModerationReport[] {
  return rows.map((row: any) => {
    const provider = one(row.providers as ProviderRow | ProviderRow[] | null);
    const providerProfile = one(provider?.profiles);
    const reporter = one(row.profiles as PersonRow | PersonRow[] | null);
    return {
      id: row.id,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.created_at,
      provider: provider?.slug ? {slug: provider.slug, displayName: providerProfile?.display_name ?? null} : null,
      reporter: reporter ? {displayName: reporter.display_name ?? null, telegramUserId: reporter.telegram_user_id ?? null} : null
    };
  });
}
