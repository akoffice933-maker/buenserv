import {describe, expect, it} from 'vitest';
import {filterDirectoryProviders, localizedBarrioName, type DirectoryProvider} from './directory';

const mariana: DirectoryProvider = {
  id: 'provider-1', slug: 'mariana-lopez', profiles: {display_name: 'Mariana López'}, photo_path: null, rating: 4.9, reviews_count: 48, accepts_usdt: true,
  provider_categories: [{price_from_ars: 18000, categories: {slug: 'limpieza'}}],
  provider_barrios: [{barrios: {slug: 'palermo', name_es: 'Palermo', name_ru: 'Палермо', name_en: 'Palermo'}}]
};

describe('directory relation contract', () => {
  it('filters a many-to-one embedded category object without treating it as an array', () => {
    expect(filterDirectoryProviders([mariana], {category: 'limpieza'})).toEqual([mariana]);
    expect(filterDirectoryProviders([mariana], {category: 'taxi-traslados'})).toEqual([]);
  });

  it('filters a many-to-one embedded barrio object and preserves the USDT constraint', () => {
    expect(filterDirectoryProviders([mariana], {barrio: 'palermo', usdt: true})).toEqual([mariana]);
    expect(filterDirectoryProviders([mariana], {barrio: 'recoleta'})).toEqual([]);
  });

  it('selects a locale-specific barrio label from the embedded object', () => {
    const barrio = mariana.provider_barrios?.[0]?.barrios;
    expect(localizedBarrioName(barrio, 'es')).toBe('Palermo');
    expect(localizedBarrioName(barrio, 'ru')).toBe('Палермо');
    expect(localizedBarrioName(barrio, 'en')).toBe('Palermo');
  });
});
