import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';

export default async function HomePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const t = await getTranslations('home');
  return <><SiteHeader locale={locale}/><main className="min-h-[calc(100vh-68px)] bg-[radial-gradient(circle_at_88%_12%,#e3f5ed_0,transparent_28%),#FAF9F6]">
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-36">
      <span className="text-[11px] font-extrabold tracking-[.12em] text-bs-primary uppercase">{t('eyebrow')}</span>
      <h1 className="font-display mt-4 max-w-4xl text-5xl leading-[.94] font-extrabold tracking-[-.065em] text-bs-ink sm:text-7xl">{t('title')}</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-bs-muted">{t('description')}</p>
      <a href="https://t.me" className="mt-8 inline-flex rounded-lg bg-bs-primary px-5 py-3.5 text-sm font-extrabold text-white no-underline shadow-[0_12px_24px_rgba(15,163,127,.18)] hover:-translate-y-0.5 hover:bg-bs-primary-dark">{t('telegram')}</a>
    </section>
  </main></>;
}
