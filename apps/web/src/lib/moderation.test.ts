import {describe, expect, it} from 'vitest';
import {normalizeModerationProviders} from './moderation';

describe('moderation provider normalization', () => {
  it('normalizes embedded many-to-one objects into stable dashboard data', () => {
    const [provider] = normalizeModerationProviders([{
      id: 'p1', slug: 'mariana-lopez', status: 'pending', bio: 'Experienced cleaner based in Palermo.', onboarding_payload: {}, created_at: '2026-08-07T00:00:00Z',
      profiles: {display_name: 'Mariana López', telegram_user_id: 123},
      provider_categories: [{price_from_ars: 18000, categories: {slug: 'limpieza'}}],
      provider_barrios: [{barrios: {slug: 'palermo', name_es: 'Palermo', name_ru: 'Палермо', name_en: 'Palermo'}}]
    }]);
    expect(provider.applicant?.displayName).toBe('Mariana López');
    expect(provider.categories[0].category?.slug).toBe('limpieza');
    expect(provider.barrios[0].barrio?.name_ru).toBe('Палермо');
  });
});
