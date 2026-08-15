'use client';

import {useEffect, useState} from 'react';
import {useMiniApp} from '@/context/MiniAppContext';
import {MiniAppShell} from '@/components/mini-app/MiniAppShell';
import {PrimaryButton, SecondaryButton} from '@/components/mini-app/Buttons';
import {CATEGORY_LABELS, CategorySlug} from '@/lib/categories';

type Lang = 'es' | 'ru' | 'en';

const LANG_LABELS: Record<Lang, string> = {es: '🇪🇸 Español', ru: '🇷🇺 Русский', en: '🇬🇧 English'};

const CATEGORIES = ['limpieza', 'reparaciones', 'mascotas', 'mudanzas', 'clases', 'mensajeria', 'taxi-traslados'];
const BARRIOS = ['palermo', 'recoleta', 'belgrano', 'caballito'];

type Step = 'category' | 'barrio' | 'description' | 'price' | 'confirm' | 'done';
const STEPS: Step[] = ['category', 'barrio', 'description', 'price', 'confirm', 'done'];

function getTelegramInitData(): string {
  try {
    const w = window as unknown as {Telegram?: {WebApp?: {initData?: string}}};
    if (w.Telegram?.WebApp?.initData) return w.Telegram.WebApp.initData;
  } catch { /* ignore */ }
  try {
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      const tgWebAppData = hashParams.get('tgWebAppData');
      if (tgWebAppData) return tgWebAppData;
    }
  } catch { /* ignore */ }
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const tgWebAppData = urlParams.get('tgWebAppData');
    if (tgWebAppData) return tgWebAppData;
  } catch { /* ignore */ }
  return '';
}

