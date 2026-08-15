'use client';
import {useRouter} from 'next/navigation';
import {MiniAppShell} from '@/components/mini-app/MiniAppShell';
import {useMiniApp} from '@/context/MiniAppContext';
import {EmptyState} from '@/components/mini-app/FeedbackStates';
import {Heart} from 'lucide-react';
import {triggerHaptic} from '@/lib/telegram-client';

export default function FavoritesPage() {
  const {t} = useMiniApp();
  const router = useRouter();
  const handleExplore = () => { triggerHaptic('medium'); router.push('/mini-app/search'); };

  return (
    <MiniAppShell title={t('nav_favorites')}>
      <div className="flex-1 flex flex-col justify-center py-8">
        <EmptyState icon={Heart} title={t('favorites_empty_title')} description={t('favorites_empty_desc')} actionText={t('favorites_explore_btn')} onAction={handleExplore} />
      </div>
    </MiniAppShell>
  );
}
