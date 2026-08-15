'use client';
import {useEffect, useState, useCallback} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {MiniAppShell} from '@/components/mini-app/MiniAppShell';
import {useMiniApp} from '@/context/MiniAppContext';
import {PrimaryButton, SecondaryButton} from '@/components/mini-app/Buttons';
import {LoadingState, ErrorState} from '@/components/mini-app/FeedbackStates';
import {getCategoryIcon} from '@/components/mini-app/CategoryTile';
import {apiFetch, triggerHaptic} from '@/lib/telegram-client';
import {formatPrice} from '@/lib/format';
import {ShieldCheck, MapPin, Briefcase} from 'lucide-react';

type ProviderData = {
  id: string; slug: string; photoPath?: string | null; displayName: string;
  categories: Array<{categoryId: string; priceFromArs?: number | null; slug: string; name_es: string; name_ru: string; name_en: string; icon: string}>;
  barrios: Array<{barrio_id: string; barrios: {slug: string; name_es: string; name_ru: string; name_en: string} | {slug: string; name_es: string; name_ru: string; name_en: string}[] | null}>;
};

const one = <T,>(v: T | T[] | null | undefined): T | null => Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

export default function ProviderDetailPage() {
  const params = useParams<{providerId: string}>();
  const {t, locale} = useMiniApp();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{provider: ProviderData} | null>(null);

  const fetchProvider = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<{provider: ProviderData}>(`/api/mini-app/providers/${params.providerId}`);
    if (res.error || !res.data) setError(res.error || 'No pudimos cargar el perfil');
    else setData(res.data);
    setLoading(false);
  }, [params.providerId]);

  useEffect(() => { fetchProvider(); }, [fetchProvider]);

  const handleOpenBot = () => {
    const url = 'https://t.me/BuenServ_bot';
    triggerHaptic('light');
    try {
      const w = window as unknown as {Telegram?: {WebApp?: {openTelegramLink?: (u: string) => void}}};
      if (w.Telegram?.WebApp?.openTelegramLink) {
        w.Telegram.WebApp.openTelegramLink(url);
        return;
      }
    } catch { /* fall through to browser fallback */ }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) return <MiniAppShell showBack><LoadingState /></MiniAppShell>;
  if (error || !data) return <MiniAppShell showBack><ErrorState message={error || undefined} onRetry={fetchProvider} /></MiniAppShell>;

  const p = data.provider;
  const barrioName = (b: {name_es: string; name_ru: string; name_en: string}) => locale === 'ru' ? b.name_ru : locale === 'en' ? b.name_en : b.name_es;

  return (
    <MiniAppShell showBack showBottomNav={false}>
      <div className="space-y-5 pb-8 -mt-1">
        <div className="bg-white rounded-[24px] p-5 border border-[#DCE4DE]/80 bs-card-shadow relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-[#0FA37F]" />
          <div className="flex items-start gap-4 pt-1">
            <div className="w-20 h-20 rounded-[18px] bg-[#EAF7F1] text-[#0FA37F] text-2xl font-bold flex items-center justify-center border border-[#0FA37F]/20 shrink-0">{p.displayName.slice(0, 2).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[22px] font-extrabold text-[#1A1F1D] tracking-tight leading-snug">{p.displayName}</h2>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-full bg-[#EAF7F1] text-[#0FA37F] text-[12px] font-bold border border-[#0FA37F]/30"><ShieldCheck className="w-3.5 h-3.5" />{t('status_verified')}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#DCE4DE]/80 bs-card-shadow space-y-3.5">
          <h3 className="text-[16px] font-bold text-[#1A1F1D] flex items-center gap-2"><Briefcase className="w-5 h-5 text-[#0FA37F]" />{t('profile_services')}</h3>
          <div className="divide-y divide-[#DCE4DE]/60">
            {p.categories.map((c) => (
              <div key={c.categoryId} className="py-3 first:pt-0 last:pb-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#EAF7F1] flex items-center justify-center shrink-0">{getCategoryIcon(c.slug, 'w-3.5 h-3.5 text-[#0FA37F]')}</div>
                    <h4 className="text-[15px] font-bold text-[#1A1F1D]">{locale === 'ru' ? c.name_ru : locale === 'en' ? c.name_en : c.name_es}</h4>
                  </div>
                  {c.priceFromArs ? <span className="text-[14px] font-extrabold text-[#0FA37F] shrink-0">${formatPrice(c.priceFromArs, locale)}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#DCE4DE]/80 bs-card-shadow space-y-3">
          <h3 className="text-[16px] font-bold text-[#1A1F1D] flex items-center gap-2"><MapPin className="w-5 h-5 text-[#0FA37F]" />{t('profile_zones')}</h3>
          <div className="flex flex-wrap gap-2">
            {p.barrios.map((pb, i) => { const b = one(pb.barrios); return b ? <span key={i} className="px-3 py-1.5 rounded-full bg-[#EAF7F1] text-[#0FA37F] text-[13px] font-semibold">{barrioName(b)}</span> : null; })}
          </div>
        </div>

        <PrimaryButton onClick={() => router.push(`/mini-app/contact/${p.id}`)}>{t('btn_send_request')}</PrimaryButton>
        <SecondaryButton onClick={handleOpenBot}>{t('btn_open_bot')}</SecondaryButton>
      </div>
    </MiniAppShell>
  );
}
