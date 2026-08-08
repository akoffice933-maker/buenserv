import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';
import {ProviderDirectory} from '@/components/provider-directory';
import {CATEGORY_SLUGS, isCategorySlug} from '@/lib/categories';
import {localizedMetadata} from '@/lib/seo';

export function generateStaticParams() {
  return ['es', 'ru', 'en'].flatMap(locale => CATEGORY_SLUGS.map(slug => ({locale, slug})));
}

export async function generateMetadata({params}: {params: Promise<{locale: string; slug: string}>}) { const {locale, slug} = await params; if (!isCategorySlug(slug)) notFound(); const t = await getTranslations({locale, namespace: 'categories'}); const labels = t.raw('items') as Record<(typeof CATEGORY_SLUGS)[number], string>; const title = labels[slug]; return localizedMetadata(locale, `categories/${slug}`, `${title} · Buenos Aires`, t('description')); }

export default async function CategoryDetailPage({params}: {params: Promise<{locale: string; slug: string}>}) {
  const {locale, slug} = await params;
  if (!isCategorySlug(slug)) notFound();
  const t = await getTranslations('categories');
  const labels = t.raw('items') as Record<(typeof CATEGORY_SLUGS)[number], string>;
  const name = labels[slug];
  return <><SiteHeader locale={locale}/><main className="mx-auto min-h-[calc(100vh-68px)] max-w-7xl px-5 py-18 lg:px-8"><span className="text-[11px] font-extrabold tracking-[.12em] text-bs-primary uppercase">{t('eyebrow')}</span><h1 className="font-display mt-4 text-5xl font-extrabold tracking-[-.06em] sm:text-6xl">{name} · Buenos Aires</h1><p className="mt-5 max-w-xl text-lg text-bs-muted">{t('placeholder')}</p><div className="mt-10"><p className="text-sm text-bs-muted">{t('directoryNotice')}</p><ProviderDirectory category={slug} locale={locale}/></div></main></>;
}
