'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {localizedBarrioName, type DirectoryProvider} from '@/lib/directory';
import {one} from '@/lib/relations';
import {ReportProvider} from '@/components/report-provider';

export type ProviderProfileData = DirectoryProvider & {bio?: string | null; profiles?: {display_name: string | null} | Array<{display_name: string | null}> | null; reviews?: Array<{rating: number; body: string; locale: string; created_at: string}>};

export function ProviderProfile({slug, locale, botUsername, initialProfile}: {slug: string; locale: string; botUsername: string; initialProfile?: ProviderProfileData | null}) {
  const t = useTranslations('profile');
  const [profile, setProfile] = useState<ProviderProfileData | null>(initialProfile ?? null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (initialProfile) return;
    const controller = new AbortController(); fetch(`/api/providers/${slug}`, {signal: controller.signal}).then(response => response.ok ? response.json() : Promise.reject()).then(payload => setProfile(payload.provider)).catch(() => setUnavailable(true)); return () => controller.abort();
  }, [slug, initialProfile]);
  if (!profile && !unavailable) return <p className="mt-10 text-bs-muted">{t('loading')}</p>;
  if (unavailable || !profile) return <p className="mt-10 rounded-2xl bg-bs-mint p-6 text-bs-primary-dark">{t('unavailable')}</p>;
  const barrio = localizedBarrioName(profile.provider_barrios?.[0]?.barrios, locale);
  const profileRecord = one(profile.profiles);
  const displayName = profileRecord?.display_name ?? profile.slug.replaceAll('-', ' ');
  const telegramHref = botUsername ? `https://t.me/${botUsername}?start=performer_${profile.id}` : 'https://t.me';
  return <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]"><div><div className="rounded-2xl border border-black/8 bg-white p-6"><div className="flex items-center gap-4"><div className="grid size-18 place-items-center rounded-full bg-bs-mint font-display text-3xl font-extrabold text-bs-primary">{profile.slug.slice(0, 1).toUpperCase()}</div><div><h1 className="font-display text-4xl font-extrabold tracking-[-.06em]">{displayName}</h1><p className="mt-1 text-sm text-bs-muted">{barrio}</p><p className="mt-2 text-sm"><span className="text-[#B86D00]">★★★★★</span> <b>{profile.rating.toFixed(1)}</b> · {profile.reviews_count} {t('reviews')}</p></div></div></div><article className="mt-6 border-t border-black/8 pt-6"><h2 className="font-display text-2xl font-extrabold">{t('about')}</h2><p className="mt-3 text-bs-muted">{profile.bio}</p></article><article className="mt-6 border-t border-black/8 pt-6"><h2 className="font-display text-2xl font-extrabold">{t('services')}</h2>{profile.provider_categories?.map(item => <div key={item.categories?.slug} className="mt-3 flex justify-between rounded-xl border border-black/8 bg-white p-4"><span>{item.categories?.slug}</span><b>{item.price_from_ars ? `$${item.price_from_ars}` : '—'}</b></div>)}</article>{profile.reviews?.length ? <article className="mt-6 border-t border-black/8 pt-6"><h2 className="font-display text-2xl font-extrabold">{t('recentReviews')}</h2>{profile.reviews.map((review, index) => <div key={`${review.created_at}-${index}`} className="mt-4 border-b border-black/7 pb-4"><p className="text-sm"><span className="text-[#B86D00]">★★★★★</span> {review.rating.toFixed(1)}</p><p className="mt-2 text-sm text-bs-muted">{review.body}</p></div>)}</article> : null}</div><aside className="h-max rounded-2xl border border-black/8 bg-white p-6"><p className="text-sm text-bs-muted">Telegram-first coordination</p><a href={telegramHref} className="mt-4 block rounded-lg bg-bs-primary px-4 py-3 text-center text-sm font-extrabold text-white no-underline">{t('contact')}</a><p className="mt-4 text-xs text-bs-muted">USDT details are never shown publicly.</p><ReportProvider providerId={profile.id} botUsername={botUsername}/></aside></section>;
}
