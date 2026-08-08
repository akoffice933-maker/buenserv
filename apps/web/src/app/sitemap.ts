import type {MetadataRoute} from 'next';
import {CATEGORY_SLUGS} from '@/lib/categories';
import {createPublicDirectoryClient} from '@/lib/supabase/public';

const locales = ['es', 'ru', 'en'] as const;
const publicPaths = ['', '/categories', '/faq', '/how-it-works', '/providers', '/pricing', '/safety', '/contact', '/blog'];
export const revalidate = 3600;

function languageAlternates(base: string, path: string) {
  return {languages: Object.fromEntries(locales.map(locale => [locale === 'es' ? 'es-AR' : locale, `${base}/${locale}${path}`]))};
}

function entry(base: string, path: string, priority: number): MetadataRoute.Sitemap[number] {
  return {url: `${base}/es${path}`, lastModified: new Date(), changeFrequency: 'weekly', priority, alternates: languageAlternates(base, path)};
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://buenserv.com';
  const routes = publicPaths.map(path => entry(base, path, path === '' ? 1 : 0.7));
  const categoryRoutes = CATEGORY_SLUGS.map(slug => entry(base, `/categories/${slug}`, 0.6));
  try {
    const {data} = await createPublicDirectoryClient().from('providers').select('slug,updated_at').eq('status', 'approved');
    const profileRoutes = (data ?? []).map(provider => ({
      ...entry(base, `/profile/${provider.slug}`, 0.5),
      lastModified: provider.updated_at ? new Date(provider.updated_at) : new Date()
    }));
    return [...routes, ...categoryRoutes, ...profileRoutes];
  } catch {
    // Build without Supabase credentials still emits static category URLs; Vercel adds profiles at runtime.
    return [...routes, ...categoryRoutes];
  }
}
