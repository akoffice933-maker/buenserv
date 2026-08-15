'use client';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Card, LocaleChip, MiniLocale, getTelegramInitData} from '../components';

type ProfileData = {
  profile: {id: string; displayName: string; locale: MiniLocale};
  provider: {id: string; slug: string; status: string; moderation_reason?: string | null} | null;
  activeRequestCount: number;
};

const PROVIDER_STATUS: Record<string, [string, string, string]> = {
  draft: ['Borrador', 'Черновик', 'Draft'],
  pending: ['En moderación', 'На модерации', 'Pending review'],
  approved: ['Aprobado', 'Одобрен', 'Approved'],
  rejected: ['Necesita cambios', 'Нужны правки', 'Needs changes'],
  suspended: ['Suspendido', 'Приостановлен', 'Suspended']
};

export default function ProfilePage() {
  const router = useRouter();
  const [lang, setLang] = useState<MiniLocale>('es-AR');
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const initData = getTelegramInitData();
    if (!initData) { setError('No session'); return; }
    fetch('/api/mini-app/profile', {headers: {'x-telegram-init-data': initData}})
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? 'Load error');
        setData(body);
        setLang(body.profile.locale ?? 'es-AR');
      })
      .catch((e) => setError(e.message));
  }, []);

  const t = (es: string, ru: string, en: string) => lang === 'ru' ? ru : lang === 'en' ? en : es;

  return (
    <main style={{minHeight: '100vh', padding: 16, display: 'grid', gap: 16, background: 'var(--tg-theme-bg-color, #FAF9F6)', color: 'var(--tg-theme-text-color, #1A1F1D)'}}>
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1 style={{fontSize: 24, margin: 0}}>{t('Perfil', 'Профиль', 'Profile')}</h1>
        <LocaleChip locale={lang} onLocaleChange={setLang} />
      </header>

      {error && <p>{error}</p>}
      {!data && !error && <p>{t('Cargando…', 'Загрузка…', 'Loading…')}</p>}

      {data && (
        <>
          <Card>
            <strong style={{display: 'block', fontSize: 18}}>{data.profile.displayName || 'BuenServ user'}</strong>
            <span style={{fontSize: 14, color: 'var(--tg-theme-hint-color, #66706B)'}}>{t('Solicitudes activas', 'Активные заявки', 'Active requests')}: {data.activeRequestCount}</span>
          </Card>

          {data.provider ? (
            <Card>
              <strong style={{display: 'block'}}>{t('Mi perfil profesional', 'Мой профиль', 'My provider profile')}</strong>
              <span style={{fontSize: 14, color: 'var(--tg-theme-hint-color, #66706B)'}}>
                {PROVIDER_STATUS[data.provider.status]?.[lang === 'ru' ? 1 : lang === 'en' ? 2 : 0] ?? data.provider.status}
              </span>
              {data.provider.status === 'rejected' && data.provider.moderation_reason && (
                <p style={{fontSize: 14, margin: '8px 0 0'}}>{t('Motivo', 'Причина', 'Reason')}: {data.provider.moderation_reason}</p>
              )}
              {data.provider.status === 'draft' && (
                <button onClick={() => router.push('/mini-app/onboarding')} style={{minHeight: 44, marginTop: 10, border: 0, background: 'var(--tg-theme-button-color, #0FA37F)', color: '#fff', borderRadius: 12, padding: '0 16px', cursor: 'pointer'}}>
                  {t('Continuar registro', 'Продолжить регистрацию', 'Continue onboarding')}
                </button>
              )}
            </Card>
          ) : (
            <Card>
              <strong style={{display: 'block'}}>{t('¿Ofrecés servicios?', 'Предлагаете услуги?', 'Do you offer services?')}</strong>
              <button onClick={() => router.push('/mini-app/onboarding')} style={{minHeight: 44, marginTop: 10, border: 0, background: 'var(--tg-theme-button-color, #0FA37F)', color: '#fff', borderRadius: 12, padding: '0 16px', cursor: 'pointer'}}>
                {t('Registrarme como prestador', 'Зарегистрироваться как исполнитель', 'Register as provider')}
              </button>
            </Card>
          )}

          <Card>
            <strong style={{display: 'block'}}>{t('Ayuda y soporte', 'Помощь и поддержка', 'Help & support')}</strong>
            <p style={{fontSize: 14, margin: '6px 0 0', color: 'var(--tg-theme-hint-color, #66706B)'}}>
              {t('Escribí al bot de BuenServ y usá /support.', 'Напишите боту BuenServ и используйте /support.', 'Write to the BuenServ bot and use /support.')}
            </p>
          </Card>
        </>
      )}
    </main>
  );
}