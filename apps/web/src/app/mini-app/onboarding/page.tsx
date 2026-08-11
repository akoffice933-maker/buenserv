'use client';

import {useEffect, useState} from 'react';

type Lang = 'es' | 'ru' | 'en';

const LANG_LABELS: Record<Lang, string> = {es: '🇪🇸 Español', ru: '🇷🇺 Русский', en: '🇬🇧 English'};

const I18N = {
  es: {
    title: 'Registrarse como prestador',
    category: '¿Qué servicio ofrecés?',
    barrio: '¿En qué barrio trabajás?',
    description: 'Contanos sobre tu experiencia',
    price: 'Precio orientativo en ARS',
    photo: 'Subí una foto de perfil',
    confirm: 'Confirmá tus datos',
    submitted: '✅ ¡Enviado!',
    submittedDesc: 'Tu perfil está en moderación. Enviá tu foto en el chat de Telegram.',
    cat: ['Limpieza', 'Reparaciones', 'Mascotas', 'Mudanzas', 'Clases', 'Mensajería', 'Taxi'],
    bar: ['Palermo', 'Recoleta', 'Belgrano', 'Caballito'],
    descPH: 'Contanos sobre tu experiencia (mín. 20 caracteres)',
    pricePH: 'Ej: 18000',
    errCat: 'Elegí una categoría',
    errBar: 'Elegí un barrio',
    errDesc: 'Mínimo 20 caracteres',
    errPrice: 'Precio inválido',
    next: 'Siguiente',
    back: 'Atrás',
    submit: 'Enviar',
    sending: 'Enviando...',
    error: 'Error al enviar',
    lang: 'Idioma',
  },
  ru: {
    title: 'Регистрация исполнителя',
    category: 'Какую услугу предлагаете?',
    barrio: 'В каком районе работаете?',
    description: 'Расскажите о своём опыте',
    price: 'Цена в ARS',
    photo: 'Загрузите фото профиля',
    confirm: 'Подтвердите данные',
    submitted: '✅ Отправлено!',
    submittedDesc: 'Ваш профиль на модерации. Отправьте фото в чат Telegram.',
    cat: ['Уборка', 'Ремонт', 'Питомцы', 'Переезды', 'Занятия', 'Курьеры', 'Такси'],
    bar: ['Палермо', 'Реколета', 'Бельграно', 'Кабальито'],
    descPH: 'Расскажите об опыте (мин. 20 символов)',
    pricePH: 'Пример: 18000',
    errCat: 'Выберите категорию',
    errBar: 'Выберите район',
    errDesc: 'Минимум 20 символов',
    errPrice: 'Некорректная цена',
    next: 'Далее',
    back: 'Назад',
    submit: 'Отправить',
    sending: 'Отправка...',
    error: 'Ошибка отправки',
    lang: 'Язык',
  },
  en: {
    title: 'Register as provider',
    category: 'What service do you offer?',
    barrio: 'Which neighbourhood?',
    description: 'Tell us about your experience',
    price: 'Price in ARS',
    photo: 'Upload a profile photo',
    confirm: 'Confirm your details',
    submitted: '✅ Submitted!',
    submittedDesc: 'Your profile is pending moderation. Send your photo in the Telegram chat.',
    cat: ['Cleaning', 'Repairs', 'Pets', 'Moving', 'Lessons', 'Delivery', 'Taxi'],
    bar: ['Palermo', 'Recoleta', 'Belgrano', 'Caballito'],
    descPH: 'Tell us about your experience (min 20 chars)',
    pricePH: 'e.g. 18000',
    errCat: 'Select a category',
    errBar: 'Select a barrio',
    errDesc: 'Minimum 20 characters',
    errPrice: 'Invalid price',
    next: 'Next',
    back: 'Back',
    submit: 'Submit',
    sending: 'Sending...',
    error: 'Submission failed',
    lang: 'Language',
  }
};

const CATEGORIES = ['limpieza', 'reparaciones', 'mascotas', 'mudanzas', 'clases', 'mensajeria', 'taxi-traslados'];
const BARRIOS = ['palermo', 'recoleta', 'belgrano', 'caballito'];

