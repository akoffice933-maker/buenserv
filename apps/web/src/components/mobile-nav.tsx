'use client';

import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';

type Labels = {how: string; categories: string; providers: string; faq: string; telegram: string; openMenu: string; closeMenu: string};

export function MobileNav({locale, labels, telegramHref}: {locale: string; labels: Labels; telegramHref: string}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const links = [['how-it-works', labels.how], ['categories', labels.categories], ['providers', labels.providers], ['faq', labels.faq]];
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const closeOnOutside = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false); };
    window.addEventListener('keydown', closeOnEscape); window.addEventListener('pointerdown', closeOnOutside);
    return () => { window.removeEventListener('keydown', closeOnEscape); window.removeEventListener('pointerdown', closeOnOutside); };
  }, []);
  return <div ref={root} className="relative md:hidden"><button onClick={() => setOpen(value => !value)} aria-label={open ? labels.closeMenu : labels.openMenu} aria-expanded={open} aria-controls="mobile-navigation" className="grid size-9 place-items-center rounded-lg border border-black/10 bg-white text-xl">{open ? '×' : '☰'}</button>{open && <nav id="mobile-navigation" className="absolute right-0 top-11 z-50 flex w-60 flex-col gap-1 rounded-xl border border-black/10 bg-white p-2 shadow-[0_16px_30px_rgba(23,53,42,.14)]">{links.map(([path, label]) => <Link key={path} href={`/${locale}/${path}`} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-bold no-underline hover:bg-bs-mint">{label}</Link>)}<a href={telegramHref} className="mt-1 rounded-lg bg-bs-primary px-3 py-2.5 text-center text-sm font-extrabold text-white no-underline">{labels.telegram} ↗</a></nav>}</div>;
}
