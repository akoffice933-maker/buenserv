import {barrioLabel} from '@/lib/barrios';

export type DirectoryBarrio = {slug: string; name_es: string; name_ru: string; name_en: string};
export type DirectoryCategory = {slug: string};

export type DirectoryProvider = {
  id: string;
  slug: string;
  profiles?: {display_name: string | null} | Array<{display_name: string | null}> | null;
  photo_path: string | null;
  rating: number;
  reviews_count: number;
  accepts_usdt: boolean;
  provider_categories?: Array<{price_from_ars: number | null; categories?: DirectoryCategory | null}>;
  provider_barrios?: Array<{barrios?: DirectoryBarrio | null}>;
};

export type DirectoryFilters = {category?: string; barrio?: string; usdt?: boolean};

export function filterDirectoryProviders(providers: DirectoryProvider[], filters: DirectoryFilters) {
  return providers.filter(provider => {
    const categoryOK = !filters.category || provider.provider_categories?.some(item => item.categories?.slug === filters.category);
    const barrioOK = !filters.barrio || provider.provider_barrios?.some(item => item.barrios?.slug === filters.barrio);
    const usdtOK = filters.usdt !== true || provider.accepts_usdt;
    return categoryOK && barrioOK && usdtOK;
  });
}

export function localizedBarrioName(barrio: DirectoryBarrio | null | undefined, locale: string) {
  if (!barrio) return '';
  if (locale === 'ru') return barrio.name_ru || barrioLabel(barrio.slug, locale);
  if (locale === 'en') return barrio.name_en || barrioLabel(barrio.slug, locale);
  return barrio.name_es || barrioLabel(barrio.slug, locale);
}
