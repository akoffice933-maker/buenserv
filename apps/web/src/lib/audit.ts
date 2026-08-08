import {one} from '@/lib/relations';

export type AuditEvent = {id: string; action: string; entityType: string; entityId: string | null; metadata: Record<string, unknown>; createdAt: string; actor: {displayName: string | null} | null};
type ProfileRow = {display_name?: string | null};

export function normalizeAuditRows(rows: unknown[]): AuditEvent[] {
  return rows.map((row: any) => {
    const actor = one(row.profiles as ProfileRow | ProfileRow[] | null);
    return {id: row.id, action: row.action, entityType: row.entity_type, entityId: row.entity_id, metadata: row.metadata ?? {}, createdAt: row.created_at, actor: actor ? {displayName: actor.display_name ?? null} : null};
  });
}
