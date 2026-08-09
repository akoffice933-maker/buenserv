import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {SiteHeader} from '@/components/site-header';
import {ProviderProfile} from '@/components/provider-profile';
import {getTelegramBotUsername} from '@/lib/telegram/deep-link';
import {localizedMetadata} from '@/lib/seo';
import {getApprovedProviderBySlug} from '@/lib/provider-query';
import {one} from '@/lib/relations';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: {params: Promise<{locale: string; slug: string}>}) {
  const {locale, slug} = await params; const t = await getTranslations({locale, namespace: 'profile'});
  let provider;
  try { provider = await getApprovedProviderBySlug(slug); } catch { return localizedMetadata(locale, `profile/${slug}`, t('seoTitle'), t('seoDescription')); }
  if (!provider) notFound();
  const profile = one(provider.profiles);
  const title = profile?.display_name ?? t('seoTitle');
  return localizedMetadata(locale, `profile/${slug}`, title, provider.bio ?? t('seoDescription'));
}

export default async function ProviderPage({params}: {params: Promise<{locale: string; slug: string}>}) {
  const {locale, slug} = await params;
  const t = await getTranslations('categories');
  let provider;
  try { provider = await getApprovedProviderBySlug(slug); } catch { provider = undefined; }
  if (provider === null) notFound();
  const profile = one(provider?.profiles);
  const jsonLd = provider ? {
    '@context': 'https://schema.org', '@type': 'LocalBusiness',
    name: profile?.display_name ?? provider.slug,
    description: provider.bio ?? undefined,
    areaServed: (provider.provider_barrios ?? []).map((item: any) => one(item.barrios)?.name_es).filter(Boolean),
    makesOffer: (provider.provider_categories ?? []).map((item: any) => ({'@type': 'Offer', priceCurrency: 'ARS', price: item.price_from_ars, itemOffered: {'@type': 'Service', name: one(item.categories)?.slug}})), 
    aggregateRating: provider.reviews_count > 0 ? {'@type': 'AggregateRating', ratingValue: provider.rating, reviewCount: provider.reviews_count} : undefined
  } : null;
  return <><SiteHeader locale={locale}/>{jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd).replace(/</g, '\\u003c')}}/>}<main className="mx-auto min-h-[calc(100vh-68px)] max-w-7xl px-5 py-18 lg:px-8"><span className="text-[11px] font-extrabold tracking-[.12em] text-bs-primary uppercase">{t('eyebrow')}</span><ProviderProfile slug={slug} locale={locale} botUsername={getTelegramBotUsername()}/></main></>;
}
