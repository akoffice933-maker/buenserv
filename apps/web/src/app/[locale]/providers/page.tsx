import Image from 'next/image';
import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';
import {getTelegramDeepLink} from '@/lib/telegram/deep-link';
import {localizedMetadata} from '@/lib/seo';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}) { const {locale} = await params; const t = await getTranslations({locale, namespace: 'providers'}); return localizedMetadata(locale, 'providers', t('title'), t('description')); }

export default async function ProvidersPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params; const t = await getTranslations('providers');
  return <><SiteHeader locale={locale}/><main className="min-h-[calc(100vh-68px)] bg-[radial-gradient(circle_at_85%_12%,#e3f5ed_0,transparent_28%),#FAF9F6]"><section className="mx-auto grid max-w-7xl gap-10 px-5 py-24 lg:grid-cols-[1fr_.85fr] lg:items-center lg:px-8 lg:py-34"><div><span className="text-[11px] font-extrabold tracking-[.12em] text-bs-primary uppercase">{t('eyebrow')}</span><h1 className="font-display mt-4 max-w-3xl text-5xl font-extrabold tracking-[-.06em] sm:text-7xl">{t('title')}</h1><p className="mt-6 max-w-xl text-lg text-bs-muted">{t('description')}</p><a href={getTelegramDeepLink('provider')} className="mt-8 inline-block rounded-lg bg-bs-primary px-5 py-3.5 text-sm font-extrabold text-white no-underline">{t('cta')}</a></div><div className="relative min-h-80 overflow-hidden rounded-3xl shadow-[0_20px_40px_rgba(23,53,42,.14)]"><Image src="/assets/provider-onboarding.webp" alt="" fill sizes="(max-width: 1024px) 100vw, 42vw" className="object-cover"/></div></section></main></>;
}
