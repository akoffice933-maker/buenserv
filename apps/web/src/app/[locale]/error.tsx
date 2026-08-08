'use client';

import Link from 'next/link';
import {useLocale, useTranslations} from 'next-intl';

export default function LocaleError({reset}: {error: Error & {digest?: string}; reset: () => void}) {
  const t = useTranslations('error'); const locale = useLocale();
  return <main className="grid min-h-screen place-items-center bg-bs-canvas p-5 text-center"><div><span className="text-xs font-extrabold tracking-[.12em] text-bs-secondary uppercase">{t('eyebrow')}</span><h1 className="font-display mt-4 text-5xl font-extrabold tracking-[-.06em]">{t('title')}</h1><p className="mx-auto mt-5 max-w-md text-bs-muted">{t('body')}</p><div className="mt-7 flex justify-center gap-3"><button onClick={() => reset()} className="rounded-lg bg-bs-primary px-4 py-3 text-sm font-extrabold text-white">{t('retry')}</button><Link href={`/${locale}`} className="rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-extrabold no-underline">{t('home')}</Link></div></div></main>;
}
