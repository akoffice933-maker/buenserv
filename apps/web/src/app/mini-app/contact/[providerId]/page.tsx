'use client';

import {useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {useMiniApp} from '@/context/MiniAppContext';
import {MiniAppShell} from '@/components/mini-app/MiniAppShell';
import {PrimaryButton, SecondaryButton} from '@/components/mini-app/Buttons';
import {LoadingState, ErrorState} from '@/components/mini-app/FeedbackStates';
import {formatPrice} from '@/lib/format';

type Lang = 'es' | 'ru' | 'en';

type ContactProvider = {
  id: string;
  slug: string;
  displayName: string;
  categories: Array<{id: string; slug: string; priceFromArs: number}>;
  barrios: Array<{id: string; slug: string; nameEs: string; nameRu: string; nameEn: string}>;
};

const CAT_LABELS: Record<Lang, Record<string, string>> = {
  es: {limpieza: 'Limpieza', reparaciones: 'Reparaciones', mascotas: 'Mascotas', mudanzas: 'Mudanzas', clases: 'Clases', mensajeria: 'Mensajería', 'taxi-traslados': 'Taxi'},
  ru: {limpieza: 'Уборка', reparaciones: 'Ремонт', mascotas: 'Питомцы', mudanzas: 'Переезды', clases: 'Занятия', mensajeria: 'Курьеры', 'taxi-traslados': 'Такси'},
  en: {limpieza: 'Cleaning', reparaciones: 'Repairs', mascotas: 'Pets', mudanzas: 'Moving', clases: 'Lessons', mensajeria: 'Delivery', 'taxi-traslados': 'Taxi'}
};

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

export default function ContactPage() {
  const router = useRouter();
  const params = useParams<{providerId: string}>();
  const providerId = params.providerId;
  const {t: tr, locale} = useMiniApp();
  const [provider, setProvider] = useState<ContactProvider | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [barrioId, setBarrioId] = useState('');
  const [description, setDescription] = useState('');
  const [lang, setLang] = useState<Lang>('es');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    try {
      const w = window as unknown as {Telegram?: {WebApp?: {expand?: () => void}}};
      w.Telegram?.WebApp?.expand?.();
    } catch { /* ignore */ }
    const initData = getTelegramInitData();
    if (!initData) {
      setError(tr('ct_no_session'));
      setLoading(false);
      return;
    }
    fetch('/api/mini-app/profile', {headers: {'x-telegram-init-data': initData}})
      .then((r) => r.json())
      .then((body) => {
        const loc = body?.profile?.locale;
        if (loc === 'ru' || loc === 'en') setLang(loc);
      })
      .catch(() => { /* keep default */ });
    fetch(`/api/mini-app/contact?providerId=${encodeURIComponent(providerId)}`, {headers: {'x-telegram-init-data': initData}})
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? tr('ct_error'));
        return body;
      })
      .then((body) => {
        setProvider(body.provider);
        if (body.provider.categories.length > 0) setCategoryId(body.provider.categories[0].id);
        if (body.provider.barrios.length > 0) setBarrioId(body.provider.barrios[0].id);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : tr('ct_error')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const submit = async () => {
    if (!categoryId || !barrioId) { setError(tr('ct_error')); return; }
    const initData = getTelegramInitData();
    if (!initData) { setError(tr('ct_no_session')); return; }
    try {
      setSubmitting(true);
      setError('');
      const response = await fetch('/api/mini-app/contact', {
        method: 'POST',
        headers: {'content-type': 'application/json', 'x-telegram-init-data': initData},
        body: JSON.stringify({providerId, categoryId, barrioId, description, idempotencyKey: crypto.randomUUID()})
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? tr('ct_error'));
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : tr('ct_error'));
    } finally {
      setSubmitting(false);
    }
  };

  const t = {
    sent: tr('ct_sent'), sentDesc: tr('ct_sent_desc'), back: tr('ct_back'), loading: tr('ct_loading'),
    title: tr('ct_title'), category: tr('ct_category'), price: tr('ct_price'), barrio: tr('ct_barrio'),
    description: tr('ct_description'), descriptionPH: tr('ct_description_ph'),
    sending: tr('ct_sending'), submit: tr('ct_submit'), error: tr('ct_error'), noSession: tr('ct_no_session')
  };

  if (sent) return (
    <MiniAppShell showBack showBottomNav={false}>
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6 max-w-sm mx-auto my-auto">
        <div className="w-20 h-20 rounded-full bg-[#EAF7F1] text-[#0FA37F] flex items-center justify-center shadow-lg border border-[#0FA37F]/20"><span className="text-4xl">✅</span></div>
        <div className="space-y-2"><h2 className="text-[24px] font-extrabold text-[#1A1F1D] tracking-tight">{t.sent}</h2><p className="text-[15px] text-[#66706B] leading-relaxed">{t.sentDesc}</p></div>
        <div className="w-full pt-4 space-y-3">
          <PrimaryButton onClick={() => router.push('/mini-app')}>{t.back}</PrimaryButton>
        </div>
      </div>
    </MiniAppShell>
  );
  if (loading) return <MiniAppShell showBack showBottomNav={false}><LoadingState /></MiniAppShell>;
  if (error) return <MiniAppShell showBack showBottomNav={false}><ErrorState message={error} onRetry={() => router.push('/mini-app')} /></MiniAppShell>;
  if (!provider) return <MiniAppShell showBack showBottomNav={false}><LoadingState /></MiniAppShell>;

  const catLabels = CAT_LABELS[lang];
  const barrioName = (b: ContactProvider['barrios'][number]) => lang === 'ru' ? b.nameRu : lang === 'en' ? b.nameEn : b.nameEs;

  return (
    <MiniAppShell title={t.title} showBack backHref={`/mini-app/providers/${provider.id}`} showBottomNav={false}>
      <div className="space-y-5 pb-6">
        <div className="bg-white rounded-[20px] p-5 border border-[#DCE4DE]/80 bs-card-shadow">
          <p className="text-[13px] text-[#66706B] font-medium mb-1">BuenServ</p>
          <h1 className="text-[22px] font-extrabold text-[#1A1F1D] tracking-tight">{provider.displayName}</h1>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#DCE4DE]/80 bs-card-shadow space-y-3">
          <h2 className="text-[16px] font-bold text-[#1A1F1D]">{t.category}</h2>
          <div className="space-y-2">
            {provider.categories.map((c) => (
              <button key={c.id} onClick={() => setCategoryId(c.id)}
                className={`w-full min-h-[48px] px-4 py-3 rounded-[14px] text-left text-[15px] font-semibold transition-all ${categoryId === c.id ? 'bg-[#EAF7F1] text-[#0FA37F] border border-[#0FA37F]/30' : 'bg-[#FAF9F6] text-[#1A1F1D] border border-[#DCE4DE] hover:bg-slate-50'}`}>
                {catLabels[c.slug] ?? c.slug} <span className="text-[13px] text-[#66706B] font-medium">· {t.price} ${formatPrice(c.priceFromArs, locale)} ARS</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#DCE4DE]/80 bs-card-shadow space-y-3">
          <h2 className="text-[16px] font-bold text-[#1A1F1D]">{t.barrio}</h2>
          <div className="space-y-2">
            {provider.barrios.map((b) => (
              <button key={b.id} onClick={() => setBarrioId(b.id)}
                className={`w-full min-h-[48px] px-4 py-3 rounded-[14px] text-left text-[15px] font-semibold transition-all ${barrioId === b.id ? 'bg-[#EAF7F1] text-[#0FA37F] border border-[#0FA37F]/30' : 'bg-[#FAF9F6] text-[#1A1F1D] border border-[#DCE4DE] hover:bg-slate-50'}`}>
                {barrioName(b)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#DCE4DE]/80 bs-card-shadow space-y-3">
          <h2 className="text-[16px] font-bold text-[#1A1F1D]">{t.description}</h2>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.descriptionPH} rows={4}
            className="w-full min-h-[100px] px-4 py-3 rounded-[14px] bg-[#FAF9F6] border border-[#DCE4DE] text-[15px] text-[#1A1F1D] placeholder-[#66706B] focus:outline-hidden focus:border-[#0FA37F] focus:ring-2 focus:ring-[#0FA37F]/20 transition-all resize-y" />
        </div>

        {error && <p className="text-[13px] text-[#B84040] bg-red-50 border border-red-200 rounded-[10px] p-2.5">{error}</p>}

        <PrimaryButton onClick={submit} loading={submitting}>{submitting ? t.sending : t.submit}</PrimaryButton>
        <SecondaryButton onClick={() => router.push('/mini-app')}>{t.back}</SecondaryButton>
      </div>
    </MiniAppShell>
  );
}
