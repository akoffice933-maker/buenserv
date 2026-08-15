"use client";

import React, { ReactNode } from "react";
import { MiniAppHeader } from "./MiniAppHeader";
import { BottomNav } from "./BottomNav";
import { LocaleSheet } from "./LocaleChip";

interface MiniAppShellProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  backHref?: string;
  showBottomNav?: boolean;
  rightAction?: {
    icon: React.ReactNode;
    onClick: () => void;
    label: string;
  };
}

export function MiniAppShell({
  children,
  title,
  showBack = false,
  backHref,
  showBottomNav = true,
  rightAction,
}: MiniAppShellProps) {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1F1D] flex flex-col font-sans selection:bg-[#0FA37F]/20 selection:text-[#0FA37F]">
      {/* Main Container constrained to standard mobile width (390–480px max) */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col relative bg-[#FAF9F6] shadow-sm min-h-[calc(100vh-32px)]">
        {/* Screen Header */}
        <MiniAppHeader
          title={title}
          showBack={showBack}
          backHref={backHref}
          rightAction={rightAction}
        />

        {/* Content View with reserved bottom padding for floating bottom nav */}
        <main
          className={`flex-1 px-4 pt-3 ${
            showBottomNav ? "pb-28" : "pb-12"
          } safe-bottom flex flex-col`}
        >
          {children}
        </main>

        {/* Bottom Floating Navigation */}
        {showBottomNav && <BottomNav />}

        {/* Locale Selection Sheet */}
        <LocaleSheet />
      </div>
    </div>
  );
}
