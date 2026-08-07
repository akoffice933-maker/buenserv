import {getTranslations} from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('home');
  return (
    <main style={{maxWidth: 960, margin: '0 auto', padding: '96px 24px', fontFamily: 'var(--font-body), system-ui', color: '#1A1F1D', background: '#FAF9F6', minHeight: '100vh'}}>
      <span style={{color: '#0FA37F', fontWeight: 800, fontSize: 12, letterSpacing: '.1em'}}>{t('eyebrow')}</span>
      <h1 style={{fontFamily: 'var(--font-display), sans-serif', fontSize: 'clamp(42px,7vw,76px)', lineHeight: '.96', maxWidth: 780, letterSpacing: '-.06em', margin: '16px 0'}}>{t('title')}</h1>
      <p style={{fontSize: 19, color: '#66706B', maxWidth: 620}}>{t('description')}</p>
      <a href="https://t.me" style={{display: 'inline-block', marginTop: 16, background: '#0FA37F', color: 'white', borderRadius: 9, padding: '14px 18px', fontWeight: 800, textDecoration: 'none'}}>{t('telegram')}</a>
    </main>
  );
}
