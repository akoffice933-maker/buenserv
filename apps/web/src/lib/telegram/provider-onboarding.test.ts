import {describe, expect, it} from 'vitest';
import {isConfirmation, onboardingText, parseArsPrice, parseBarrio, parseCategory, parseReportReason} from './provider-onboarding';

describe('provider onboarding utilities', () => {
  it('parses ARS prices without accepting invalid values', () => {
    expect(parseArsPrice('18.000')).toBe(18000);
    expect(parseArsPrice('18 000')).toBe(18000);
    expect(parseArsPrice('0')).toBeNull();
    expect(parseArsPrice('ARS 18000')).toBeNull();
  });

  it('normalizes multilingual category, barrio and confirmation inputs', () => {
    [['Уборка', 'limpieza'], ['Cleaning', 'limpieza'], ['Taxi', 'taxi-traslados']].forEach(([input, expected]) => expect(parseCategory(input)).toBe(expected));
    [['Палермо', 'palermo'], ['Belgrano', 'belgrano'], ['Caballito', 'caballito']].forEach(([input, expected]) => expect(parseBarrio(input)).toBe(expected));
    expect(isConfirmation('ПОДТВЕРДИТЬ')).toBe(true);
  });

  it('maps each report reason across Spanish, Russian and English inputs', () => {
    const cases = [['perfil', 'profile_mismatch'], ['profile', 'profile_mismatch'], ['профиль', 'profile_mismatch'], ['respuesta', 'no_response'], ['response', 'no_response'], ['ответ', 'no_response'], ['spam', 'spam'], ['спам', 'spam'], ['seguridad', 'safety'], ['safety', 'safety'], ['безопасность', 'safety'], ['otro', 'other'], ['other', 'other'], ['другое', 'other']];
    cases.forEach(([input, expected]) => expect(parseReportReason(input)).toBe(expected));
    expect(parseReportReason('unknown')).toBeNull();
  });

  it('has onboarding copy for each supported locale', () => {
    expect(onboardingText('es-AR', 'category')).toContain('servicio');
    expect(onboardingText('ru', 'category')).toContain('услугу');
    expect(onboardingText('en', 'category')).toContain('service');
    expect(onboardingText('ru', 'suspended')).toContain('снят');
    expect(onboardingText('en', 'supportSubmitted')).toContain('received');
  });
});
