import Link from 'next/link';
import {getTranslations} from 'next-intl/server';

const locales = ['es', 'ru', 'en'] as const;

export async function SiteHeader({locale}: {locale: string}) {
  const t = await getTranslations('navigation');
  return <header className="sticky top-0 z-40 border-b border-black/7 bg-bs-canvas/92 backdrop-blur">
    <div className="mx-auto flex min-h-17 max-w-7xl items-center gap-5 px-5 lg:px-8">
      <Link href={`/${locale}`} className="font-display flex items-center gap-2 text-xl font-extrabold tracking-tight no-underline"><span className="grid size-7 place-items-center rounded-[9px] bg-bs-primary text-sm text-white">b</span>BuenServ</Link>
      <nav aria-label={t('label')} className="ml-auto hidden items-center gap-5 text-sm font-bold text-bs-ink/80 md:flex">
        <Link href={`/${locale}/how-it-works`}>{t('how')}</Link>
        <Link href={`/${locale}/categories`}>{t('categories')}</Link>
        <Link href={`/${locale}/providers`}>{t('providers')}</Link>
        <Link href={`/${locale}/faq`}>FAQ</Link>
      </nav>
      <div className="flex items-center gap-2">
        <div aria-label={t('language')} className="flex gap-0.5 rounded-lg bg-black/5 p-0.5">
          {locales.map(item => <Link key={item} href={`/${item}`} className={`rounded-md px-2 py-1 text-[11px] font-extrabold no-underline ${item === locale ? 'bg-white text-bs-ink shadow-sm' : 'text-bs-muted'}`}>{item.toUpperCase()}</Link>)}
        </div>
        <a href="https://t.me" className="hidden rounded-lg bg-bs-primary px-3 py-2 text-xs font-extrabold text-white no-underline hover:bg-bs-primary-dark sm:block">{t('telegram')} ↗</a>
      </div>
    </div>
  </header>;
}
