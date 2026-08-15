import './globals.css';
import type {Metadata} from 'next';
import Script from 'next/script';
import {Inter, Manrope} from 'next/font/google';
import {getLocale} from 'next-intl/server';
import {MiniAppProvider} from '@/context/MiniAppContext';

const inter = Inter({variable: '--font-body', subsets: ['latin', 'cyrillic'], display: 'swap'});
const manrope = Manrope({variable: '--font-display', subsets: ['latin', 'cyrillic'], display: 'swap'});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://buenserv.com'),
  title: 'BuenServ',
  description: 'Servicios locales de confianza en Buenos Aires.',
  applicationName: 'BuenServ',
  manifest: '/manifest.webmanifest',
  icons: {icon: '/favicon.svg', apple: '/apple-touch-icon.png'},
  appleWebApp: {capable: true, title: 'BuenServ', statusBarStyle: 'default'}
};

export default async function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  const locale = await getLocale().catch(() => 'es');
  return (
    <html lang={locale === 'es' ? 'es-AR' : locale} className={`${inter.variable} ${manrope.variable}`}>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body>
        <MiniAppProvider>{children}</MiniAppProvider>
      </body>
    </html>
  );
}
