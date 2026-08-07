import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';
import {ProviderProfile} from '@/components/provider-profile';
import {getTelegramBotUsername} from '@/lib/telegram/deep-link';
import {localizedMetadata} from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: {params: Promise<{locale: string; slug: string}>}) { const {locale, slug} = await params; const t = await getTranslations({locale, namespace: 'profile'}); return localizedMetadata(locale, `profile/${slug}`, t('seoTitle'), t('seoDescription')); }

export default async function ProviderPage({params}: {params: Promise<{locale: string; slug: string}>}) {
  const {locale, slug} = await params;
  const t = await getTranslations('categories');
  return <><SiteHeader locale={locale}/><main className="mx-auto min-h-[calc(100vh-68px)] max-w-7xl px-5 py-18 lg:px-8"><span className="text-[11px] font-extrabold tracking-[.12em] text-bs-primary uppercase">{t('eyebrow')}</span><ProviderProfile slug={slug} locale={locale} botUsername={getTelegramBotUsername()}/></main></>;
}
