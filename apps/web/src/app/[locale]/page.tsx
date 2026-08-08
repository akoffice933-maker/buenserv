import Image from 'next/image';
import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';
import {getTelegramDeepLink} from '@/lib/telegram/deep-link';
import {localizedMetadata} from '@/lib/seo';
import {CATEGORY_META, CATEGORY_SLUGS} from '@/lib/categories';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params; const t = await getTranslations({locale, namespace: 'home'});
  return localizedMetadata(locale, '', t('title'), t('description'));
}

export default async function HomePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const t = await getTranslations('home');
  const categories = (await getTranslations('categories')).raw('items') as Record<(typeof CATEGORY_SLUGS)[number], string>;
  return <><SiteHeader locale={locale}/><main className="bg-[radial-gradient(circle_at_88%_12%,#e3f5ed_0,transparent_28%),#FAF9F6]"><section className="mx-auto grid min-h-[calc(100vh-68px)] max-w-7xl gap-10 px-5 py-18 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:py-24"><div><span className="text-[11px] font-extrabold tracking-[.12em] text-bs-primary uppercase">{t('eyebrow')}</span><h1 className="font-display mt-4 max-w-4xl text-5xl leading-[.94] font-extrabold tracking-[-.065em] text-bs-ink sm:text-7xl">{t('title')}</h1><p className="mt-6 max-w-xl text-lg leading-relaxed text-bs-muted">{t('description')}</p><a href={getTelegramDeepLink()} className="mt-8 inline-flex rounded-lg bg-bs-primary px-5 py-3.5 text-sm font-extrabold text-white no-underline shadow-[0_12px_24px_rgba(15,163,127,.18)] hover:-translate-y-0.5 hover:bg-bs-primary-dark">{t('telegram')}</a></div><div className="relative min-h-80 overflow-hidden rounded-3xl shadow-[0_20px_40px_rgba(23,53,42,.14)]"><Image src="/assets/buenserv-hero.webp" alt={t('heroAlt')} fill priority sizes="(max-width: 1024px) 100vw, 48vw" className="object-cover"/></div></section><section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><h2 className="font-display text-3xl font-extrabold tracking-[-.05em]">{(await getTranslations('categories'))('title')}</h2></div><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{CATEGORY_SLUGS.map(slug => <a key={slug} href={`/${locale}/categories/${slug}`} className="group flex items-center gap-3 rounded-2xl border border-black/8 bg-white p-3 no-underline transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(23,53,42,.09)]"><Image src={`/assets/${CATEGORY_META[slug].image}`} alt="" width={72} height={56} className="h-14 w-[72px] rounded-xl object-cover"/><span className="font-display text-lg font-extrabold">{categories[slug]}</span></a>)}</div></section></main></>;
}
