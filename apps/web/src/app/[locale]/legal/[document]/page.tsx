import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';
import {localizedMetadata} from '@/lib/seo';

const documents = ['terms', 'privacy', 'cookies'] as const;
type LegalDocument = typeof documents[number];

export function generateStaticParams() { return ['es', 'ru', 'en'].flatMap(locale => documents.map(document => ({locale, document}))); }

export async function generateMetadata({params}: {params: Promise<{locale: string; document: string}>}) {
  const {locale, document} = await params;
  if (!documents.includes(document as LegalDocument)) notFound();
  const t = await getTranslations({locale, namespace: `legal.${document}`});
  return {...localizedMetadata(locale, `legal/${document}`, t('title'), t('body')), robots: {index: false, follow: false}};
}

export default async function LegalPage({params}: {params: Promise<{locale: string; document: string}>}) {
  const {locale, document} = await params;
  if (!documents.includes(document as LegalDocument)) notFound();
  const t = await getTranslations(`legal.${document}`);
  const legal = await getTranslations('legal');
  return <><SiteHeader locale={locale}/><main className="mx-auto min-h-[calc(100vh-68px)] max-w-3xl px-5 py-18"><span className="text-[11px] font-extrabold tracking-[.12em] text-bs-primary uppercase">BuenServ · Legal</span><h1 className="font-display mt-4 text-5xl font-extrabold tracking-[-.06em] sm:text-6xl">{t('title')}</h1><p className="mt-8 max-w-2xl text-base leading-relaxed text-bs-muted">{t('body')}</p><p role="note" className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{legal('notice')}</p></main></>;
}
