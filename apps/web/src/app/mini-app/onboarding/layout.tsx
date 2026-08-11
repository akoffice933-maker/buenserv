'use client';

import {useEffect, useState} from 'react';

export default function MiniAppLayout({children}: {children: React.ReactNode}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const w = window as unknown as {Telegram?: {WebApp?: {initData?: string}}};
      if (w.Telegram?.WebApp?.initData) document.documentElement.style.setProperty('--tg-theme', 'true');
    } catch {}
    setReady(true);
  }, []);
  if (!ready) return <div className="flex min-h-screen items-center justify-center p-5"><p className="text-bs-muted">Loading...</p></div>;
  return <div data-tg-mini-app>{children}</div>;
}
