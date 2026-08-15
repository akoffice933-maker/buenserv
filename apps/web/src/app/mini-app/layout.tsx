import type {ReactNode} from 'react';
import Script from 'next/script';
import {MiniAppProvider} from '@/context/MiniAppContext';

export default function MiniAppLayout({children}: {children: ReactNode}) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <MiniAppProvider>{children}</MiniAppProvider>
    </>
  );
}
