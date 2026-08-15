"use client";

import React from "react";
import { useMiniApp } from "@/context/MiniAppContext";
import { LOCALES, Locale } from "@/lib/i18n";
import { Globe, Check, X } from "lucide-react";
import { triggerHaptic } from "@/lib/telegram-client";

export function LocaleChip() {
  const { locale, setIsLocaleSheetOpen } = useMiniApp();

  const currentFlag = LOCALES.find((l) => l.code === locale)?.flag || "🇦🇷";
  const currentCodeShort = locale === "es-AR" ? "ES" : locale.toUpperCase();

  return (
    <button
      type="button"
      onClick={() => {
        triggerHaptic("light");
        setIsLocaleSheetOpen(true);
      }}
      aria-label="Cambiar idioma / Change language"
      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#DCE4DE] text-[13px] font-semibold text-[#1A1F1D] shadow-xs active:scale-95 transition-transform"
    >
      <span className="text-sm">{currentFlag}</span>
      <span>{currentCodeShort}</span>
    </button>
  );
}

export function LocaleSheet() {
  const { isLocaleSheetOpen, setIsLocaleSheetOpen, locale, setLocale } = useMiniApp();

  if (!isLocaleSheetOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsLocaleSheetOpen(false)}
        aria-hidden="true"
      />

      {/* Sheet Content */}
      <div className="relative z-10 w-full max-w-lg mx-auto bg-white rounded-t-[24px] p-5 pb-8 shadow-2xl safe-bottom border-t border-[#DCE4DE] animate-in slide-in-from-bottom duration-200">
        {/* Handle */}
        <div className="w-12 h-1.5 bg-[#DCE4DE] rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#1A1F1D] flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#0FA37F]" />
            Seleccionar idioma
          </h3>
          <button
            type="button"
            onClick={() => setIsLocaleSheetOpen(false)}
            className="w-11 h-11 flex items-center justify-center rounded-full text-[#66706B] hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {LOCALES.map((item) => {
            const isSelected = locale === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setLocale(item.code)}
                className={`w-full min-h-[52px] flex items-center justify-between px-4 py-3 rounded-[14px] text-left text-base font-medium transition-all ${
                  isSelected
                    ? "bg-[#EAF7F1] text-[#0FA37F] font-bold border border-[#0FA37F]/30"
                    : "bg-[#FAF9F6] text-[#1A1F1D] hover:bg-slate-100 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.flag}</span>
                  <span>{item.label}</span>
                </div>
                {isSelected && <Check className="w-5 h-5 text-[#0FA37F]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
