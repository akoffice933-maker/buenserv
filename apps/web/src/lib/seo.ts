import type {Metadata} from 'next';

const locales = ['es', 'ru', 'en'] as const;

export function localizedMetadata(locale: string, path: string, title: string, description: string): Metadata {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://buenserv.com';
  const suffix = path ? `/${path.replace(/^\//, '')}` : '';
  return {
    title: `${title} | BuenServ`,
    description,
    alternates: {
      canonical: `${base}/${locale}${suffix}`,
      languages: Object.fromEntries(locales.map(item => [item === 'es' ? 'es-AR' : item, `${base}/${item}${suffix}`]))
    }
  };
}
