'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {LocaleChip, MiniLocale} from '../components';

export default function FavoritesPage() {
  const router = useRouter();
  const [lang, setLang] = useState<MiniLocale>('es-AR');
  const t = (es: string, ru: string, en: string) => lang === 'ru' ? ru : lang === 'en' ? en : es;

  return (
    <main style={{minHeight: '100vh', padding: 16, display: 'grid', gap: 16, background: 'var(--tg-theme-bg-color, #FAF9F6)', color: 'var(--tg-theme-text-color, #1A1F1D)'}}>
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1 style={{fontSize: 24, margin: 0}}>{t('Favoritos', 'Избранное', 'Favorites')}</h1>
        <LocaleChip locale={lang} onLocaleChange={setLang} />
      </header>
      <div style={{textAlign: 'center', padding: '40px 0', color: 'var(--tg-theme-hint-color, #66706B)'}}>
        <div style={{fontSize: 40, marginBottom: 12}}>⭐</div>
        <p style={{margin: '0 0 4px'}}>{t('Todavía no tenés favoritos.', 'Пока нет избранного.', 'No favorites yet.')}</p>
        <p style={{margin: '0 0 16px', fontSize: 14}}>{t('Explorá profesionales y volvé cuando esta función esté disponible.', 'Изучайте специалистов и возвращайтесь, когда эта функция станет доступна.', 'Explore providers and come back when this feature is available.')}</p>
        <button onClick={() => router.push('/mini-app/search')} style={{minHeight: 48, border: 0, background: 'var(--tg-theme-button-color, #0FA37F)', color: '#fff', borderRadius: 14, padding: '0 20px', fontWeight: 600, cursor: 'pointer'}}>
          {t('Buscar servicios', 'Найти услуги', 'Search services')}
        </button>
      </div>
    </main>
  );
}
