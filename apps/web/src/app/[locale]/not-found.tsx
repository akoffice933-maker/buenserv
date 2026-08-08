import Link from 'next/link';
import {getLocale, getTranslations} from 'next-intl/server';

export default async function LocaleNotFound() {
  const t = await getTranslations('notFound');
  const locale = await getLocale();
  return <main className="grid min-h-screen place-items-center bg-bs-canvas p-5 text-center"><div><span className="text-xs font-extrabold tracking-[.12em] text-bs-primary uppercase">{t('eyebrow')}</span><h1 className="font-display mt-4 text-5xl font-extrabold tracking-[-.06em] sm:text-6xl">{t('title')}</h1><p className="mx-auto mt-5 max-w-md text-bs-muted">{t('body')}</p><Link href={`/${locale}`} className="mt-7 inline-block rounded-lg bg-bs-primary px-4 py-3 text-sm font-extrabold text-white no-underline">{t('cta')}</Link></div></main>;
}
