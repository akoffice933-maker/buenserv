import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {ImageResponse} from 'next/og';
import {getTranslations} from 'next-intl/server';

export const runtime = 'nodejs';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';
const font = readFile(join(process.cwd(), 'src/assets/DejaVuSans-Bold.ttf'));

export default async function LocaleOpenGraphImage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'og'});
  return new ImageResponse(<div style={{height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#FAF9F6', color: '#1A1F1D', padding: 72, fontFamily: 'BuenServ OG'}}><div style={{display: 'flex', alignItems: 'center', fontSize: 42, fontWeight: 700}}><span style={{display: 'flex', width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', background: '#0FA37F', color: 'white', marginRight: 16}}>b</span>BuenServ</div><div style={{fontSize: 78, lineHeight: 1, fontWeight: 700, letterSpacing: -4, maxWidth: 920}}>{t('tagline')}</div><div style={{display: 'flex', fontSize: 28, color: '#0FA37F'}}>{t('location')}</div></div>, {...size, fonts: [{name: 'BuenServ OG', data: await font, weight: 700, style: 'normal'}]});
}
