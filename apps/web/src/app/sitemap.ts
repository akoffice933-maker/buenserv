import type {MetadataRoute} from 'next';
import {CATEGORY_SLUGS} from '@/lib/categories';

const locales = ['es', 'ru', 'en'];
const publicPaths = ['', '/categories', '/faq', '/how-it-works', '/providers'];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://buenserv.com';
  const routes = locales.flatMap(locale => publicPaths.map(path => ({url: `${base}/${locale}${path}`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: path === '' ? 1 : 0.7})));
  const categoryRoutes = locales.flatMap(locale => CATEGORY_SLUGS.map(slug => ({url: `${base}/${locale}/categories/${slug}`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6})));
  return [...routes, ...categoryRoutes];
}
