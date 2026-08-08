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

export const CATEGORY_META: Record<CategorySlug, {image: string}> = {
  limpieza: {image: 'category-cleaning.webp'},
  reparaciones: {image: 'category-repair.webp'},
  mascotas: {image: 'category-pets.webp'},
  mudanzas: {image: 'category-moving.webp'},
  clases: {image: 'category-lessons.webp'},
  mensajeria: {image: 'category-delivery.webp'},
  'taxi-traslados': {image: 'category-taxi.webp'}
};

export function isCategorySlug(value: string): value is CategorySlug {
  return CATEGORY_SLUGS.includes(value as CategorySlug);
}

// TODO(directory-sync): replace this static allow-list with category records from
// Supabase once the category CMS/admin flow is live. API routes already expose
// active database categories through GET /api/categories.
