import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';
import {localizedMetadata} from '@/lib/seo';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}) { const {locale} = await params; const t = await getTranslations({locale, namespace: 'how'}); return localizedMetadata(locale, 'how-it-works', t('title'), t('description')); }

export default async function HowItWorksPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params; const t = await getTranslations('how'); const steps = t.raw('steps') as string[];
  return <><SiteHeader locale={locale}/><main className="mx-auto min-h-[calc(100vh-68px)] max-w-7xl px-5 py-18 lg:px-8"><span className="text-[11px] font-extrabold tracking-[.12em] text-bs-primary uppercase">{t('eyebrow')}</span><h1 className="font-display mt-4 max-w-3xl text-5xl font-extrabold tracking-[-.06em] sm:text-6xl">{t('title')}</h1><p className="mt-5 max-w-xl text-lg text-bs-muted">{t('description')}</p><section className="mt-12 grid gap-4 md:grid-cols-3">{steps.map((step, index) => <article key={step} className="rounded-2xl border border-black/8 bg-white p-6"><span className="font-display text-sm font-extrabold text-bs-secondary">0{index + 1}</span><h2 className="font-display mt-12 text-2xl font-extrabold">{step}</h2></article>)}</section></main></>;
}
