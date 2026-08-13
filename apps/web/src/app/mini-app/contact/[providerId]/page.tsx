'use client';

import {useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';

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

const I18N: Record<Lang, {
  title: string;
  category: string;
  barrio: string;
  description: string;
  descriptionPH: string;
  submit: string;
  sending: string;
  sent: string;
  sentDesc: string;
  error: string;
  noSession: string;
  loading: string;
  back: string;
  price: string;
}> = {
  es: {
    title: 'Contactar al prestador',
    category: '¿Qué servicio necesitás?',
    barrio: '¿En qué barrio?',
    description: 'Contanos qué necesitás (opcional)',
    descriptionPH: 'Ej: necesito limpieza de 2 ambientes…',
    submit: 'Enviar solicitud',
    sending: 'Enviando…',
    sent: '✅ Solicitud enviada',
    sentDesc: 'El prestador recibió tu solicitud y te va a responder.',
    error: 'No pudimos enviar tu solicitud.',
    noSession: 'Abrí tu gabinete desde el bot de BuenServ.',
    loading: 'Cargando…',
    back: 'Volver',
    price: 'Desde'
  },
  ru: {
    title: 'Связаться с исполнителем',
    category: 'Какая услуга нужна?',
    barrio: 'В каком районе?',
    description: 'Расскажите, что нужно (необязательно)',
    descriptionPH: 'Например: нужна уборка 2 комнат…',
    submit: 'Отправить заявку',
    sending: 'Отправка…',
    sent: '✅ Заявка отправлена',
    sentDesc: 'Исполнитель получил вашу заявку и скоро ответит.',
    error: 'Не удалось отправить заявку.',
    noSession: 'Откройте кабинет из бота BuenServ.',
    loading: 'Загрузка…',
    back: 'Назад',
    price: 'От'
  },
  en: {
    title: 'Contact provider',
    category: 'What service do you need?',
    barrio: 'Which neighbourhood?',
    description: 'Tell us what you need (optional)',
    descriptionPH: 'E.g. I need cleaning for 2 rooms…',
    submit: 'Send request',
    sending: 'Sending…',
    sent: '✅ Request sent',
    sentDesc: 'The provider received your request and will reply soon.',
    error: 'Could not send your request.',
    noSession: 'Open your cabinet from the BuenServ bot.',
    loading: 'Loading…',
    back: 'Back',
    price: 'From'
  }
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
      setError(I18N.es.noSession);
      setLoading(false);
      return;
    }
    fetch(`/api/mini-app/contact/${providerId}`, {headers: {'x-telegram-init-data': initData}})
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? I18N.es.error);
        return body;
      })
      .then((body) => {
        setProvider(body.provider);
        // Default to first category/barrio for convenience, but the customer can change it.
        if (body.provider.categories.length > 0) setCategoryId(body.provider.categories[0].id);
        if (body.provider.barrios.length > 0) setBarrioId(body.provider.barrios[0].id);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : I18N.es.error))
      .finally(() => setLoading(false));
  }, [providerId]);

  const submit = async () => {
    if (!categoryId || !barrioId) { setError(I18N[lang].error); return; }
    const initData = getTelegramInitData();
    if (!initData) { setError(I18N[lang].noSession); return; }
    try {
      setSubmitting(true);
      setError('');
      const response = await fetch('/api/mini-app/contact', {
        method: 'POST',
        headers: {'content-type': 'application/json', 'x-telegram-init-data': initData},
        body: JSON.stringify({providerId, categoryId, barrioId, description, idempotencyKey: crypto.randomUUID()})
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? I18N[lang].error);
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : I18N[lang].error);
    } finally {
      setSubmitting(false);
    }
  };

  const t = I18N[lang];
  const shell: React.CSSProperties = {minHeight: '100vh', padding: 16, display: 'grid', gap: 16, background: 'var(--tg-theme-bg-color, #fff)', color: 'var(--tg-theme-text-color, #111)'};

  if (sent) return <main style={shell}><h1 style={{fontSize: 22, margin: 0}}>{t.sent}</h1><p>{t.sentDesc}</p><button onClick={() => router.push('/mini-app')} style={{padding: '12px 16px', borderRadius: 10, border: 'none', background: 'var(--tg-theme-button-color, #2481cc)', color: '#fff', fontWeight: 600}}>{t.back}</button></main>;
  if (loading) return <main style={shell}><p>{t.loading}</p></main>;
  if (error) return <main style={shell}><h1 style={{fontSize: 22, margin: 0}}>BuenServ</h1><p>{error}</p><button onClick={() => router.push('/mini-app')} style={{padding: '12px 16px', borderRadius: 10, border: 'none', background: 'var(--tg-theme-button-color, #2481cc)', color: '#fff', fontWeight: 600}}>{t.back}</button></main>;
  if (!provider) return <main style={shell}><p>{t.loading}</p></main>;

  const catLabels = CAT_LABELS[lang];
  const barrioName = (b: ContactProvider['barrios'][number]) => lang === 'ru' ? b.nameRu : lang === 'en' ? b.nameEn : b.nameEs;

  return <main style={shell}>
    <header><p style={{margin: 0, color: 'var(--tg-theme-hint-color, #777)'}}>BuenServ</p><h1 style={{fontSize: 22, margin: '4px 0'}}>{t.title}</h1><p style={{margin: 0, color: 'var(--tg-theme-hint-color, #777)'}}>{provider.displayName}</p></header>

    <section style={{display: 'grid', gap: 8}}>
      <h2 style={{fontSize: 17, margin: 0}}>{t.category}</h2>
      {provider.categories.map((c) => (
        <button key={c.id} onClick={() => setCategoryId(c.id)}
          style={{padding: 14, borderRadius: 12, border: `1px solid ${categoryId === c.id ? 'var(--tg-theme-button-color, #2481cc)' : 'var(--tg-theme-secondary-bg-color, #ddd)'}`, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', color: 'var(--tg-theme-text-color, #111)', fontSize: 16, textAlign: 'left', cursor: 'pointer'}}>
          {catLabels[c.slug] ?? c.slug} <span style={{color: 'var(--tg-theme-hint-color, #777)', fontSize: 13}}>· {t.price} ${c.priceFromArs.toLocaleString()} ARS</span>
        </button>
      ))}
    </section>

    <section style={{display: 'grid', gap: 8}}>
      <h2 style={{fontSize: 17, margin: 0}}>{t.barrio}</h2>
      {provider.barrios.map((b) => (
        <button key={b.id} onClick={() => setBarrioId(b.id)}
          style={{padding: 14, borderRadius: 12, border: `1px solid ${barrioId === b.id ? 'var(--tg-theme-button-color, #2481cc)' : 'var(--tg-theme-secondary-bg-color, #ddd)'}`, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', color: 'var(--tg-theme-text-color, #111)', fontSize: 16, textAlign: 'left', cursor: 'pointer'}}>
          {barrioName(b)}
        </button>
      ))}
    </section>

    <section style={{display: 'grid', gap: 8}}>
      <h2 style={{fontSize: 17, margin: 0}}>{t.description}</h2>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.descriptionPH} rows={4}
        style={{padding: 12, borderRadius: 10, border: '1px solid var(--tg-theme-secondary-bg-color, #ddd)', background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', color: 'var(--tg-theme-text-color, #111)', font: 'inherit', resize: 'vertical'}} />
    </section>

    {error && <p style={{color: 'var(--tg-theme-destructive-text-color, red)', fontSize: 13, margin: 0}}>{error}</p>}

    <button onClick={submit} disabled={submitting}
      style={{padding: '14px 16px', fontSize: 16, border: 'none', borderRadius: 10, background: submitting ? 'var(--tg-theme-secondary-bg-color, #ccc)' : 'var(--tg-theme-button-color, #2481cc)', color: submitting ? 'var(--tg-theme-hint-color, #999)' : '#fff', fontWeight: 600, cursor: submitting ? 'default' : 'pointer'}}>
      {submitting ? t.sending : t.submit}
    </button>
  </main>;
}