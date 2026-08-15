'use client';
import {useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Card, LocaleChip, MiniLocale, getTelegramInitData} from '../components';

type Category = {id: string; slug: string; name_es: string; name_ru: string; name_en: string; icon?: string};
type Barrio = {id: string; slug: string; name_es: string; name_ru: string; name_en: string};
type Provider = {
  id: string; slug: string; photo_path?: string | null; rating: number; reviews_count: number;
  profiles: {display_name?: string | null} | null;
  provider_categories: Array<{price_from_ars?: number | null; categories: {slug: string; name_es: string; name_ru: string; name_en: string} | null}>;
  provider_barrios: Array<{barrios: {slug: string; name_es: string; name_ru: string; name_en: string} | null}>;
};

const CAT_ICONS: Record<string, string> = {limpieza: '🧹', reparaciones: '🔧', mascotas: '🐾', mudanzas: '🚚', clases: '📚', mensajeria: '🛵', taxi: '🚕'};

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [lang, setLang] = useState<MiniLocale>('es-AR');
  const [data, setData] = useState<{categories: Category[]; barrios: Barrio[]; providers: Provider[]} | null>(null);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);

  const category = params.get('category') ?? '';
  const barrio = params.get('barrio') ?? '';

  const load = () => {
    const initData = getTelegramInitData();
    if (!initData) { setError('No session'); return; }
    const q = new URLSearchParams();
    if (category) q.set('category', category);
    if (barrio) q.set('barrio', barrio);
    fetch(`/api/mini-app/search?${q.toString()}`, {headers: {'x-telegram-init-data': initData}})
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) {
          if (r.status === 401) { setSessionExpired(true); throw new Error('Session expired'); }
          throw new Error(body.error ?? 'Load error');
        }
        setData(body);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [category, barrio]);

  const t = (es: string, ru: string, en: string) => lang === 'ru' ? ru : lang === 'en' ? en : es;
  const catName = (c: {name_es: string; name_ru: string; name_en: string}) => t(c.name_es, c.name_ru, c.name_en);
  const barrioName = (b: {name_es: string; name_ru: string; name_en: string}) => t(b.name_es, b.name_ru, b.name_en);

  const shell: React.CSSProperties = {minHeight: '100vh', padding: 16, display: 'grid', gap: 16, background: 'var(--tg-theme-bg-color, #FAF9F6)', color: 'var(--tg-theme-text-color, #1A1F1D)'};

  if (error) return <main style={shell}><h1 style={{fontSize: 24, margin: 0}}>BuenServ</h1><p>{error}</p></main>;
  if (!data) return <main style={shell}><p>{t('Cargando…', 'Загрузка…', 'Loading…')}</p></main>;

  return (
    <main style={shell}>
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1 style={{fontSize: 24, margin: 0}}>{t('Buscar', 'Поиск', 'Search')}</h1>
        <LocaleChip locale={lang} onLocaleChange={setLang} />
      </header>

      {!category && (
        <section style={{display: 'grid', gap: 8}}>
          <h2 style={{fontSize: 18, margin: 0}}>{t('Categorías', 'Категории', 'Categories')}</h2>
          {data.categories.map((c) => (
            <Card key={c.id} onClick={() => router.push(`/mini-app/search?category=${c.slug}`)}>
              <strong>{CAT_ICONS[c.slug] ?? '•'} {catName(c)}</strong>
            </Card>
          ))}
        </section>
      )}

      {category && (
        <section style={{display: 'grid', gap: 8}}>
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            <button onClick={() => router.push('/mini-app/search')} style={{minHeight: 44, border: '1px solid rgba(0,0,0,.1)', background: 'transparent', borderRadius: 12, padding: '0 12px', cursor: 'pointer'}}>{t('← Categorías', '← Категории', '← Categories')}</button>
            {data.barrios.map((b) => (
              <button key={b.id} onClick={() => router.push(`/mini-app/search?category=${category}&barrio=${b.slug}`)} style={{minHeight: 44, border: '1px solid rgba(0,0,0,.1)', background: barrio === b.slug ? 'rgba(15,163,127,.15)' : 'transparent', borderRadius: 12, padding: '0 12px', cursor: 'pointer', fontWeight: barrio === b.slug ? 600 : 400}}>{barrioName(b)}</button>
            ))}
          </div>

          {data.providers.length === 0 ? (
            <div style={{textAlign: 'center', padding: 24, color: 'var(--tg-theme-hint-color, #66706B)'}}>
              <p>{t('No encontramos profesionales con estos filtros.', 'Не нашли специалистов по этим фильтрам.', 'No providers found with these filters.')}</p>
              <button onClick={() => router.push('/mini-app/search')} style={{minHeight: 44, border: 0, background: 'var(--tg-theme-button-color, #0FA37F)', color: '#fff', borderRadius: 12, padding: '0 16px', cursor: 'pointer'}}>{t('Limpiar filtros', 'Сбросить фильтры', 'Clear filters')}</button>
            </div>
          ) : data.providers.map((p) => (
            <Card key={p.id} onClick={() => router.push(`/mini-app/providers/${p.id}`)}>
              <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                <div style={{width: 48, height: 48, borderRadius: 12, background: 'rgba(15,163,127,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22}}>🧑‍🔧</div>
                <div style={{flex: 1}}>
                  <strong>{p.profiles?.display_name ?? 'Profesional'}</strong>
                  <div style={{fontSize: 13, color: 'var(--tg-theme-hint-color, #66706B)'}}>
                    {p.provider_categories?.[0]?.categories ? catName(p.provider_categories[0].categories) : ''}
                    {p.provider_categories?.[0]?.price_from_ars ? ` · desde $${p.provider_categories[0].price_from_ars}` : ''}
                  </div>
                </div>
                <span style={{fontSize: 13, color: '#0FA37F', fontWeight: 600}}>{t('Ver perfil', 'Профиль', 'View')}</span>
              </div>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}
