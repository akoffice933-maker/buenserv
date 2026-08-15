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

/** Canonical presentation labels + icon for each category slug (single source of truth). */
export const CATEGORY_LABELS: Record<CategorySlug, {es: string; ru: string; en: string; icon: string}> = {
  limpieza: {es: 'Limpieza', ru: 'Уборка', en: 'Cleaning', icon: '🧹'},
  reparaciones: {es: 'Reparaciones', ru: 'Ремонт', en: 'Repairs', icon: '🔧'},
  mascotas: {es: 'Mascotas', ru: 'Питомцы', en: 'Pets', icon: '🐾'},
  mudanzas: {es: 'Mudanzas', ru: 'Переезды', en: 'Moving', icon: '🚚'},
  clases: {es: 'Clases', ru: 'Занятия', en: 'Lessons', icon: '📚'},
  mensajeria: {es: 'Mensajería', ru: 'Курьеры', en: 'Delivery', icon: '🛵'},
  'taxi-traslados': {es: 'Taxi y traslados', ru: 'Такси и трансферы', en: 'Taxi & transfers', icon: '🚕'}
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
