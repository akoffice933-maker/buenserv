'use client';
import {usePathname, useRouter} from 'next/navigation';
import {ReactNode} from 'react';

const NAV = [
  {href: '/mini-app', label: 'Inicio', icon: '🏠'},
  {href: '/mini-app/search', label: 'Buscar', icon: '🔎'},
  {href: '/mini-app/favorites', label: 'Favoritos', icon: '⭐'},
  {href: '/mini-app/profile', label: 'Perfil', icon: '👤'}
];

export default function MiniAppLayout({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const router = useRouter();

  // Bottom nav only on the main tabbed surfaces; detail/contact/onboarding keep full screen.
  const showNav = NAV.some((n) => pathname === n.href);

  return (
    <div style={{minHeight: '100vh', background: 'var(--tg-theme-bg-color, #FAF9F6)', color: 'var(--tg-theme-text-color, #1A1F1D)', fontFamily: 'Inter, system-ui, sans-serif'}}>
      <div style={{paddingBottom: showNav ? 76 : 0}}>{children}</div>
      {showNav && (
        <nav style={{position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', background: 'var(--tg-theme-bg-color, #FFFFFF)', borderTop: '1px solid rgba(0,0,0,.06)', padding: '6px 4px calc(6px + env(safe-area-inset-bottom))', zIndex: 10}}>
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                aria-current={active ? 'page' : undefined}
                style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, border: 0, background: 'transparent', minHeight: 48, cursor: 'pointer', color: active ? '#0FA37F' : 'var(--tg-theme-hint-color, #66706B)', fontWeight: active ? 600 : 400}}
              >
                <span style={{fontSize: 20}}>{item.icon}</span>
                <span style={{fontSize: 11}}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
