import type {Metadata} from 'next';
import {Inter, Manrope} from 'next/font/google';
import {hasLocale, NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/i18n/routing';

const inter = Inter({
  variable: '--font-body',
  subsets: ['latin', 'cyrillic'],
  display: 'swap'
});

const manrope = Manrope({
  variable: '--font-display',
  subsets: ['latin', 'cyrillic'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'BuenServ',
  description: 'Servicios locales de confianza en Buenos Aires.',
  applicationName: 'BuenServ',
  manifest: '/manifest.webmanifest',
  icons: {icon: '/favicon.svg', apple: '/apple-touch-icon.png'},
  appleWebApp: {capable: true, title: 'BuenServ', statusBarStyle: 'default'}
};

export function generateStaticParams() {
  return routing.locales.map(locale => ({locale}));
}

export default async function LocaleLayout({children, params}: Readonly<{children: React.ReactNode; params: Promise<{locale: string}>}>) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const messages = await getMessages();
  return <html lang={locale === 'es' ? 'es-AR' : locale} className={`${inter.variable} ${manrope.variable}`}><body>{children && <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>}</body></html>;
}
