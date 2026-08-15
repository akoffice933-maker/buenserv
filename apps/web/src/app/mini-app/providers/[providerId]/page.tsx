'use client';
import {useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {Card, LocaleChip, MiniLocale, PrimaryButton, SecondaryButton, getTelegramInitData} from '../../components';

type Provider = {
  id: string; slug: string; photo_path?: string | null; rating: number; reviews_count: number;
  profiles: {display_name?: string | null} | null;
  provider_categories: Array<{price_from_ars?: number | null; categories: {slug: string; name_es: string; name_ru: string; name_en: string} | null}>;
  provider_barrios: Array<{barrios: {slug: string; name_es: string; name_ru: string; name_en: string} | null}>;
};

export default function ProviderPage() {
  const params = useParams<{providerId: string}>();
  const router = useRouter();
  const [lang, setLang] = useState<MiniLocale>('es-AR');
  const [provider, setProvider] = useState<Provider | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const initData = getTelegramInitData();
    if (!initData) { setError('No session'); return; }
    fetch(`/api/mini-app/providers/${params.providerId}`, {headers: {'x-telegram-init-data': initData}})
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? 'Load error');
        setProvider(body.provider);
      })
      .catch((e) => setError(e.message));
  }, [params.providerId]);

  const t = (es: string, ru: string, en: string) => lang === 'ru' ? ru : lang === 'en' ? en : es;
  const catName = (c: {name_es: string; name_ru: string; name_en: string}) => t(c.name_es, c.name_ru, c.name_en);
  const barrioName = (b: {name_es: string; name_ru: string; name_en: string}) => t(b.name_es, b.name_ru, b.name_en);

  return (
    <main style={{minHeight: '100vh', padding: 16, display: 'grid', gap: 16, background: 'var(--tg-theme-bg-color, #FAF9F6)', color: 'var(--tg-theme-text-color, #1A1F1D)'}}>
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <button onClick={() => router.back()} style={{minHeight: 44, minWidth: 44, border: 0, background: 'transparent', fontSize: 20, cursor: 'pointer'}}>←</button>
        <LocaleChip locale={lang} onLocaleChange={setLang} />
      </header>

      {error && <p>{error}</p>}
      {!provider && !error && <p>{t('Cargando…', 'Загрузка…', 'Loading…')}</p>}

      {provider && (
        <>
          <Card>
            <div style={{display: 'flex', gap: 14, alignItems: 'center'}}>
              <div style={{width: 64, height: 64, borderRadius: 16, background: 'rgba(15,163,127,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30}}>🧑‍🔧</div>
              <div>
                <h1 style={{fontSize: 22, margin: 0}}>{provider.profiles?.display_name ?? 'Profesional'}</h1>
                <span style={{fontSize: 14, color: 'var(--tg-theme-hint-color, #66706B)'}}>{t('Verificado por BuenServ', 'Проверено BuenServ', 'Verified by BuenServ')}</span>
              </div>
            </div>
          </Card>

          <Card>
            <strong style={{display: 'block', marginBottom: 8}}>{t('Servicios', 'Услуги', 'Services')}</strong>
            {provider.provider_categories?.map((pc, i) => (
              <div key={i} style={{display: 'flex', justifyContent: 'space-between', padding: '6px 0'}}>
                <span>{pc.categories ? catName(pc.categories) : ''}</span>
                {pc.price_from_ars ? <span style={{fontWeight: 600}}>${pc.price_from_ars}</span> : null}
              </div>
            ))}
          </Card>

          <Card>
            <strong style={{display: 'block', marginBottom: 8}}>{t('Zonas', 'Районы', 'Areas')}</strong>
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
              {provider.provider_barrios?.map((pb, i) => pb.barrios ? (
                <span key={i} style={{background: 'rgba(15,163,127,.1)', color: '#0FA37F', borderRadius: 10, padding: '6px 10px', fontSize: 13}}>{barrioName(pb.barrios)}</span>
              ) : null)}
            </div>
          </Card>

          <PrimaryButton onClick={() => router.push(`/mini-app/contact/${provider.id}`)}>
            {t('Enviar solicitud', 'Отправить заявку', 'Send request')}
          </PrimaryButton>
          <SecondaryButton onClick={() => { try { const w = window as unknown as {Telegram?: {WebApp?: {openTelegramLink?: (u: string) => void}}}; w.Telegram?.WebApp?.openTelegramLink?.('https://t.me/BuenServ_bot'); } catch { /* ignore */ } }}>
            {t('Escribir en Telegram', 'Написать в Telegram', 'Write on Telegram')}
          </SecondaryButton>
        </>
      )}
    </main>
  );
}
