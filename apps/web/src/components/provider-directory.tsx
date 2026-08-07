'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {localizedBarrioName, type DirectoryProvider} from '@/lib/directory';

type State = {status: 'loading'} | {status: 'ready'; providers: DirectoryProvider[]} | {status: 'unavailable'};

const localeMap: Record<string, string> = {es: 'es-AR', ru: 'ru-RU', en: 'en-US'};

export function ProviderDirectory({category, locale}: {category: string; locale: string}) {
  const t = useTranslations('directory');
  const [state, setState] = useState<State>({status: 'loading'});

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/providers?category=${encodeURIComponent(category)}&limit=12`, {signal: controller.signal})
      .then(response => response.ok ? response.json() : Promise.reject(new Error('directory unavailable')))
      .then(payload => setState({status: 'ready', providers: payload.providers ?? []}))
      .catch(error => { if (error.name !== 'AbortError') setState({status: 'unavailable'}); });
    return () => controller.abort();
  }, [category]);

  if (state.status === 'loading') return <div aria-live="polite" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(item => <div key={item} className="h-53 animate-pulse rounded-2xl border border-black/7 bg-white p-5"><div className="size-12 rounded-full bg-black/7"/><div className="mt-7 h-5 w-2/3 rounded bg-black/7"/><div className="mt-3 h-4 w-1/2 rounded bg-black/7"/></div>)}</div>;
  if (state.status === 'unavailable') return <div className="mt-8 rounded-2xl border border-dashed border-bs-secondary/45 bg-white p-7"><h2 className="font-display text-2xl font-extrabold">{t('unavailableTitle')}</h2><p className="mt-2 text-sm text-bs-muted">{t('unavailableBody')}</p></div>;
  if (!state.providers.length) return <div className="mt-8 rounded-2xl border border-dashed border-bs-primary/35 bg-bs-mint/40 p-7"><h2 className="font-display text-2xl font-extrabold">{t('emptyTitle')}</h2><p className="mt-2 text-sm text-bs-muted">{t('emptyBody')}</p></div>;

  const currency = new Intl.NumberFormat(localeMap[locale] ?? 'es-AR', {style: 'currency', currency: 'ARS', maximumFractionDigits: 0});
  return <section aria-label={t('results')} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{state.providers.map(provider => {
    const price = provider.provider_categories?.[0]?.price_from_ars;
    const barrioName = localizedBarrioName(provider.provider_barrios?.[0]?.barrios, locale);
    return <Link key={provider.id} href={`/${locale}/profile/${provider.slug}`} className="rounded-2xl border border-black/8 bg-white p-5 shadow-[0_8px_24px_rgba(23,53,42,.05)] no-underline transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(23,53,42,.10)]"><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-full bg-bs-mint font-display text-lg font-extrabold text-bs-primary">{provider.slug.slice(0, 1).toUpperCase()}</div><div><h2 className="font-display text-xl font-extrabold">{provider.slug.replaceAll('-', ' ')}</h2><p className="text-xs text-bs-muted">{barrioName}</p></div></div><p className="mt-5 text-sm"><span className="text-[#B86D00]">★★★★★</span> <b>{provider.rating.toFixed(1)}</b> · {provider.reviews_count} {t('reviews')}</p><div className="mt-4 flex items-center justify-between border-t border-black/7 pt-4"><span className="font-extrabold">{price ? currency.format(price) : t('askPrice')}</span>{provider.accepts_usdt && <span className="rounded-full bg-bs-mint px-2 py-1 text-[11px] font-extrabold text-bs-primary-dark">USDT ✓</span>}</div></Link>;
  })}</section>;
}
