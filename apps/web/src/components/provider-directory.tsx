'use client';

import Link from 'next/link';
import {useEffect, useState, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {localizedBarrioName, type DirectoryProvider} from '@/lib/directory';

type State = {status: 'loading'} | {status: 'ready'; providers: DirectoryProvider[]} | {status: 'unavailable'};
const localeMap: Record<string, string> = {es: 'es-AR', ru: 'ru-RU', en: 'en-US'};
const barrios = ['palermo', 'recoleta', 'belgrano', 'caballito'];

export function ProviderDirectory({category, locale}: {category: string; locale: string}) {
  const t = useTranslations('directory');
  const [state, setState] = useState<State>({status: 'loading'});
  const [barrio, setBarrio] = useState('');
  const [usdt, setUsdt] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setState({status: 'loading'});
    const query = new URLSearchParams({category, limit: '12'});
    if (barrio) query.set('barrio', barrio);
    if (usdt) query.set('usdt', 'true');
    fetch(`/api/providers?${query}`, {signal: controller.signal})
      .then(response => response.ok ? response.json() : Promise.reject(new Error('directory unavailable')))
      .then(payload => setState({status: 'ready', providers: payload.providers ?? []}))
      .catch(error => { if (error.name !== 'AbortError') setState({status: 'unavailable'}); });
    return () => controller.abort();
  }, [category, barrio, usdt]);

  let content: ReactNode;
  if (state.status === 'loading') content = <div aria-live="polite" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(item => <div key={item} className="h-53 animate-pulse rounded-2xl border border-black/7 bg-white p-5"><div className="size-12 rounded-full bg-black/7"/><div className="mt-7 h-5 w-2/3 rounded bg-black/7"/><div className="mt-3 h-4 w-1/2 rounded bg-black/7"/></div>)}</div>;
  else if (state.status === 'unavailable') content = <div className="rounded-2xl border border-dashed border-bs-secondary/45 bg-white p-7"><h2 className="font-display text-2xl font-extrabold">{t('unavailableTitle')}</h2><p className="mt-2 text-sm text-bs-muted">{t('unavailableBody')}</p></div>;
  else if (!state.providers.length) content = <div className="rounded-2xl border border-dashed border-bs-primary/35 bg-bs-mint/40 p-7"><h2 className="font-display text-2xl font-extrabold">{t('emptyTitle')}</h2><p className="mt-2 text-sm text-bs-muted">{t('emptyBody')}</p></div>;
  else {
    const currency = new Intl.NumberFormat(localeMap[locale] ?? 'es-AR', {style: 'currency', currency: 'ARS', maximumFractionDigits: 0});
    content = <section aria-label={t('results')} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{state.providers.map(provider => {
      const price = provider.provider_categories?.[0]?.price_from_ars;
      const barrioName = localizedBarrioName(provider.provider_barrios?.[0]?.barrios, locale);
      return <Link key={provider.id} href={`/${locale}/profile/${provider.slug}`} className="rounded-2xl border border-black/8 bg-white p-5 shadow-[0_8px_24px_rgba(23,53,42,.05)] no-underline transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(23,53,42,.10)]"><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-full bg-bs-mint font-display text-lg font-extrabold text-bs-primary">{provider.slug.slice(0, 1).toUpperCase()}</div><div><h2 className="font-display text-xl font-extrabold">{provider.slug.replaceAll('-', ' ')}</h2><p className="text-xs text-bs-muted">{barrioName}</p></div></div><p className="mt-5 text-sm"><span className="text-[#B86D00]">★★★★★</span> <b>{provider.rating.toFixed(1)}</b> · {provider.reviews_count} {t('reviews')}</p><div className="mt-4 flex items-center justify-between border-t border-black/7 pt-4"><span className="font-extrabold">{price ? currency.format(price) : t('askPrice')}</span>{provider.accepts_usdt && <span className="rounded-full bg-bs-mint px-2 py-1 text-[11px] font-extrabold text-bs-primary-dark">USDT ✓</span>}</div></Link>;
    })}</section>;
  }

  return <div className="mt-8"><div className="mb-5 flex flex-wrap items-center gap-3"><label className="text-sm font-bold"><span className="sr-only">{t('allBarrios')}</span><select value={barrio} onChange={event => setBarrio(event.target.value)} className="rounded-lg border border-black/12 bg-white px-3 py-2"><option value="">{t('allBarrios')}</option>{barrios.map(item => <option key={item} value={item}>{item}</option>)}</select></label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={usdt} onChange={event => setUsdt(event.target.checked)}/>{t('onlyUsdt')}</label></div>{content}</div>;
}
