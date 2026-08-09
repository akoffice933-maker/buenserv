import {ImageResponse} from 'next/og';
import {getTranslations} from 'next-intl/server';

export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

export default async function LocaleOpenGraphImage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'og'});
  return new ImageResponse(<div style={{height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#FAF9F6', color: '#1A1F1D', padding: 72}}><div style={{display: 'flex', alignItems: 'center', fontSize: 42, fontWeight: 800}}><span style={{display: 'flex', width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', background: '#0FA37F', color: 'white', marginRight: 16}}>b</span>BuenServ</div><div style={{fontSize: 78, lineHeight: 1, fontWeight: 800, letterSpacing: -4, maxWidth: 920}}>{t('tagline')}</div><div style={{display: 'flex', fontSize: 28, color: '#0FA37F'}}>{t('location')}</div></div>, size);
}
