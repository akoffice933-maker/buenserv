import {hasLocale, NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/i18n/routing';
import {SiteFooter} from '@/components/site-footer';

export function generateStaticParams() {
  return routing.locales.map(locale => ({locale}));
}

export default async function LocaleLayout({children, params}: Readonly<{children: React.ReactNode; params: Promise<{locale: string}>}>) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const messages = await getMessages();
  return <NextIntlClientProvider messages={messages}><div lang={locale === 'es' ? 'es-AR' : locale}>{children}<SiteFooter locale={locale}/></div></NextIntlClientProvider>;
}
