import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';
import {localizedMetadata} from '@/lib/seo';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}) { const {locale} = await params; const t = await getTranslations({locale, namespace: 'faq'}); return localizedMetadata(locale, 'faq', t('title'), t('title')); }

export default async function FaqPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params; const t = await getTranslations('faq'); const items = t.raw('items') as Array<{q: string; a: string}>;
  return <><SiteHeader locale={locale}/><main className="mx-auto min-h-[calc(100vh-68px)] max-w-4xl px-5 py-18"><span className="text-[11px] font-extrabold tracking-[.12em] text-bs-primary uppercase">{t('eyebrow')}</span><h1 className="font-display mt-4 text-5xl font-extrabold tracking-[-.06em] sm:text-6xl">{t('title')}</h1><section className="mt-12 divide-y divide-black/8 border-y border-black/8">{items.map(item => <details key={item.q} className="py-5"><summary className="cursor-pointer font-display text-xl font-extrabold">{item.q}</summary><p className="mt-3 max-w-2xl text-bs-muted">{item.a}</p></details>)}</section></main></>;
}
