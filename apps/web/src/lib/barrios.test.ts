import {describe, expect, it} from 'vitest';
import {BARRIO_META, BARRIO_SLUGS, barrioLabel, isBarrioSlug, parseBarrioAlias} from './barrios';

describe('barrio source of truth', () => {
  it('has localized metadata for every canonical slug', () => {
    expect(Object.keys(BARRIO_META).sort()).toEqual([...BARRIO_SLUGS].sort());
    BARRIO_SLUGS.forEach(slug => { expect(barrioLabel(slug, 'es')).toBeTruthy(); expect(barrioLabel(slug, 'ru')).toBeTruthy(); expect(barrioLabel(slug, 'en')).toBeTruthy(); });
  });

  it('maps aliases uniquely to canonical barrios', () => {
    const seen = new Map<string, string>();
    BARRIO_SLUGS.forEach(slug => BARRIO_META[slug].aliases.forEach(alias => {
      expect(seen.has(alias)).toBe(false);
      seen.set(alias, slug);
      expect(parseBarrioAlias(alias)).toBe(slug);
    }));
    expect(parseBarrioAlias('unknown')).toBeNull();
  });

  it('accepts only canonical barrio slugs', () => {
    expect(isBarrioSlug('palermo')).toBe(true);
    expect(isBarrioSlug('unknown')).toBe(false);
  });
});
