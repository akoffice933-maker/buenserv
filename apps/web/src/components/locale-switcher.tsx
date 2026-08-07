'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

const locales = ['es', 'ru', 'en'] as const;

export function LocaleSwitcher({locale, label}: {locale: string; label: string}) {
  const pathname = usePathname();
  const localizedPath = (target: string) => {
    const parts = pathname.split('/');
    if (locales.includes(parts[1] as typeof locales[number])) parts[1] = target;
    else parts.splice(1, 0, target);
    return parts.join('/') || `/${target}`;
  };

  return <div aria-label={label} className="flex gap-0.5 rounded-lg bg-black/5 p-0.5">
    {locales.map(item => <Link key={item} href={localizedPath(item)} className={`rounded-md px-2 py-1 text-[11px] font-extrabold no-underline ${item === locale ? 'bg-white text-bs-ink shadow-sm' : 'text-bs-muted'}`}>{item.toUpperCase()}</Link>)}
  </div>;
}
