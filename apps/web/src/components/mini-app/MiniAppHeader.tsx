"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Filter, Share2 } from "lucide-react";
import { LocaleChip } from "./LocaleChip";
import { triggerHaptic } from "@/lib/telegram-client";

interface MiniAppHeaderProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  rightAction?: {
    icon: React.ReactNode;
    onClick: () => void;
    label: string;
  };
}

export function MiniAppHeader({
  title,
  showBack = false,
  backHref,
  rightAction,
}: MiniAppHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    triggerHaptic("light");
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#FAF9F6]/95 backdrop-blur-md px-4 py-2.5 border-b border-[#DCE4DE]/50">
      <div className="max-w-md mx-auto flex items-center justify-between min-h-[44px]">
        {showBack ? (
          <div className="flex items-center gap-2 flex-1 mr-2">
            <button
              type="button"
              onClick={handleBack}
              className="min-w-[44px] min-h-[44px] -ml-2 inline-flex items-center justify-center rounded-full text-[#1A1F1D] active:scale-95 transition-transform"
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            {title && (
              <h1 className="text-xl font-bold text-[#1A1F1D] truncate tracking-tight">
                {title}
              </h1>
            )}
          </div>
        ) : (
          <Link
            href="/mini-app"
            className="flex items-center gap-2.5 active:opacity-80 transition-opacity"
          >
            {/* BuenServ Mark */}
            <div className="w-8 h-8 rounded-[10px] bg-[#0FA37F] flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[19px] font-extrabold tracking-tight text-[#1A1F1D] leading-none">
                BuenServ
              </span>
              <span className="text-[11px] font-medium text-[#66706B] leading-tight">
                Buenos Aires
              </span>
            </div>
          </Link>
        )}

        <div className="flex items-center gap-2">
          {rightAction && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                rightAction.onClick();
              }}
              aria-label={rightAction.label}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full text-[#1A1F1D] hover:bg-white/80 active:scale-95 transition-all border border-[#DCE4DE]"
            >
              {rightAction.icon}
            </button>
          )}
          <LocaleChip />
        </div>
      </div>
    </header>
  );
}
