'use client';
import {Suspense, useEffect, useState, useCallback, useMemo} from 'react';
import {useSearchParams} from 'next/navigation';
import {MiniAppShell} from '@/components/mini-app/MiniAppShell';
import {useMiniApp} from '@/context/MiniAppContext';
import {ProviderCard, ProviderData} from '@/components/mini-app/ProviderCard';
import {FilterSheet} from '@/components/mini-app/FilterSheet';
import {LoadingState, ErrorState, EmptySearchState} from '@/components/mini-app/FeedbackStates';
import {apiFetch, triggerHaptic} from '@/lib/telegram-client';
import {Search, SlidersHorizontal, X, MapPin} from 'lucide-react';

type RawProvider = {
  id: string; slug: string; status: string; photo_path?: string | null;
  profiles: {display_name?: string | null} | {display_name?: string | null}[] | null;
  provider_categories: Array<{category_id: string; price_from_ars?: number | null; categories: {slug: string} | {slug: string}[] | null}>;
  provider_barrios: Array<{barrio_id: string; barrios: {slug: string; name_es: string; name_ru: string; name_en: string} | {slug: string; name_es: string; name_ru: string; name_en: string}[] | null}>;
};

type SearchApiResponse = {
  providers: RawProvider[];
  categories: Array<{id: string; slug: string; name_es: string; name_ru: string; name_en: string; icon?: string}>;
  barrios: Array<{id: string; slug: string; name_es: string; name_ru: string; name_en: string}>;
};

const one = <T,>(v: T | T[] | null | undefined): T | null => Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

function SearchContent() {
  const {t, locale} = useMiniApp();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const initialBarrio = searchParams.get('barrio') || 'all';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchApiResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedBarrio, setSelectedBarrio] = useState(initialBarrio);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setSelectedCategory(cat);
  }, [searchParams]);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    const q = new URLSearchParams();
    if (selectedCategory && selectedCategory !== 'all') q.set('category', selectedCategory);
    if (selectedBarrio && selectedBarrio !== 'all') q.set('barrio', selectedBarrio);
    if (searchQuery.trim()) q.set('q', searchQuery.trim());
    const res = await apiFetch<SearchApiResponse>(`/api/mini-app/search?${q.toString()}`);
    if (res.error || !res.data) setError(res.error || t('network_error_title'));
    else setData(res.data);
    setLoading(false);
  }, [selectedCategory, selectedBarrio, searchQuery, t]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (selectedCategory && selectedCategory !== 'all') c++;
    if (selectedBarrio && selectedBarrio !== 'all') c++;
    return c;
  }, [selectedCategory, selectedBarrio]);

  const handleClearFilters = () => {
    triggerHaptic('light');
    setSelectedCategory('all');
    setSelectedBarrio('all');
    setSearchQuery('');
    setIsFilterSheetOpen(false);
  };

  const providers: ProviderData[] = (data?.providers ?? []).map((p) => {
    const profile = one(p.profiles);
    const cats = (p.provider_categories ?? []).map((pc) => {
      const c = one(pc.categories);
      return {slug: c?.slug ?? '', title: c?.slug ?? '', priceFromArs: pc.price_from_ars ?? undefined};
    });
    const bars = (p.provider_barrios ?? []).map((pb) => {
      const b = one(pb.barrios);
      return locale === 'ru' ? (b?.name_ru ?? '') : locale === 'en' ? (b?.name_en ?? '') : (b?.name_es ?? '');
    }).filter(Boolean);
    return {
      id: p.id as unknown as number,
      displayName: profile?.display_name ?? 'Profesional',
      status: p.status,
      isVerified: p.status === 'approved',
      priceFromArs: cats[0]?.priceFromArs ?? 0,
      categories: cats,
      barrios: bars
    };
  });

  const categories = (data?.categories ?? []).map((c) => ({slug: c.slug, name: {es: c.name_es, ru: c.name_ru, en: c.name_en} as Record<string, string>}));
  const barrios = (data?.barrios ?? []).map((b) => locale === 'ru' ? b.name_ru : locale === 'en' ? b.name_en : b.name_es);

  return (
    <MiniAppShell
      title={t('nav_search')}
      rightAction={{
        icon: <div className="relative"><SlidersHorizontal className="w-5 h-5" />{activeFiltersCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#0FA37F] text-white text-[10px] font-bold flex items-center justify-center">{activeFiltersCount}</span>}</div>,
        onClick: () => setIsFilterSheetOpen(true),
        label: t('filters_btn')
      }}
    >
      <div className="space-y-4 pb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Search className="w-5 h-5 text-[#66706B]" /></div>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('search_placeholder')} className="w-full min-h-[48px] pl-10 pr-10 rounded-[14px] bg-white border border-[#DCE4DE] text-[15px] text-[#1A1F1D] placeholder-[#66706B] shadow-xs focus:outline-hidden focus:border-[#0FA37F] focus:ring-2 focus:ring-[#0FA37F]/20 transition-all" />
          {searchQuery && <button type="button" onClick={() => { triggerHaptic('light'); setSearchQuery(''); }} className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#66706B]" aria-label="Limpiar"><X className="w-5 h-5" /></button>}
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
            <button type="button" onClick={() => { triggerHaptic('light'); setSelectedCategory('all'); }} className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-[13px] font-bold shrink-0 transition-all ${selectedCategory === 'all' || !selectedCategory ? 'bg-[#0FA37F] text-white shadow-xs' : 'bg-white text-[#66706B] border border-[#DCE4DE] hover:bg-slate-50'}`}>{t('filter_all')}</button>
            {categories.map((c) => {
              const isSelected = selectedCategory === c.slug;
              const label = c.name[locale] || c.name.es || c.slug;
              return <button key={c.slug} type="button" onClick={() => { triggerHaptic('light'); setSelectedCategory(isSelected ? 'all' : c.slug); }} className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-[13px] font-bold shrink-0 transition-all ${isSelected ? 'bg-[#0FA37F] text-white shadow-xs' : 'bg-white text-[#1A1F1D] border border-[#DCE4DE] hover:bg-slate-50'}`}>{label}</button>;
            })}
          </div>
        )}

        {selectedBarrio && selectedBarrio !== 'all' && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-[#EAF7F1] rounded-[12px] text-[13px] font-semibold text-[#0FA37F]">
            <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 shrink-0" /><span>{selectedBarrio}</span></div>
            <button type="button" onClick={() => setSelectedBarrio('all')} className="text-[#0FA37F] hover:underline">{t('filter_clear')}</button>
          </div>
        )}

        {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={fetchResults} /> : providers.length === 0 ? (
          <EmptySearchState onChangeBarrio={() => { setSelectedBarrio('all'); setIsFilterSheetOpen(true); }} />
        ) : (
          <div className="space-y-3">
            <h3 className="text-[16px] font-bold text-[#1A1F1D]">{t('search_results_title')}</h3>
            {providers.map((p) => <ProviderCard key={p.id} provider={p} />)}
          </div>
        )}
      </div>

      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        categories={categories}
        barrios={barrios}
        selectedCategory={selectedCategory}
        selectedBarrio={selectedBarrio}
        onSelectCategory={setSelectedCategory}
        onSelectBarrio={setSelectedBarrio}
        onApply={() => { setIsFilterSheetOpen(false); fetchResults(); }}
        onClear={handleClearFilters}
      />
    </MiniAppShell>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<MiniAppShell><LoadingState /></MiniAppShell>}>
      <SearchContent />
    </Suspense>
  );
}
