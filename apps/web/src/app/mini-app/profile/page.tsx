'use client';
import {useEffect, useState, useCallback} from 'react';
import Link from 'next/link';
import {MiniAppShell} from '@/components/mini-app/MiniAppShell';
import {useMiniApp} from '@/context/MiniAppContext';
import {StatusBadge} from '@/components/mini-app/StatusBadge';
import {LoadingState, ErrorState} from '@/components/mini-app/FeedbackStates';
import {apiFetch, triggerHaptic} from '@/lib/telegram-client';
import {LOCALES} from '@/lib/i18n';
import {User, Globe, HelpCircle, Briefcase, ChevronRight, ExternalLink} from 'lucide-react';

type ProfileResponse = {
  profile: {id: string; displayName: string; locale: string};
  provider: {id: string; slug: string; status: string; moderation_reason?: string | null} | null;
  activeRequestCount: number;
};

export default function ProfilePage() {
  const {t, locale, setIsLocaleSheetOpen, hydrateLocale} = useMiniApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProfileResponse | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<ProfileResponse>('/api/mini-app/profile');
    if (res.error || !res.data) setError(res.error || 'No pudimos cargar el perfil');
    else { setData(res.data); hydrateLocale(res.data.profile.locale as 'es-AR' | 'ru' | 'en'); }
    setLoading(false);
  }, [hydrateLocale]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleOpenBot = () => { triggerHaptic('light'); if (typeof window !== 'undefined') window.open('https://t.me/BuenServ_bot', '_blank'); };
  const handleOpenSupport = () => { triggerHaptic('light'); if (typeof window !== 'undefined') window.open('https://t.me/BuenServ_bot?start=support', '_blank'); };

  if (loading) return <MiniAppShell title={t('profile_title')}><LoadingState /></MiniAppShell>;
  if (error || !data) return <MiniAppShell title={t('profile_title')}><ErrorState message={error || undefined} onRetry={fetchProfile} /></MiniAppShell>;

  const {profile, provider} = data;
  const currentFlag = LOCALES.find((l) => l.code === locale)?.flag || '🇦🇷';
  const currentLabel = LOCALES.find((l) => l.code === locale)?.label || 'Español';

  return (
    <MiniAppShell title={t('profile_title')}>
      <div className="space-y-5 pb-6">
        <div className="bg-white rounded-[24px] p-5 border border-[#DCE4DE]/80 bs-card-shadow flex items-center gap-4">
          <div className="w-16 h-16 rounded-[18px] bg-[#EAF7F1] text-[#0FA37F] text-2xl font-extrabold flex items-center justify-center border border-[#0FA37F]/20 shadow-2xs"><User className="w-7 h-7" /></div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[20px] font-bold text-[#1A1F1D] truncate">{profile.displayName || 'BuenServ user'}</h2>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[#FAF9F6] border border-[#DCE4DE] text-[11px] font-bold text-[#66706B]">{t('profile_active_leads')}: {data.activeRequestCount}</span>
          </div>
        </div>

        {provider ? (
          <div className="bg-white rounded-[20px] p-5 border border-[#DCE4DE]/80 bs-card-shadow space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-[#0FA37F]" /><h3 className="text-[16px] font-bold text-[#1A1F1D]">{t('profile_provider_title')}</h3></div>
              <StatusBadge status={provider.status} size="sm" />
            </div>
            <div className="p-3 bg-[#FAF9F6] rounded-[14px] border border-[#DCE4DE]/60 text-[13px]">
              <div className="flex items-center justify-between"><span className="text-[#66706B]">Slug:</span><span className="font-bold text-[#1A1F1D]">{provider.slug}</span></div>
            </div>
            {provider.moderation_reason && <p className="text-[12px] text-amber-800 bg-amber-50 p-2.5 rounded-[10px] border border-amber-200"><strong>Nota:</strong> {provider.moderation_reason}</p>}
            {provider.status === 'approved' && (
              <Link href={`/mini-app/providers/${provider.id}`} className="w-full min-h-[44px] px-4 py-2 rounded-[12px] bg-[#EAF7F1] text-[#0FA37F] text-[14px] font-bold inline-flex items-center justify-center gap-1.5 hover:bg-[#d5f0e3] transition-colors"><span>Ver mi perfil público</span><ExternalLink className="w-4 h-4" /></Link>
            )}
            {provider.status === 'draft' && (
              <Link href="/mini-app/onboarding" className="w-full min-h-[44px] px-4 py-2 rounded-[12px] bg-[#0FA37F] text-white text-[14px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors">Continuar registro</Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[20px] p-5 border border-[#DCE4DE]/80 bs-card-shadow text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EAF7F1] text-[#0FA37F] flex items-center justify-center mx-auto"><Briefcase className="w-6 h-6" /></div>
            <div><h3 className="text-[16px] font-bold text-[#1A1F1D]">{t('onboarding_title')}</h3><p className="text-[13px] text-[#66706B] mt-0.5 max-w-xs mx-auto">{t('onboarding_subtitle')}</p></div>
            <Link href="/mini-app/onboarding" className="w-full min-h-[48px] px-4 py-2.5 rounded-[14px] bg-[#0FA37F] text-white text-[14px] font-bold inline-flex items-center justify-center transition-colors">{t('top_offer_btn')}</Link>
          </div>
        )}

        <div className="bg-white rounded-[20px] p-5 border border-[#DCE4DE]/80 bs-card-shadow space-y-2">
          <button type="button" onClick={() => setIsLocaleSheetOpen(true)} className="w-full min-h-[48px] flex items-center justify-between px-1 rounded-[12px] hover:bg-slate-50 transition-colors">
            <span className="flex items-center gap-2 text-[14px] font-semibold text-[#1A1F1D]"><Globe className="w-5 h-5 text-[#0FA37F]" />{t('profile_language_setting')}</span>
            <span className="flex items-center gap-1 text-[13px] text-[#66706B]">{currentFlag} {currentLabel}<ChevronRight className="w-4 h-4" /></span>
          </button>
          <button type="button" onClick={handleOpenSupport} className="w-full min-h-[48px] flex items-center justify-between px-1 rounded-[12px] hover:bg-slate-50 transition-colors">
            <span className="flex items-center gap-2 text-[14px] font-semibold text-[#1A1F1D]"><HelpCircle className="w-5 h-5 text-[#0FA37F]" />{t('profile_support_btn')}</span>
            <ChevronRight className="w-4 h-4 text-[#66706B]" />
          </button>
          <button type="button" onClick={handleOpenBot} className="w-full min-h-[48px] flex items-center justify-between px-1 rounded-[12px] hover:bg-slate-50 transition-colors">
            <span className="flex items-center gap-2 text-[14px] font-semibold text-[#1A1F1D]"><ExternalLink className="w-5 h-5 text-[#0FA37F]" />{t('profile_open_bot')}</span>
            <ChevronRight className="w-4 h-4 text-[#66706B]" />
          </button>
        </div>
      </div>
    </MiniAppShell>
  );
}
