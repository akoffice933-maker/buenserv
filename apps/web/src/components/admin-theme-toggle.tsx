'use client';

import {useEffect, useState} from 'react';

export function AdminThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { const enabled = localStorage.getItem('buenserv-admin-theme') === 'dark'; setDark(enabled); document.documentElement.dataset.adminTheme = enabled ? 'dark' : 'light'; }, []);
  function toggle() { const next = !dark; setDark(next); document.documentElement.dataset.adminTheme = next ? 'dark' : 'light'; localStorage.setItem('buenserv-admin-theme', next ? 'dark' : 'light'); }
  return <button onClick={toggle} className="fixed right-5 top-16 z-50 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-extrabold text-bs-ink shadow-sm">{dark ? '☀ Tema' : '◐ Tema'}</button>;
}
