import {describe, expect, it} from 'vitest';
import {detectLocaleFromTelegram, isConfirmation, mainMenuText, onboardingText, parseArsPrice, parseBarrio, parseCategory, parseReportReason, rateLimitCopyKey} from './provider-onboarding';

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

  it('keeps support and report rate-limit copy keys distinct', () => {
    expect(rateLimitCopyKey('support')).toBe('supportRateLimited');
    expect(rateLimitCopyKey('report')).toBe('reportRateLimited');
  });

  it('has onboarding copy for each supported locale', () => {
    expect(onboardingText('es-AR', 'category')).toContain('servicio');
    expect(onboardingText('ru', 'category')).toContain('услугу');
    expect(onboardingText('en', 'category')).toContain('service');
    expect(onboardingText('ru', 'suspended')).toContain('снят');
    expect(onboardingText('en', 'supportSubmitted')).toContain('received');
  });

  it('detects a locale default from Telegram language_code only, independent of any saved choice', () => {
    expect(detectLocaleFromTelegram('ru')).toBe('ru');
    expect(detectLocaleFromTelegram('ru-RU')).toBe('ru');
    expect(detectLocaleFromTelegram('en-US')).toBe('en');
    expect(detectLocaleFromTelegram('es-ES')).toBe('es-AR');
    expect(detectLocaleFromTelegram('de')).toBe('es-AR');
    expect(detectLocaleFromTelegram(undefined)).toBe('es-AR');
  });

  it('has a complete localized main menu (greeting + all five actions) for every locale', () => {
    (['es-AR', 'ru', 'en'] as const).forEach(locale => {
      const menu = mainMenuText(locale);
      expect(menu.greeting.length).toBeGreaterThan(0);
      expect(menu.findService.length).toBeGreaterThan(0);
      expect(menu.offerServices.length).toBeGreaterThan(0);
      expect(menu.cabinet.length).toBeGreaterThan(0);
      expect(menu.help.length).toBeGreaterThan(0);
      expect(menu.language.length).toBeGreaterThan(0);
    });
  });
});
