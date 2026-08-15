'use client';
import {useEffect, useState, useCallback} from 'react';
import Link from 'next/link';
import {MiniAppShell} from '@/components/mini-app/MiniAppShell';
import {useMiniApp} from '@/context/MiniAppContext';
import {CategoryTile} from '@/components/mini-app/CategoryTile';
import {LeadCard, LeadCardData} from '@/components/mini-app/LeadCard';
import {StatusBadge} from '@/components/mini-app/StatusBadge';
import {LoadingState, ErrorState} from '@/components/mini-app/FeedbackStates';
import {apiFetch, triggerHaptic} from '@/lib/telegram-client';
import {Search, Briefcase, ShieldCheck, ChevronRight} from 'lucide-react';
import {CANONICAL_CATEGORIES} from '@/lib/constants';

type Lead = {
  id: string; status: string; created_at: string; updated_at: string;
  categories?: {slug?: string} | null;
  barrios?: {name_es?: string; name_ru?: string; name_en?: string} | null;
  providers?: {slug?: string} | null;
};

type DashboardData = {
  profile: {id: string; firstName: string; locale: string};
  provider: {id: string; slug: string; status: string} | null;
  customerLeads: Lead[];
  providerLeads: Lead[];
};

export default function MiniAppHomePage() {
  const {t, locale} = useMiniApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<DashboardData>('/api/mini-app/dashboard');
    if (res.error || !res.data) {
      setError(res.error || t('network_error_title'));
    } else {
      setData(res.data);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) return <MiniAppShell><LoadingState /></MiniAppShell>;
  if (error || !data) return <MiniAppShell><ErrorState message={error || undefined} onRetry={fetchDashboard} /></MiniAppShell>;

  const userName = data.profile.firstName || 'Che';
  const isProvider = !!data.provider;

  const toLeadCard = (lead: Lead, providerName?: string): LeadCardData => ({
    id: lead.id as unknown as number,
    categorySlug: lead.categories?.slug ?? '',
    barrioName: locale === 'ru' ? (lead.barrios?.name_ru ?? '') : locale === 'en' ? (lead.barrios?.name_en ?? '') : (lead.barrios?.name_es ?? ''),
    status: lead.status,
    createdAt: lead.created_at,
    updatedAt: lead.updated_at,
    providerDisplayName: providerName
  });

  return (
    <MiniAppShell>
      <div className="space-y-6 pb-4">
        <div className="pt-2">
          <h2 className="text-[26px] font-extrabold text-[#1A1F1D] tracking-tight leading-tight">{t('greeting', {name: userName})}</h2>
          <p className="text-[14px] text-[#66706B] mt-0.5 font-medium">{t('tagline')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/mini-app/search" onClick={() => triggerHaptic('medium')} className="flex flex-col justify-between p-4 rounded-[18px] bg-[#0FA37F] text-white bs-card-shadow active:scale-[0.98] transition-all hover:bg-[#08735A]">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-3"><Search className="w-5 h-5 text-white" /></div>
            <div><span className="text-[15px] font-extrabold leading-tight block">{t('top_search_btn')}</span><span className="text-[11px] text-white/80 font-medium">Buenos Aires</span></div>
          </Link>
          <Link href="/mini-app/onboarding" onClick={() => triggerHaptic('medium')} className="flex flex-col justify-between p-4 rounded-[18px] bg-white border border-[#DCE4DE] text-[#1A1F1D] bs-card-shadow active:scale-[0.98] transition-all hover:border-[#0FA37F]/50">
            <div className="w-10 h-10 rounded-full bg-[#EAF7F1] flex items-center justify-center mb-3"><Briefcase className="w-5 h-5 text-[#0FA37F]" /></div>
            <div><span className="text-[15px] font-extrabold leading-tight block">{t('top_offer_btn')}</span><span className="text-[11px] text-[#66706B] font-medium">BuenServ</span></div>
          </Link>
        </div>

        {data.provider && (
          <div className="p-4 bg-white rounded-[20px] border border-[#DCE4DE] bs-card-shadow space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#0FA37F]" /><span className="text-[15px] font-bold text-[#1A1F1D]">{t('provider_status_card_title')}</span></div>
              <StatusBadge status={data.provider.status} size="sm" />
            </div>
            <div className="flex items-center justify-between text-[13px] pt-2 border-t border-[#DCE4DE]/50">
              <span className="text-[#66706B] font-medium">{data.provider.slug}</span>
              <Link href="/mini-app/profile" className="text-[#0FA37F] font-bold flex items-center gap-1 hover:underline">{t('nav_profile')}<ChevronRight className="w-4 h-4" /></Link>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[19px] font-bold text-[#1A1F1D] tracking-tight">{t('section_categories')}</h3>
            <Link href="/mini-app/search" className="text-[13px] font-bold text-[#0FA37F] hover:underline flex items-center gap-0.5">{t('nav_search')}<ChevronRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {CANONICAL_CATEGORIES.map((cat) => <CategoryTile key={cat.slug} slug={cat.slug} name={cat.name} />)}
          </div>
        </div>

        {data.customerLeads.length > 0 && (
          <div>
            <h3 className="text-[19px] font-bold text-[#1A1F1D] tracking-tight mb-3">{t('section_my_requests')}</h3>
            <div className="space-y-3">
              {data.customerLeads.map((lead) => <LeadCard key={lead.id} lead={toLeadCard(lead, lead.providers?.slug)} role="customer" />)}
            </div>
          </div>
        )}

        {isProvider && data.providerLeads.length > 0 && (
          <div>
            <h3 className="text-[19px] font-bold text-[#1A1F1D] tracking-tight mb-3">{t('section_provider_requests')}</h3>
            <div className="space-y-3">
              {data.providerLeads.map((lead) => <LeadCard key={lead.id} lead={toLeadCard(lead)} role="provider" />)}
            </div>
          </div>
        )}
      </div>
    </MiniAppShell>
  );
}
