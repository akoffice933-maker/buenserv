import {describe, expect, it} from 'vitest';
import {isConfirmation, onboardingText, parseArsPrice, parseBarrio, parseCategory} from './provider-onboarding';

describe('provider onboarding utilities', () => {
  it('parses ARS prices without accepting invalid values', () => {
    expect(parseArsPrice('18.000')).toBe(18000);
    expect(parseArsPrice('18 000')).toBe(18000);
    expect(parseArsPrice('0')).toBeNull();
    expect(parseArsPrice('ARS 18000')).toBeNull();
  });

  it('normalizes multilingual category, barrio and confirmation inputs', () => {
    expect(parseCategory('Уборка')).toBe('limpieza');
    expect(parseCategory('Cleaning')).toBe('limpieza');
    expect(parseBarrio('Палермо')).toBe('palermo');
    expect(isConfirmation('ПОДТВЕРДИТЬ')).toBe(true);
  });

  it('has onboarding copy for each supported locale', () => {
    expect(onboardingText('es-AR', 'category')).toContain('servicio');
    expect(onboardingText('ru', 'category')).toContain('услугу');
    expect(onboardingText('en', 'category')).toContain('service');
  });
});
