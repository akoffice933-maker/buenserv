import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';
import {getTelegramDeepLink} from '@/lib/telegram/deep-link';
import {localizedMetadata} from '@/lib/seo';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}) { const {locale} = await params; const t = await getTranslations({locale, namespace: 'pricing'}); return localizedMetadata(locale, 'pricing', t('title'), t('description')); }

export default async function PricingPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params; const t = await getTranslations('pricing');
  return <><SiteHeader locale={locale}/><main className="mx-auto min-h-[calc(100vh-68px)] max-w-6xl px-5 py-18 lg:px-8"><span className="text-[11px] font-extrabold tracking-[.12em] text-bs-primary uppercase">{t('eyebrow')}</span><h1 className="font-display mt-4 max-w-3xl text-5xl font-extrabold tracking-[-.06em] sm:text-6xl">{t('title')}</h1><p className="mt-5 max-w-2xl text-lg text-bs-muted">{t('description')}</p><section className="mt-12 grid gap-4 md:grid-cols-2"><article className="rounded-2xl border border-black/8 bg-white p-7"><h2 className="font-display text-2xl font-extrabold">{t('clientTitle')}</h2><p className="font-display mt-5 text-5xl font-extrabold tracking-[-.07em]">{t('clientPrice')}</p></article><article className="rounded-2xl border border-bs-primary/35 bg-bs-mint/45 p-7"><h2 className="font-display text-2xl font-extrabold">{t('providerTitle')}</h2><p className="font-display mt-5 text-5xl font-extrabold tracking-[-.07em]">{t('providerPrice')}</p><a href={getTelegramDeepLink('provider')} className="mt-8 inline-block rounded-lg bg-bs-primary px-4 py-3 text-sm font-extrabold text-white no-underline">{t('cta')}</a></article></section><p className="mt-8 max-w-3xl text-sm text-bs-muted">{t('note')}</p></main></>;
}
