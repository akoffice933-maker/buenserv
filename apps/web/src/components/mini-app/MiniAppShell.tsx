"use client";

import React, { ReactNode } from "react";
import { MiniAppHeader } from "./MiniAppHeader";
import { BottomNav } from "./BottomNav";
import { LocaleSheet } from "./LocaleChip";
import { useMiniApp } from "@/context/MiniAppContext";
import { Smartphone, UserCheck, Sparkles, RefreshCw } from "lucide-react";

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
  const { mockActor, setMockActor, isSimulatorOpen, setIsSimulatorOpen } = useMiniApp();

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1F1D] flex flex-col font-sans selection:bg-[#0FA37F]/20 selection:text-[#0FA37F]">
      {/* Optional Preview Simulator Helper bar (visible on desktop or collapsible) */}
      <div className="bg-[#1A1F1D] text-white text-[12px] py-1.5 px-3 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#0FA37F] animate-pulse" />
          <span className="font-bold tracking-tight">BuenServ Mini App</span>
          <span className="text-slate-400 hidden sm:inline">| Telegram WebApp v7.0</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800 rounded-full px-2 py-0.5 text-[11px]">
            <span className="text-slate-400">Actor:</span>
            <button
              type="button"
              onClick={() => setMockActor(mockActor === "customer" ? "provider" : "customer")}
              className="font-bold text-[#0FA37F] hover:underline flex items-center gap-1"
            >
              <UserCheck className="w-3 h-3" />
              {mockActor === "customer" ? "Cliente (Santiago)" : "Prestador (Matías)"}
            </button>
          </div>
        </div>
      </div>

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
