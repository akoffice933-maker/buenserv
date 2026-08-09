import {describe, expect, it} from 'vitest';
import {BARRIO_META, BARRIO_SLUGS, barrioLabel, isBarrioSlug} from './barrios';

describe('barrio source of truth', () => {
  it('has localized metadata for every canonical slug', () => {
    expect(Object.keys(BARRIO_META).sort()).toEqual([...BARRIO_SLUGS].sort());
    BARRIO_SLUGS.forEach(slug => { expect(barrioLabel(slug, 'es')).toBeTruthy(); expect(barrioLabel(slug, 'ru')).toBeTruthy(); expect(barrioLabel(slug, 'en')).toBeTruthy(); });
  });

  it('accepts only canonical barrio slugs', () => {
    expect(isBarrioSlug('palermo')).toBe(true);
    expect(isBarrioSlug('unknown')).toBe(false);
  });
});
