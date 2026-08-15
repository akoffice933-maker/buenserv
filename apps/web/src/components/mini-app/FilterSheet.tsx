"use client";

import React from "react";
import { X, Check, MapPin, Sparkles } from "lucide-react";
import { useMiniApp } from "@/context/MiniAppContext";
import { PrimaryButton, SecondaryButton } from "./Buttons";
import { triggerHaptic } from "@/lib/telegram-client";

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: { slug: string; name: Record<string, string> | string }[];
  barrios: string[];
  selectedCategory: string;
  selectedBarrio: string;
  onSelectCategory: (cat: string) => void;
  onSelectBarrio: (barrio: string) => void;
  onApply: () => void;
  onClear: () => void;
}

export function FilterSheet({
  isOpen,
  onClose,
  categories,
  barrios,
  selectedCategory,
  selectedBarrio,
  onSelectCategory,
  onSelectBarrio,
  onApply,
  onClear,
}: FilterSheetProps) {
  const { t, locale } = useMiniApp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content */}
      <div className="relative z-10 w-full max-w-lg mx-auto bg-white rounded-t-[24px] p-5 pb-8 shadow-2xl safe-bottom border-t border-[#DCE4DE] max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Handle */}
        <div className="w-12 h-1.5 bg-[#DCE4DE] rounded-full mx-auto mb-3 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#DCE4DE]/60 shrink-0">
          <h3 className="text-xl font-bold text-[#1A1F1D]">
            {t("filter_sheet_title")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full text-[#66706B] hover:bg-slate-100 active:scale-95"
            aria-label="Cerrar filtros"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Filters */}
        <div className="overflow-y-auto py-4 space-y-6 flex-1 pr-1">
          {/* Category Filter */}
          <div>
            <label className="text-[14px] font-bold text-[#1A1F1D] mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#0FA37F]" />
              {t("filter_categories")}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onSelectCategory("all");
                }}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                  selectedCategory === "all" || !selectedCategory
                    ? "bg-[#0FA37F] text-white shadow-xs"
                    : "bg-[#FAF9F6] text-[#66706B] border border-[#DCE4DE] hover:bg-slate-100"
                }`}
              >
                {t("filter_all")}
              </button>

              {categories.map((c) => {
                const isSelected = selectedCategory === c.slug;
                const label =
                  typeof c.name === "string"
                    ? c.name
                    : c.name[locale] || c.name["es-AR"] || c.slug;

                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      onSelectCategory(c.slug);
                    }}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                      isSelected
                        ? "bg-[#0FA37F] text-white shadow-xs"
                        : "bg-[#FAF9F6] text-[#1A1F1D] border border-[#DCE4DE] hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Barrio Filter */}
          <div>
            <label className="text-[14px] font-bold text-[#1A1F1D] mb-2.5 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#0FA37F]" />
              {t("filter_barrios")}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onSelectBarrio("all");
                }}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                  selectedBarrio === "all" || !selectedBarrio
                    ? "bg-[#0FA37F] text-white shadow-xs"
                    : "bg-[#FAF9F6] text-[#66706B] border border-[#DCE4DE] hover:bg-slate-100"
                }`}
              >
                {t("filter_all")}
              </button>

              {barrios.map((b) => {
                const isSelected = selectedBarrio === b;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      onSelectBarrio(b);
                    }}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                      isSelected
                        ? "bg-[#0FA37F] text-white shadow-xs"
                        : "bg-[#FAF9F6] text-[#1A1F1D] border border-[#DCE4DE] hover:bg-slate-100"
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#DCE4DE]/60 flex items-center gap-3 shrink-0">
          <SecondaryButton
            type="button"
            fullWidth={false}
            onClick={() => {
              triggerHaptic("light");
              onClear();
            }}
            className="flex-1"
          >
            {t("filter_clear")}
          </SecondaryButton>

          <PrimaryButton
            type="button"
            fullWidth={false}
            onClick={() => {
              triggerHaptic("medium");
              onApply();
            }}
            className="flex-1"
          >
            {t("filter_apply")}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
