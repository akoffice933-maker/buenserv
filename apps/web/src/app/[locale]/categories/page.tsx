import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';

export default async function CategoriesPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const t = await getTranslations('categories');
  const items = t.raw('items') as string[];
  return <><SiteHeader locale={locale}/><main className="mx-auto min-h-[calc(100vh-68px)] max-w-7xl px-5 py-18 lg:px-8"><span className="text-[11px] font-extrabold tracking-[.12em] text-bs-primary uppercase">{t('eyebrow')}</span><h1 className="font-display mt-4 text-5xl font-extrabold tracking-[-.06em] sm:text-6xl">{t('title')}</h1><p className="mt-5 max-w-xl text-lg text-bs-muted">{t('description')}</p><section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item, index) => <article key={item} className="group rounded-2xl border border-black/8 bg-white p-5 transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(23,53,42,.09)]"><span className="font-display text-sm font-extrabold text-bs-secondary">0{index + 1}</span><h2 className="font-display mt-9 text-2xl font-extrabold tracking-[-.04em]">{item}</h2><p className="mt-2 text-sm text-bs-muted">{t('placeholder')}</p></article>)}</section></main></>;
}
