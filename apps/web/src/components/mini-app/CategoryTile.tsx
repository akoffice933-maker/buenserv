"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Wrench,
  Dog,
  Truck,
  GraduationCap,
  Package,
  Car,
  HelpCircle,
} from "lucide-react";
import { useMiniApp } from "@/context/MiniAppContext";
import { triggerHaptic } from "@/lib/telegram-client";

export function getCategoryIcon(slug: string, className = "w-6 h-6 text-[#0FA37F]") {
  switch (slug) {
    case "limpieza":
      return <Sparkles className={className} />;
    case "reparaciones":
      return <Wrench className={className} />;
    case "mascotas":
      return <Dog className={className} />;
    case "mudanzas":
      return <Truck className={className} />;
    case "clases":
      return <GraduationCap className={className} />;
    case "mensajeria":
      return <Package className={className} />;
    case "taxi-traslados":
      return <Car className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

interface CategoryTileProps {
  slug: string;
  name: Record<string, string> | string;
  providerCount?: number;
  isSelected?: boolean;
  onClick?: () => void;
  asLink?: boolean;
}

export function CategoryTile({
  slug,
  name,
  providerCount,
  isSelected = false,
  onClick,
  asLink = true,
}: CategoryTileProps) {
  const { locale } = useMiniApp();

  const label = typeof name === "string" ? name : name[locale] || name["es-AR"] || slug;

  const content = (
    <div
      className={`min-h-[108px] p-4 bg-white rounded-[16px] border transition-all flex flex-col justify-between items-start text-left bs-card-shadow active:scale-[0.98] ${
        isSelected
          ? "border-[#0FA37F] ring-2 ring-[#0FA37F]/20 bg-[#FAFDFB]"
          : "border-[#DCE4DE]/70 hover:border-[#0FA37F]/50"
      }`}
    >
      <div className="w-12 h-12 rounded-full bg-[#EAF7F1] flex items-center justify-center mb-2 shadow-2xs">
        {getCategoryIcon(slug, "w-6 h-6 text-[#0FA37F]")}
      </div>

      <div>
        <h4 className="text-[15px] font-bold text-[#1A1F1D] leading-tight line-clamp-1">
          {label}
        </h4>
        {providerCount !== undefined && (
          <span className="text-[12px] text-[#66706B] font-medium mt-0.5 block">
            {providerCount} {providerCount === 1 ? "prestador" : "prestadores"}
          </span>
        )}
      </div>
    </div>
  );

  if (asLink) {
    return (
      <Link
        href={`/mini-app/search?category=${slug}`}
        onClick={() => triggerHaptic("light")}
        className="block group"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        triggerHaptic("light");
        onClick?.();
      }}
      className="w-full text-left"
    >
      {content}
    </button>
  );
}
