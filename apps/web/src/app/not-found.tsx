import Link from 'next/link';

export default function NotFound() {
  return <main style={{minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui', background: '#FAF9F6', color: '#1A1F1D', textAlign: 'center'}}><div><p style={{color: '#0FA37F', fontWeight: 800}}>ERROR 404</p><h1 style={{fontSize: 48, letterSpacing: '-.06em', margin: '8px 0'}}>This page is not here.</h1><p style={{color: '#66706B'}}>Let’s get you back to BuenServ.</p><Link href="/es" style={{display: 'inline-block', marginTop: 16, background: '#0FA37F', color: 'white', padding: '12px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 800}}>Go to BuenServ</Link></div></main>;
}
