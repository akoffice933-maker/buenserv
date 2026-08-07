export type SupportRequest = {id: string; details: string; status: 'open' | 'reviewing' | 'closed'; createdAt: string; requester: {displayName: string | null; telegramUserId: number | null} | null};

type ProfileRow = {display_name?: string | null; telegram_user_id?: number | null};

export function normalizeSupportRows(rows: unknown[]): SupportRequest[] {
  return rows.map((row: any) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null as ProfileRow | null;
    return {id: row.id, details: row.details, status: row.status, createdAt: row.created_at, requester: profile ? {displayName: profile.display_name ?? null, telegramUserId: profile.telegram_user_id ?? null} : null};
  });
}
