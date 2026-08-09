export const CATEGORY_SLUGS = [
  'limpieza',
  'reparaciones',
  'mascotas',
  'mudanzas',
  'clases',
  'mensajeria',
  'taxi-traslados'
] as const;

export type CategorySlug = typeof CATEGORY_SLUGS[number];

export const CATEGORY_META: Record<CategorySlug, {image: string; aliases: readonly string[]}> = {
  limpieza: {image: 'category-cleaning.webp', aliases: ['limpieza', 'cleaning', 'уборка']},
  reparaciones: {image: 'category-repair.webp', aliases: ['reparaciones', 'repairs', 'ремонт', 'electricista', 'электрик']},
  mascotas: {image: 'category-pets.webp', aliases: ['mascotas', 'pets', 'питомцы']},
  mudanzas: {image: 'category-moving.webp', aliases: ['mudanzas', 'moving', 'переезды']},
  clases: {image: 'category-lessons.webp', aliases: ['clases', 'lessons', 'занятия']},
  mensajeria: {image: 'category-delivery.webp', aliases: ['mensajeria', 'mensajería', 'delivery', 'курьеры']},
  'taxi-traslados': {image: 'category-taxi.webp', aliases: ['taxi', 'traslados', 'taxi y traslados', 'такси', 'transfers']}
};

export function isCategorySlug(value: string): value is CategorySlug {
  return CATEGORY_SLUGS.includes(value as CategorySlug);
}

export function parseCategoryAlias(value: string): CategorySlug | null {
  const normalized = value.trim().toLowerCase();
  return CATEGORY_SLUGS.find(slug => CATEGORY_META[slug].aliases.includes(normalized)) ?? null;
}

// TODO(directory-sync): move aliases to database-managed category records once CMS is live.
// Canonical slug validation remains server-side in the submit_provider RPC.
