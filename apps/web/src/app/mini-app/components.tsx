'use client';
import {useState} from 'react';

export type MiniLocale = 'es-AR' | 'ru' | 'en';

export const LOCALE_LABEL: Record<MiniLocale, string> = {'es-AR': 'ES', ru: 'RU', en: 'EN'};

export function getTelegramInitData(): string {
  try {
    const w = window as unknown as {Telegram?: {WebApp?: {initData?: string}}};
    if (w.Telegram?.WebApp?.initData) return w.Telegram.WebApp.initData;
  } catch { /* ignore */ }
  try {
    const hash = window.location.hash;
    if (hash) {
      const p = new URLSearchParams(hash.replace(/^#/, ''));
      const d = p.get('tgWebAppData');
      if (d) return d;
    }
  } catch { /* ignore */ }
  try {
    const p = new URLSearchParams(window.location.search);
    const d = p.get('tgWebAppData');
    if (d) return d;
  } catch { /* ignore */ }
  return '';
}

export function closeMiniApp() {
  try {
    const w = window as unknown as {Telegram?: {WebApp?: {close?: () => void}}};
    w.Telegram?.WebApp?.close?.();
  } catch { /* ignore */ }
}

/** Locale chip in the header: tap → compact language sheet → save → refresh. */
export function LocaleChip({locale, onLocaleChange}: {locale: MiniLocale; onLocaleChange: (l: MiniLocale) => void}) {
  const [open, setOpen] = useState(false);
  const save = async (l: MiniLocale) => {
    setOpen(false);
    onLocaleChange(l);
    try {
      const initData = getTelegramInitData();
      if (!initData) return;
      await fetch('/api/mini-app/profile/locale', {
        method: 'POST',
        headers: {'content-type': 'application/json', 'x-telegram-init-data': initData},
        body: JSON.stringify({locale: l})
      });
    } catch { /* ignore */ }
  };
  return (
    <div style={{position: 'relative'}}>
      <button onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open} style={{minHeight: 44, minWidth: 44, border: '1px solid rgba(0,0,0,.1)', background: 'var(--tg-theme-secondary-bg-color, #fff)', borderRadius: 12, padding: '0 12px', fontWeight: 600, cursor: 'pointer', color: 'var(--tg-theme-text-color, #1A1F1D)'}}>
        {LOCALE_LABEL[locale]}
      </button>
      {open && (
        <div role="listbox" style={{position: 'absolute', right: 0, top: 48, background: 'var(--tg-theme-bg-color, #fff)', borderRadius: 16, boxShadow: '0 13px 32px rgba(23,53,42,.12)', padding: 6, zIndex: 20, minWidth: 120}}>
          {(['es-AR', 'ru', 'en'] as MiniLocale[]).map((l) => (
            <button key={l} role="option" aria-selected={l === locale} onClick={() => save(l)} style={{display: 'block', width: '100%', textAlign: 'left', border: 0, background: l === locale ? 'rgba(15,163,127,.12)' : 'transparent', color: 'var(--tg-theme-text-color, #1A1F1D)', padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: l === locale ? 600 : 400}}>
              {l === 'es-AR' ? '🇪🇸 Español' : l === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Card({children, onClick, style}: {children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={{background: 'var(--tg-theme-secondary-bg-color, #fff)', borderRadius: 16, padding: 16, cursor: onClick ? 'pointer' : 'default', ...style}}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({children, onClick, disabled}: {children: React.ReactNode; onClick?: () => void; disabled?: boolean}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{minHeight: 48, width: '100%', border: 0, borderRadius: 14, background: 'var(--tg-theme-button-color, #0FA37F)', color: 'var(--tg-theme-button-text-color, #fff)', fontWeight: 600, fontSize: 16, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1}}>
      {children}
    </button>
  );
}

export function SecondaryButton({children, onClick}: {children: React.ReactNode; onClick?: () => void}) {
  return (
    <button onClick={onClick} style={{minHeight: 48, width: '100%', border: '1px solid rgba(15,163,127,.5)', borderRadius: 14, background: 'transparent', color: '#0FA37F', fontWeight: 600, fontSize: 16, cursor: 'pointer'}}>
      {children}
    </button>
  );
}
