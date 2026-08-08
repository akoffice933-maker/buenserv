import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';
import {localizedMetadata} from '@/lib/seo';

type Article = {tag: string; title: string; body: string};

export async function generateMetadata({params}: {params: Promise<{locale: string}>}) { const {locale} = await params; const t = await getTranslations({locale, namespace: 'blog'}); return localizedMetadata(locale, 'blog', t('title'), t('description')); }

export default async function BlogPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params; const t = await getTranslations('blog'); const articles = t.raw('articles') as Article[];
  return <><SiteHeader locale={locale}/><main className="mx-auto min-h-[calc(100vh-68px)] max-w-7xl px-5 py-18 lg:px-8"><span className="text-[11px] font-extrabold tracking-[.12em] text-bs-primary uppercase">{t('eyebrow')}</span><h1 className="font-display mt-4 max-w-3xl text-5xl font-extrabold tracking-[-.06em] sm:text-6xl">{t('title')}</h1><p className="mt-5 max-w-xl text-lg text-bs-muted">{t('description')}</p><section className="mt-12 grid gap-4 md:grid-cols-3">{articles.map(article => <article key={article.title} className="rounded-2xl border border-black/8 bg-white p-6"><span className="rounded-full bg-bs-mint px-2 py-1 text-xs font-bold text-bs-primary-dark">{article.tag}</span><h2 className="font-display mt-8 text-2xl font-extrabold tracking-[-.04em]">{article.title}</h2><p className="mt-3 text-sm leading-relaxed text-bs-muted">{article.body}</p></article>)}</section></main></>;
}
