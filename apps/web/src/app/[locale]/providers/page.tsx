import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';

export default async function ProvidersPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params; const t = await getTranslations('providers');
  return <><SiteHeader locale={locale}/><main className="min-h-[calc(100vh-68px)] bg-[radial-gradient(circle_at_85%_12%,#e3f5ed_0,transparent_28%),#FAF9F6]"><section className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-34"><span className="text-[11px] font-extrabold tracking-[.12em] text-bs-primary uppercase">{t('eyebrow')}</span><h1 className="font-display mt-4 max-w-3xl text-5xl font-extrabold tracking-[-.06em] sm:text-7xl">{t('title')}</h1><p className="mt-6 max-w-xl text-lg text-bs-muted">{t('description')}</p><a href="https://t.me?start=provider" className="mt-8 inline-block rounded-lg bg-bs-primary px-5 py-3.5 text-sm font-extrabold text-white no-underline">{t('cta')}</a></section></main></>;
}