type Step = 'category' | 'barrio' | 'description' | 'price' | 'confirm' | 'done';
const STEPS: Step[] = ['category', 'barrio', 'description', 'price', 'confirm', 'done'];

export default function OnboardingPage() {
  const [lang, setLang] = useState<Lang>('es');
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState('');
  const [barrio, setBarrio] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [initData, setInitData] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  const [showLang, setShowLang] = useState(false);

  const t = I18N[lang];

  useEffect(() => {
    try {
      const w = window as unknown as {Telegram?: {WebApp?: {initData?: string; expand?: () => void; close?: () => void}}};
      if (w.Telegram?.WebApp?.initData) {
        setInitData(w.Telegram.WebApp.initData);
        w.Telegram.WebApp.expand?.();
      }
    } catch {}
    setStarted(true);
  }, []);

  if (!started) return <div className="flex min-h-screen items-center justify-center p-5"><p className="text-bs-muted">Loading...</p></div>;

  const stepIdx = STEPS.indexOf(step);
  const progress = Math.round(((stepIdx) / (STEPS.length - 1)) * 100);

  const next = () => {
    setError('');
    if (step === 'category' && !category) { setError(t.errCat); return; }
    if (step === 'barrio' && !barrio) { setError(t.errBar); return; }
    if (step === 'description' && description.length < 20) { setError(t.errDesc); return; }
    if (step === 'price' && (!price || isNaN(Number(price)) || Number(price) <= 0)) { setError(t.errPrice); return; }
    if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1]);
  };

  const back = () => { if (stepIdx > 0) setStep(STEPS[stepIdx - 1]); };

  const submit = async () => {
    setSubmitting(true); setError('');
    try {
      const fd = new FormData();
      fd.append('category', category);
      fd.append('barrio', barrio);
      fd.append('description', description);
      fd.append('price', price);
      fd.append('initData', initData);
      const res = await fetch('/api/mini-app/submit', {method: 'POST', body: fd});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.error);
      try { (window as unknown as {Telegram?: {WebApp?: {close?: () => void}}}).Telegram?.WebApp?.close?.(); } catch {}
      setStep('done');
    } catch (err) { setError(err instanceof Error ? err.message : t.error); }
    finally { setSubmitting(false); }
  };

  const s: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: 16, padding: 16, maxWidth: 400, margin: '0 auto', minHeight: '100vh', background: 'var(--tg-theme-bg-color, #fff)', color: 'var(--tg-theme-text-color, #000)'};

  if (step === 'done') return <div style={s}><h1 style={{fontSize: 24, textAlign: 'center', marginTop: 60}}>{t.submitted}</h1><p style={{textAlign: 'center', color: 'var(--tg-theme-hint-color, #999)'}}>{t.submittedDesc}</p></div>;

  const btn = (label: string, onClick: () => void, primary?: boolean) => (
    <button onClick={onClick} style={{flex: 1, padding: 14, borderRadius: 12, border: primary ? 'none' : '1px solid var(--tg-theme-secondary-bg-color, #ddd)', background: primary ? 'var(--tg-theme-button-color, #2481cc)' : 'transparent', color: primary ? 'var(--tg-theme-button-text-color, #fff)' : 'var(--tg-theme-text-color, #000)', fontSize: 16, cursor: 'pointer'}}>{label}</button>
  );

  if (showLang) return (
    <div style={s}>
      <h2 style={{fontSize: 20, margin: 0, marginBottom: 8}}>{t.lang}</h2>
      {(['es', 'ru', 'en'] as Lang[]).map(l => (
        <button key={l} onClick={() => { setLang(l); setShowLang(false); }}
          style={{padding: 14, borderRadius: 12, border: lang === l ? '2px solid var(--tg-theme-button-color, #2481cc)' : '1px solid var(--tg-theme-secondary-bg-color, #ddd)', background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', color: 'var(--tg-theme-text-color, #000)', fontSize: 16, cursor: 'pointer'}}>
          {LANG_LABELS[l]}
        </button>
      ))}
      {btn(t.back, () => setShowLang(false))}
    </div>
  );

  return (
    <div style={s}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{flex: 1, height: 4, background: 'var(--tg-theme-secondary-bg-color, #eee)', borderRadius: 2, overflow: 'hidden'}}>
          <div style={{width: `${progress}%`, height: '100%', background: 'var(--tg-theme-button-color, #2481cc)', transition: 'width 0.3s'}} />
        </div>
        <button onClick={() => setShowLang(true)}
          style={{marginLeft: 8, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)', background: 'transparent', color: 'var(--tg-theme-text-color, #000)', fontSize: 12, cursor: 'pointer'}}>
          {LANG_LABELS[lang]}
        </button>
      </div>
      <p style={{fontSize: 12, color: 'var(--tg-theme-hint-color, #999)', textTransform: 'uppercase', margin: 0}}>{stepIdx + 1} / {STEPS.length - 1}</p>
      <h2 style={{fontSize: 20, margin: 0}}>{t[step === 'category' ? 'category' : step === 'barrio' ? 'barrio' : step === 'description' ? 'description' : step === 'price' ? 'price' : 'confirm']}</h2>

      {step === 'category' && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          {CATEGORIES.map((c, i) => (
            <button key={c} onClick={() => { setCategory(c); next(); }}
              style={{padding: 14, border: `1px solid ${category === c ? 'var(--tg-theme-button-color, #2481cc)' : 'var(--tg-theme-secondary-bg-color, #ddd)'}`, borderRadius: 12, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', color: 'var(--tg-theme-text-color, #000)', fontSize: 16, textAlign: 'left', cursor: 'pointer'}}>
              {t.cat[i]}
            </button>
          ))}
        </div>
      )}

      {step === 'barrio' && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          {BARRIOS.map((b, i) => (
            <button key={b} onClick={() => { setBarrio(b); next(); }}
              style={{padding: 14, border: `1px solid ${barrio === b ? 'var(--tg-theme-button-color, #2481cc)' : 'var(--tg-theme-secondary-bg-color, #ddd)'}`, borderRadius: 12, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', color: 'var(--tg-theme-text-color, #000)', fontSize: 16, textAlign: 'left', cursor: 'pointer'}}>
              {t.bar[i]}
            </button>
          ))}
        </div>
      )}

      {step === 'description' && (
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t.descPH}
          style={{padding: 14, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)', borderRadius: 12, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', color: 'var(--tg-theme-text-color, #000)', fontSize: 16, minHeight: 120, resize: 'none'}} />
      )}

      {step === 'price' && (
        <input value={price} onChange={e => setPrice(e.target.value)} placeholder={t.pricePH} type="number"
          style={{padding: 14, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)', borderRadius: 12, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', color: 'var(--tg-theme-text-color, #000)', fontSize: 16}} />
      )}

      {step === 'confirm' && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
          {[['Categoría', t.cat[CATEGORIES.indexOf(category)]], ['Barrio', t.bar[BARRIOS.indexOf(barrio)]], ['Description', description.slice(0, 60) + '...'], ['Price', `$${price} ARS`]].map(([k, v]) => (
            <div key={k} style={{padding: 12, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)', borderRadius: 12, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)'}}>
              <p style={{margin: 0, fontSize: 12, color: 'var(--tg-theme-hint-color, #999)'}}>{k}</p>
              <p style={{margin: '4px 0 0', fontSize: 16}}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{color: 'var(--tg-theme-destructive-text-color, red)', fontSize: 13, margin: 0}}>{error}</p>}

      <div style={{display: 'flex', gap: 8, marginTop: 'auto'}}>
        {step !== 'category' && step !== 'confirm' && (btn(t.back, back))}
        {step === 'confirm' ? (btn(t.submit, submit, true)) : (step !== 'category' && step !== 'barrio' ? (btn(t.next, next, true)) : null)}
      </div>
    </div>
  );
}