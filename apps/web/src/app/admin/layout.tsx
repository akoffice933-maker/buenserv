import type {Metadata} from 'next';
import {AdminThemeToggle} from '@/components/admin-theme-toggle';

export const metadata: Metadata = {title: 'BuenServ Admin', robots: {index: false, follow: false}};

export default function AdminLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <><script dangerouslySetInnerHTML={{__html: "(function(){var dark=localStorage.getItem('buenserv-admin-theme')==='dark';document.documentElement.dataset.adminTheme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';})()"}}/><div className="admin-page min-h-screen bg-[#F7F7F3] text-bs-ink"><AdminThemeToggle/>{children}</div></>;
}
