import {describe, expect, it} from 'vitest';
import {onboardingText, parseArsPrice} from './provider-onboarding';

describe('provider onboarding utilities', () => {
  it('parses ARS prices without accepting invalid values', () => {
    expect(parseArsPrice('18.000')).toBe(18000);
    expect(parseArsPrice('18 000')).toBe(18000);
    expect(parseArsPrice('0')).toBeNull();
    expect(parseArsPrice('ARS 18000')).toBeNull();
  });

  it('has onboarding copy for each supported locale', () => {
    expect(onboardingText('es-AR', 'category')).toContain('servicio');
    expect(onboardingText('ru', 'category')).toContain('услугу');
    expect(onboardingText('en', 'category')).toContain('service');
  });
});