export default function OnboardingPage() {
  const {t: tr, locale} = useMiniApp();
  const [lang, setLang] = useState<Lang>('es');
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState('');
  const [barrio, setBarrio] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  const [showLang, setShowLang] = useState(false);

  const t = {
    errCat: tr('ob_err_cat'), errBar: tr('ob_err_bar'), errDesc: tr('ob_err_desc'), errPrice: tr('ob_err_price'),
    descPH: tr('ob_desc_ph'), pricePH: tr('ob_price_ph'), priceNote: tr('ob_price_note'),
    lblCat: tr('ob_lbl_cat'), lblBar: tr('ob_lbl_bar'), lblDesc: tr('ob_lbl_desc'), lblPrice: tr('ob_lbl_price'),
    photoDesc: tr('ob_photo_desc'), sending: tr('ob_sending'), submit: tr('ob_submit'),
    next: tr('ob_next'), back: tr('ob_back'), lang: tr('ob_lang'),
    submitted: tr('ob_submitted'), submittedDesc: tr('ob_submitted_desc'), error: tr('ob_error'),
    category: tr('ob_category'), barrio: tr('ob_barrio'), description: tr('ob_description'),
    price: tr('ob_price'), confirm: tr('ob_confirm'),
    cat: CATEGORIES.map((slug) => { const m = CATEGORY_LABELS[slug as CategorySlug]; return m ? `${m.icon} ${locale === 'ru' ? m.ru : locale === 'en' ? m.en : m.es}` : slug; }),
    bar: BARRIOS.map((b) => b.charAt(0).toUpperCase() + b.slice(1))
  };

  useEffect(() => {
    try {
      const w = window as unknown as {Telegram?: {WebApp?: {expand?: () => void}}};
      w.Telegram?.WebApp?.expand?.();
    } catch { /* ignore */ }
    try {
      const w = window as unknown as {Telegram?: {WebApp?: {initData?: string}}};
      const initData = w.Telegram?.WebApp?.initData ?? '';
      if (initData) {
        fetch('/api/mini-app/profile', {headers: {'x-telegram-init-data': initData}})
          .then((r) => r.json())
          .then((body) => {
            const loc = body?.profile?.locale;
            if (loc === 'ru' || loc === 'en') setLang(loc);
          })
          .catch(() => { /* keep default */ });
      }
    } catch { /* ignore */ }
    setStarted(true);
  }, []);

  if (!started) return <MiniAppShell><div className="flex items-center justify-center py-16"><p className="text-[#66706B]">Loading...</p></div></MiniAppShell>;

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
      const currentInitData = getTelegramInitData();
      if (!currentInitData) {
        setError(`${t.error}: initData is empty. Open this page from Telegram bot.`);
        setSubmitting(false);
        return;
      }
      const fd = new FormData();
      fd.append('category', category);
      fd.append('barrio', barrio);
      fd.append('description', description);
      fd.append('price', price);
      fd.append('initData', currentInitData);
      const res = await fetch('/api/mini-app/submit', {method: 'POST', body: fd});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.error);
      try { (window as unknown as {Telegram?: {WebApp?: {close?: () => void}}}).Telegram?.WebApp?.close?.(); } catch { /* ignore */ }
      setStep('done');
    } catch (err) { setError(err instanceof Error ? err.message : t.error); }
    finally { setSubmitting(false); }
  };

  if (step === 'done') return (
    <MiniAppShell showBottomNav={false}>
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6 max-w-sm mx-auto my-auto">
        <div className="w-20 h-20 rounded-full bg-[#EAF7F1] text-[#0FA37F] flex items-center justify-center shadow-lg border border-[#0FA37F]/20"><span className="text-4xl">✅</span></div>
        <div className="space-y-2"><h2 className="text-[24px] font-extrabold text-[#1A1F1D] tracking-tight">{t.submitted}</h2><p className="text-[15px] text-[#66706B] leading-relaxed">{t.submittedDesc}</p></div>
      </div>
    </MiniAppShell>
  );

  if (showLang) return (
    <MiniAppShell title={t.lang} showBack showBottomNav={false}>
      <div className="space-y-2">
        {(['es', 'ru', 'en'] as Lang[]).map(l => (
          <button key={l} onClick={() => { setLang(l); setShowLang(false); }}
            className={`w-full min-h-[52px] px-4 py-3 rounded-[14px] text-left text-base font-medium transition-all ${lang === l ? 'bg-[#EAF7F1] text-[#0FA37F] font-bold border border-[#0FA37F]/30' : 'bg-[#FAF9F6] text-[#1A1F1D] border border-[#DCE4DE] hover:bg-slate-50'}`}>
            {LANG_LABELS[l]}
          </button>
        ))}
        <SecondaryButton onClick={() => setShowLang(false)}>{t.back}</SecondaryButton>
      </div>
    </MiniAppShell>
  );

  return (
    <MiniAppShell showBottomNav={false}>
      <div className="space-y-5 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 bg-[#DCE4DE] rounded-full overflow-hidden">
            <div className="h-full bg-[#0FA37F] transition-all duration-300" style={{width: `${progress}%`}} />
          </div>
          <button onClick={() => setShowLang(true)} className="min-h-[40px] px-3 py-1.5 rounded-full bg-white border border-[#DCE4DE] text-[13px] font-semibold text-[#1A1F1D]">{LANG_LABELS[lang]}</button>
        </div>
        <p className="text-[12px] text-[#66706B] uppercase tracking-wider m-0">{stepIdx + 1} / {STEPS.length - 1}</p>
        <h2 className="text-[20px] font-bold text-[#1A1F1D] m-0">{t[step === 'category' ? 'category' : step === 'barrio' ? 'barrio' : step === 'description' ? 'description' : step === 'price' ? 'price' : 'confirm']}</h2>

        {step === 'category' && (
          <div className="space-y-2">
            {CATEGORIES.map((c, i) => (
              <button key={c} onClick={() => { setCategory(c); next(); }}
                className={`w-full min-h-[48px] px-4 py-3 rounded-[14px] text-left text-[15px] font-semibold transition-all ${category === c ? 'bg-[#EAF7F1] text-[#0FA37F] border border-[#0FA37F]/30' : 'bg-white text-[#1A1F1D] border border-[#DCE4DE] hover:bg-slate-50'}`}>
                {t.cat[i]}
              </button>
            ))}
          </div>
        )}

        {step === 'barrio' && (
          <div className="space-y-2">
            {BARRIOS.map((b, i) => (
              <button key={b} onClick={() => { setBarrio(b); next(); }}
                className={`w-full min-h-[48px] px-4 py-3 rounded-[14px] text-left text-[15px] font-semibold transition-all ${barrio === b ? 'bg-[#EAF7F1] text-[#0FA37F] border border-[#0FA37F]/30' : 'bg-white text-[#1A1F1D] border border-[#DCE4DE] hover:bg-slate-50'}`}>
                {t.bar[i]}
              </button>
            ))}
          </div>
        )}

        {step === 'description' && (
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t.descPH}
            className="w-full min-h-[120px] px-4 py-3 rounded-[14px] bg-white border border-[#DCE4DE] text-[15px] text-[#1A1F1D] placeholder-[#66706B] focus:outline-hidden focus:border-[#0FA37F] focus:ring-2 focus:ring-[#0FA37F]/20 transition-all resize-y" />
        )}

        {step === 'price' && (
          <div className="space-y-2">
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder={t.pricePH} type="number"
              className="w-full min-h-[48px] px-4 py-3 rounded-[14px] bg-white border border-[#DCE4DE] text-[15px] text-[#1A1F1D] placeholder-[#66706B] focus:outline-hidden focus:border-[#0FA37F] focus:ring-2 focus:ring-[#0FA37F]/20 transition-all" />
            <p className="text-[12px] text-[#66706B] m-0">{t.priceNote}</p>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-3">
            {[[t.lblCat, t.cat[CATEGORIES.indexOf(category)]], [t.lblBar, t.bar[BARRIOS.indexOf(barrio)]], [t.lblDesc, description.slice(0, 60) + '...'], [t.lblPrice, `$${Number(price).toLocaleString()} ARS`]].map(([k, v]) => (
              <div key={k} className="p-3 bg-white rounded-[14px] border border-[#DCE4DE]">
                <p className="m-0 text-[12px] text-[#66706B]">{k}</p>
                <p className="m-0 mt-1 text-[16px] text-[#1A1F1D]">{v}</p>
              </div>
            ))}
            <p className="text-[12px] text-[#66706B] m-0">{t.photoDesc}</p>
          </div>
        )}

        {error && <p className="text-[13px] text-[#B84040] bg-red-50 border border-red-200 rounded-[10px] p-2.5">{error}</p>}

        <div className="flex gap-2 pt-2">
          {step !== 'category' && step !== 'confirm' && <SecondaryButton onClick={back}>{t.back}</SecondaryButton>}
          {step === 'confirm' ? (
            <PrimaryButton onClick={submit} loading={submitting}>{submitting ? t.sending : t.submit}</PrimaryButton>
          ) : (step !== 'category' && step !== 'barrio' ? <PrimaryButton onClick={next}>{t.next}</PrimaryButton> : null)}
        </div>
      </div>
    </MiniAppShell>
  );
}
