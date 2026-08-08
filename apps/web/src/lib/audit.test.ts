import {describe, expect, it} from 'vitest';
import {normalizeAuditRows} from './audit';

describe('audit relation normalization', () => {
  it('normalizes the many-to-one actor profile object', () => {
    const [event] = normalizeAuditRows([{id: 'a1', action: 'provider_moderated', entity_type: 'provider', entity_id: 'p1', metadata: {decision: 'approved'}, created_at: '2026-08-07T00:00:00Z', profiles: {display_name: 'Moderator'}}]);
    expect(event.actor?.displayName).toBe('Moderator');
    expect(event.action).toBe('provider_moderated');
  });
});
