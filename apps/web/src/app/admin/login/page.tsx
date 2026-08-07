'use client';

import {FormEvent, useState} from 'react';
import {createBrowserSupabaseClient} from '@/lib/supabase/browser';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  async function submit(event: FormEvent) {
    event.preventDefault(); setStatus('idle');
    try {
      const supabase = createBrowserSupabaseClient();
      const {error} = await supabase.auth.signInWithOtp({email, options: {emailRedirectTo: `${location.origin}/admin`}});
      setStatus(error ? 'error' : 'sent');
    } catch { setStatus('error'); }
  }
  return <main className="grid min-h-screen place-items-center p-5"><form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-black/8 bg-white p-7 shadow-[0_16px_34px_rgba(23,53,42,.08)]"><span className="text-xs font-extrabold tracking-[.12em] text-bs-primary uppercase">BuenServ · Admin</span><h1 className="font-display mt-3 text-3xl font-extrabold tracking-[-.05em]">Acceso interno</h1><p className="mt-2 text-sm text-bs-muted">Usá el email vinculado a tu perfil interno.</p><label className="mt-6 block text-sm font-bold" htmlFor="email">Email</label><input id="email" type="email" required value={email} onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-black/12 px-3 py-2.5" placeholder="admin@buenserv.com"/><button className="mt-5 w-full rounded-lg bg-bs-primary px-4 py-3 text-sm font-extrabold text-white">Enviar magic link</button>{status === 'sent' && <p className="mt-4 rounded-lg bg-bs-mint p-3 text-sm text-bs-primary-dark">Revisá tu email para continuar.</p>}{status === 'error' && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">No pudimos enviar el acceso. Intentá de nuevo.</p>}</form></main>;
}
