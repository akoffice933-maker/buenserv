'use client';

import {useEffect, useState} from 'react';
import {AppRoot} from '@telegram-apps/telegram-ui';
import {init, retrieveLaunchParams} from '@telegram-apps/sdk';

export default function MiniAppLayout({children}: {children: React.ReactNode}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      init();
      const lp = retrieveLaunchParams();
      if (lp?.tgWebAppData) {
        document.documentElement.style.setProperty('--tg-theme', 'true');
      }
    } catch {}
    setReady(true);
  }, []);

  if (!ready) return <div className="flex min-h-screen items-center justify-center p-5"><p className="text-bs-muted">Loading...</p></div>;

  return <AppRoot>{children}</AppRoot>;
}