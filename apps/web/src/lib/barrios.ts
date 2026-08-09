export const BARRIO_SLUGS = ['palermo', 'recoleta', 'belgrano', 'caballito'] as const;
export type BarrioSlug = typeof BARRIO_SLUGS[number];

export const BARRIO_META: Record<BarrioSlug, {es: string; ru: string; en: string; aliases: readonly string[]}> = {
  palermo: {es: 'Palermo', ru: 'Палермо', en: 'Palermo', aliases: ['palermo', 'палермо']},
  recoleta: {es: 'Recoleta', ru: 'Реколета', en: 'Recoleta', aliases: ['recoleta', 'реколета']},
  belgrano: {es: 'Belgrano', ru: 'Бельграно', en: 'Belgrano', aliases: ['belgrano', 'бельграно']},
  caballito: {es: 'Caballito', ru: 'Кабальито', en: 'Caballito', aliases: ['caballito', 'кабальито']}
};

export function isBarrioSlug(value: string): value is BarrioSlug {
  return BARRIO_SLUGS.includes(value as BarrioSlug);
}

export function barrioLabel(slug: string, locale: string) {
  const meta = BARRIO_META[slug as BarrioSlug];
  if (!meta) return slug;
  return meta[locale === 'ru' ? 'ru' : locale === 'en' ? 'en' : 'es'];
}

export function parseBarrioAlias(value: string): BarrioSlug | null {
  const normalized = value.trim().toLowerCase();
  return BARRIO_SLUGS.find(slug => BARRIO_META[slug].aliases.includes(normalized)) ?? null;
}
