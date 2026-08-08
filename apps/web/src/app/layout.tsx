import './globals.css';
import type {Metadata} from 'next';
import {Inter, Manrope} from 'next/font/google';

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

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="es-AR" className={`${inter.variable} ${manrope.variable}`}><body>{children}</body></html>;
}
