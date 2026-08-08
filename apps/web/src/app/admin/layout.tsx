import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'BuenServ Admin', robots: {index: false, follow: false}};

export default function AdminLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <div className="min-h-screen bg-[#F7F7F3] text-bs-ink">{children}</div>;
}
