'use client';

import {useEffect, useState} from 'react';
import {retrieveLaunchParams, postEvent} from '@telegram-apps/sdk';

const CATEGORIES = [
  {value: 'limpieza', label: 'Limpieza'},
  {value: 'reparaciones', label: 'Reparaciones'},
  {value: 'mascotas', label: 'Mascotas'},
  {value: 'mudanzas', label: 'Mudanzas'},
  {value: 'clases', label: 'Clases'},
  {value: 'mensajeria', label: 'Mensajería'},
  {value: 'taxi-traslados', label: 'Taxi'},
];

const BARRIOS = [
  {value: 'palermo', label: 'Palermo'},
  {value: 'recoleta', label: 'Recoleta'},
  {value: 'belgrano', label: 'Belgrano'},
  {value: 'caballito', label: 'Caballito'},
];

type Step = 'category' | 'barrio' | 'description' | 'price' | 'photo' | 'confirm' | 'done';

const STEPS: Step[] = ['category', 'barrio', 'description', 'price', 'photo', 'confirm', 'done'];

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState('');
  const [barrio, setBarrio] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    try {
      const lp = retrieveLaunchParams();
      if (lp?.tgWebAppData) postEvent('web_app_expand');
    } catch {}
    setStarted(true);
  }, []);

  if (!started) return <div className="flex min-h-screen items-center justify-center p-5"><p className="text-bs-muted">Loading...</p></div>;

  const stepIdx = STEPS.indexOf(step);
  const progress = Math.round(((stepIdx) / (STEPS.length - 1)) * 100);

  const next = () => {
    setError('');
    if (step === 'category' && !category) { setError('Select a category'); return; }
    if (step === 'barrio' && !barrio) { setError('Select a barrio'); return; }
    if (step === 'description' && description.length < 20) { setError('Minimum 20 characters'); return; }
    if (step === 'price' && (!price || isNaN(Number(price)) || Number(price) <= 0)) { setError('Enter a valid price in ARS'); return; }
    if (step === 'photo' && !photo) { setError('Upload a photo'); return; }
    if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1]);
  };

  const back = () => { if (stepIdx > 0) setStep(STEPS[stepIdx - 1]); };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('category', category);
      fd.append('barrio', barrio);
      fd.append('description', description);
      fd.append('price', price);
      if (photo) fd.append('photo', photo);

      const res = await fetch('/api/mini-app/submit', {method: 'POST', body: fd});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Submission failed');
      try { postEvent('web_app_close'); } catch {}
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  const s = {display: 'flex', flexDirection: 'column' as const, gap: 16, padding: 16, maxWidth: 400, margin: '0 auto', minHeight: '100vh', background: 'var(--tg-theme-bg-color, #fff)', color: 'var(--tg-theme-text-color, #000)'};

  if (step === 'done') return <div style={s}><h1 style={{fontSize: 24, textAlign: 'center', marginTop: 60}}>✅ Submitted!</h1><p style={{textAlign: 'center', color: 'var(--tg-theme-hint-color, #999)'}}>Your profile is now pending moderation.</p></div>;

  const label: Record<string, string> = {
    category: 'What service do you offer?',
    barrio: 'Which neighbourhood?',
    description: 'Describe your experience',
    price: 'Price in ARS',
    photo: 'Upload a profile photo',
    confirm: 'Confirm your details',
  };

  return (
    <div style={s}>
      <div style={{height: 4, background: 'var(--tg-theme-secondary-bg-color, #eee)', borderRadius: 2, overflow: 'hidden'}}>
        <div style={{width: `${progress}%`, height: '100%', background: 'var(--tg-theme-button-color, #2481cc)', transition: 'width 0.3s'}} />
      </div>
      <p style={{fontSize: 12, color: 'var(--tg-theme-hint-color, #999)', textTransform: 'uppercase'}}>{stepIdx + 1} / {STEPS.length - 1}</p>
      <h2 style={{fontSize: 20, margin: 0}}>{label[step]}</h2>

      {step === 'category' && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => { setCategory(c.value); next(); }}
              style={{padding: 14, border: `1px solid ${category === c.value ? 'var(--tg-theme-button-color, #2481cc)' : 'var(--tg-theme-secondary-bg-color, #ddd)'}`, borderRadius: 12, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', color: 'var(--tg-theme-text-color, #000)', fontSize: 16, textAlign: 'left', cursor: 'pointer'}}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {step === 'barrio' && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          {BARRIOS.map(b => (
            <button key={b.value} onClick={() => { setBarrio(b.value); next(); }}
              style={{padding: 14, border: `1px solid ${barrio === b.value ? 'var(--tg-theme-button-color, #2481cc)' : 'var(--tg-theme-secondary-bg-color, #ddd)'}`, borderRadius: 12, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', color: 'var(--tg-theme-text-color, #000)', fontSize: 16, textAlign: 'left', cursor: 'pointer'}}>
              {b.label}
            </button>
          ))}
        </div>
      )}

      {step === 'description' && (
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell us about your experience and service (min 20 characters)"
          style={{padding: 14, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)', borderRadius: 12, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', color: 'var(--tg-theme-text-color, #000)', fontSize: 16, minHeight: 120, resize: 'none'}} />
      )}

      {step === 'price' && (
        <input value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 18000" type="number"
          style={{padding: 14, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)', borderRadius: 12, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', color: 'var(--tg-theme-text-color, #000)', fontSize: 16}} />
      )}

      {step === 'photo' && (
        <input type="file" accept="image/*" capture="environment" onChange={e => setPhoto(e.target.files?.[0] ?? null)}
          style={{padding: 14, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)', borderRadius: 12, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', color: 'var(--tg-theme-text-color, #000)', fontSize: 14}} />
      )}

      {step === 'confirm' && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
          {[['Category', category], ['Barrio', barrio], ['Description', description.slice(0, 60) + '...'], ['Price', `$${price} ARS`]].map(([k, v]) => (
            <div key={k} style={{padding: 12, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)', borderRadius: 12, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)'}}>
              <p style={{margin: 0, fontSize: 12, color: 'var(--tg-theme-hint-color, #999)'}}>{k}</p>
              <p style={{margin: '4px 0 0', fontSize: 16}}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{color: 'var(--tg-theme-destructive-text-color, red)', fontSize: 13, margin: 0}}>{error}</p>}

      <div style={{display: 'flex', gap: 8, marginTop: 'auto'}}>
        {step !== 'category' && step !== 'confirm' && (
          <button onClick={back} style={{flex: 1, padding: 14, borderRadius: 12, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)', background: 'transparent', color: 'var(--tg-theme-text-color, #000)', fontSize: 16, cursor: 'pointer'}}>Back</button>
        )}
        {step === 'confirm' ? (
          <button onClick={submit} disabled={submitting} style={{flex: 1, padding: 14, borderRadius: 12, border: 'none', background: 'var(--tg-theme-button-color, #2481cc)', color: 'var(--tg-theme-button-text-color, #fff)', fontSize: 16, cursor: 'pointer'}}>{submitting ? 'Sending...' : 'Submit'}</button>
        ) : null}
      </div>
    </div>
  );
}