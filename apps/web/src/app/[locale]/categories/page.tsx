import Image from 'next/image';
import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';
import {CATEGORY_META, CATEGORY_SLUGS} from '@/lib/categories';
import {localizedMetadata} from '@/lib/seo';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params; const t = await getTranslations({locale, namespace: 'categories'});
  return localizedMetadata(locale, 'categories', t('title'), t('description'));
}

export default async function CategoriesPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const t = await getTranslations('categories');
  const items = t.raw('items') as Record<(typeof CATEGORY_SLUGS)[number], string>;
  return <><SiteHeader locale={locale}/><main className="mx-auto min-h-[calc(100vh-68px)] max-w-7xl px-5 py-18 lg:px-8"><span className="text-[11px] font-extrabold tracking-[.12em] text-bs-primary uppercase">{t('eyebrow')}</span><h1 className="font-display mt-4 text-5xl font-extrabold tracking-[-.06em] sm:text-6xl">{t('title')}</h1><p className="mt-5 max-w-xl text-lg text-bs-muted">{t('description')}</p><section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{CATEGORY_SLUGS.map((slug, index) => <Link key={slug} href={`/${locale}/categories/${slug}`} className="group overflow-hidden rounded-2xl border border-black/8 bg-white no-underline transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(23,53,42,.09)]"><Image src={`/assets/${CATEGORY_META[slug].image}`} alt="" width={480} height={220} className="h-32 w-full object-cover"/><div className="p-5"><span className="font-display text-sm font-extrabold text-bs-secondary">0{index + 1}</span><h2 className="font-display mt-5 text-2xl font-extrabold tracking-[-.04em]">{items[slug]}</h2><p className="mt-2 text-sm text-bs-muted">{t('placeholder')}</p></div></Link>)}</section></main></>;
}
