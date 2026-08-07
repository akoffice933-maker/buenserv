'use client';

import {FormEvent, useState} from 'react';
import {useTranslations} from 'next-intl';

export function ReportProvider({providerId}: {providerId: string}) {
  const t = useTranslations('report');
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'rateLimited'>('idle');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setStatus('idle');
    const response = await fetch('/api/reports', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({providerId, reason: form.get('reason'), details: form.get('details'), website: form.get('website')})});
    setStatus(response.ok ? 'success' : response.status === 429 ? 'rateLimited' : 'error');
  }
  if (!open) return <button onClick={() => setOpen(true)} className="mt-4 text-xs font-bold text-bs-muted underline">{t('open')}</button>;
  return <form onSubmit={submit} className="mt-5 border-t border-black/8 pt-5"><label className="block text-xs font-bold" htmlFor="report-reason">{t('reason')}</label><select id="report-reason" name="reason" className="mt-2 w-full rounded-lg border border-black/12 p-2 text-sm"><option value="profile_mismatch">{t('profileMismatch')}</option><option value="no_response">{t('noResponse')}</option><option value="spam">{t('spam')}</option><option value="safety">{t('safety')}</option><option value="other">{t('other')}</option></select><label className="mt-4 block text-xs font-bold" htmlFor="report-details">{t('details')}</label><textarea id="report-details" name="details" required minLength={10} maxLength={2000} className="mt-2 min-h-24 w-full rounded-lg border border-black/12 p-2 text-sm"/><input name="website" tabIndex={-1} autoComplete="off" className="absolute left-[-9999px]" aria-hidden="true"/><button className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-extrabold text-red-700">{t('send')}</button>{status === 'success' && <p role="status" className="mt-3 text-sm font-semibold text-bs-primary-dark">{t('success')}</p>}{status === 'rateLimited' && <p role="alert" className="mt-3 text-sm font-semibold text-amber-800">{t('rateLimited')}</p>}{status === 'error' && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{t('error')}</p>}</form>;
}
