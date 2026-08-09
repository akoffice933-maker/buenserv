import {describe, expect, it} from 'vitest';
import es from '@/messages/es.json';
import ru from '@/messages/ru.json';
import en from '@/messages/en.json';
import {CATEGORY_META, CATEGORY_SLUGS, isCategorySlug, parseCategoryAlias} from './categories';

describe('category source of truth', () => {
  it('has metadata for every canonical slug and no extras', () => {
    expect(Object.keys(CATEGORY_META).sort()).toEqual([...CATEGORY_SLUGS].sort());
    CATEGORY_SLUGS.forEach(slug => expect(CATEGORY_META[slug].image).toMatch(/^category-.+\.webp$/));
  });

  it('has a localized label for every slug in every supported locale', () => {
    [es, ru, en].forEach(messages => CATEGORY_SLUGS.forEach(slug => expect(messages.categories.items[slug]).toBeTruthy()));
  });

  it('maps every declared alias back to its canonical slug', () => {
    CATEGORY_SLUGS.forEach(slug => {
      expect(CATEGORY_META[slug].aliases.length).toBeGreaterThan(0);
      CATEGORY_META[slug].aliases.forEach(alias => expect(parseCategoryAlias(alias)).toBe(slug));
    });
  });

  it('accepts only canonical slugs', () => {
    expect(isCategorySlug('limpieza')).toBe(true);
    expect(isCategorySlug('unknown')).toBe(false);
    expect(parseCategoryAlias('unknown')).toBeNull();
  });
});
