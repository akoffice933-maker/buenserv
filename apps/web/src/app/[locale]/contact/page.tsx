import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';
import {getTelegramDeepLink} from '@/lib/telegram/deep-link';
import {localizedMetadata} from '@/lib/seo';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}) { const {locale} = await params; const t = await getTranslations({locale, namespace: 'contact'}); return localizedMetadata(locale, 'contact', t('title'), t('description')); }

export default async function ContactPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params; const t = await getTranslations('contact');
  return <><SiteHeader locale={locale}/><main className="grid min-h-[calc(100vh-68px)] place-items-center px-5 py-18"><section className="w-full max-w-2xl rounded-3xl border border-black/8 bg-white p-8 shadow-[0_16px_36px_rgba(23,53,42,.06)] sm:p-12"><span className="text-[11px] font-extrabold tracking-[.12em] text-bs-primary uppercase">{t('eyebrow')}</span><h1 className="font-display mt-4 text-5xl font-extrabold tracking-[-.06em] sm:text-6xl">{t('title')}</h1><p className="mt-5 max-w-xl text-lg text-bs-muted">{t('description')}</p><a href={getTelegramDeepLink('support')} className="mt-8 inline-block rounded-lg bg-bs-primary px-5 py-3.5 text-sm font-extrabold text-white no-underline">{t('cta')}</a><p className="mt-5 text-sm text-bs-muted">{t('response')}</p></section></main></>;
}
