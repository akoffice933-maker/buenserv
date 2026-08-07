import '../globals.css';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'BuenServ Admin', robots: {index: false, follow: false}};

export default function AdminLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="es-AR"><body style={{margin: 0, background: '#F7F7F3', color: '#1A1F1D', fontFamily: 'var(--font-body), system-ui'}}>{children}</body></html>;
}
