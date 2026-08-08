'use client';

import {useState} from 'react';
import {createBrowserSupabaseClient} from '@/lib/supabase/browser';

export function AdminSignOut() {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try { await createBrowserSupabaseClient().auth.signOut(); } finally { location.assign('/admin/login'); }
  }
  return <button onClick={signOut} disabled={busy} className="fixed right-5 top-5 z-50 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-extrabold text-bs-ink shadow-sm disabled:opacity-50">{busy ? '…' : 'Salir'}</button>;
}
