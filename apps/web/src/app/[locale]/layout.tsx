import type {Metadata} from 'next';
import {hasLocale, NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'BuenServ',
  description: 'Servicios locales de confianza en Buenos Aires.',
  applicationName: 'BuenServ',
  manifest: '/manifest.webmanifest',
  icons: {apple: '/apple-touch-icon.png'},
  appleWebApp: {capable: true, title: 'BuenServ', statusBarStyle: 'default'}
};

export function generateStaticParams() {
  return routing.locales.map(locale => ({locale}));
}

export default async function LocaleLayout({children, params}: Readonly<{children: React.ReactNode; params: Promise<{locale: string}>}>) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const messages = await getMessages();
  return <html lang={locale === 'es' ? 'es-AR' : locale}><body><NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider></body></html>;
}
