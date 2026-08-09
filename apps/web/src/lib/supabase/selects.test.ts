import {describe, expect, it} from 'vitest';
import {AUDIT_ADMIN_SELECT, PROVIDER_ADMIN_SELECT, PROVIDER_PROFILE_SELECT, PROVIDER_PUBLIC_SELECT, REPORT_ADMIN_SELECT, SUPPORT_ADMIN_SELECT} from './selects';

const contracts = [PROVIDER_PUBLIC_SELECT, PROVIDER_PROFILE_SELECT, PROVIDER_ADMIN_SELECT, REPORT_ADMIN_SELECT, SUPPORT_ADMIN_SELECT, AUDIT_ADMIN_SELECT];

describe('Supabase relation select contracts', () => {
  it('uses explicit FK embeds for every profile/category/barrio relation', () => {
    contracts.forEach(contract => {
      expect(contract).not.toMatch(/(?<![!\w])profiles\(/);
      expect(contract).not.toMatch(/(?<![!\w])categories\(/);
      expect(contract).not.toMatch(/(?<![!\w])barrios\(/);
    });
  });

  it('covers each known relationship ambiguity with its FK constraint', () => {
    expect(PROVIDER_PUBLIC_SELECT).toContain('profiles!providers_profile_id_fkey');
    expect(PROVIDER_PUBLIC_SELECT).toContain('categories!provider_categories_category_id_fkey');
    expect(PROVIDER_PUBLIC_SELECT).toContain('barrios!provider_barrios_barrio_id_fkey');
    expect(REPORT_ADMIN_SELECT).toContain('providers!reports_provider_id_fkey');
    expect(REPORT_ADMIN_SELECT).toContain('profiles!reports_reporter_profile_id_fkey');
    expect(SUPPORT_ADMIN_SELECT).toContain('profiles!support_requests_profile_id_fkey');
    expect(AUDIT_ADMIN_SELECT).toContain('profiles!audit_events_actor_profile_id_fkey');
  });
});
