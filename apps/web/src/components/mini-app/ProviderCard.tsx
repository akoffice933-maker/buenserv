"use client";

import React from "react";
import Link from "next/link";
import { Star, ShieldCheck, MapPin, Tag } from "lucide-react";
import { useMiniApp } from "@/context/MiniAppContext";
import { triggerHaptic } from "@/lib/telegram-client";

export interface ProviderData {
  id: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string | null;
  status: string;
  isVerified?: boolean;
  priceFromArs?: number | null;
  rating?: number | null;
  reviewsCount?: number;
  categories?: { slug: string; title: string; serviceTitle?: string; priceFromArs?: number }[];
  barrios?: string[];
}

interface ProviderCardProps {
  provider: ProviderData;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  const { t } = useMiniApp();

  const isVerified = provider.status === "approved";
  const hasApprovedRating =
    provider.rating !== null &&
    provider.rating !== undefined &&
    provider.reviewsCount !== undefined &&
    provider.reviewsCount > 0;

  const mainCategory = provider.categories?.[0]?.title || "";
  const barriosSummary = provider.barrios?.slice(0, 3).join(", ") || "";
  const remainingBarrios = (provider.barrios?.length || 0) - 3;

  return (
    <Link
      href={`/mini-app/providers/${provider.id}`}
      onClick={() => triggerHaptic("light")}
      className="block bg-white rounded-[16px] p-4 border border-[#DCE4DE]/80 bs-card-shadow active:scale-[0.99] transition-all hover:border-[#0FA37F]/50 group"
    >
      <div className="flex items-start gap-3.5">
        {/* Avatar / Photo */}
        <div className="relative shrink-0">
          {provider.avatarUrl ? (
            <img
              src={provider.avatarUrl}
              alt={provider.displayName}
              className="w-16 h-16 rounded-[14px] object-cover bg-slate-100 border border-slate-200 shadow-2xs"
            />
          ) : (
            <div className="w-16 h-16 rounded-[14px] bg-[#EAF7F1] text-[#0FA37F] font-bold text-xl flex items-center justify-center border border-[#0FA37F]/20">
              {provider.displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-[17px] font-bold text-[#1A1F1D] truncate leading-snug">
              {provider.displayName}
            </h3>

            {isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EAF7F1] text-[#0FA37F] text-[11px] font-bold border border-[#0FA37F]/20">
                <ShieldCheck className="w-3 h-3" />
                {t("status_verified")}
              </span>
            )}
          </div>

          {/* Real Rating only if exists and approved */}
          {hasApprovedRating && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 fill-[#C88716] text-[#C88716]" />
              <span className="text-[13px] font-bold text-[#1A1F1D]">
                {provider.rating?.toFixed(1)}
              </span>
              <span className="text-[12px] text-[#66706B] font-medium">
                ({provider.reviewsCount})
              </span>
            </div>
          )}

          {/* Category & Barrio summary */}
          <div className="mt-2 space-y-1 text-[13px] text-[#66706B]">
            {mainCategory && (
              <div className="flex items-center gap-1.5 line-clamp-1">
                <Tag className="w-3.5 h-3.5 text-[#0FA37F] shrink-0" />
                <span className="font-semibold text-[#1A1F1D]">{mainCategory}</span>
              </div>
            )}

            {barriosSummary && (
              <div className="flex items-center gap-1.5 line-clamp-1">
                <MapPin className="w-3.5 h-3.5 text-[#66706B] shrink-0" />
                <span>
                  {barriosSummary}
                  {remainingBarrios > 0 ? ` +${remainingBarrios}` : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Price (only if real) & CTA */}
      <div className="mt-4 pt-3 border-t border-[#DCE4DE]/60 flex items-center justify-between">
        <div className="flex flex-col">
          {provider.priceFromArs ? (
            <>
              <span className="text-[11px] text-[#66706B] font-medium uppercase tracking-wider">Precio estimado</span>
              <span className="text-[15px] font-extrabold text-[#0FA37F]">{t("price_from", { price: provider.priceFromArs.toLocaleString("es-AR") })}</span>
            </>
          ) : (
            <span className="text-[13px] text-[#66706B] font-medium">Consultar precio</span>
          )}
        </div>

        <span className="inline-flex items-center justify-center px-4 py-2 rounded-[12px] bg-[#FAF9F6] border border-[#DCE4DE] text-[13px] font-bold text-[#1A1F1D] group-hover:bg-[#EAF7F1] group-hover:text-[#0FA37F] group-hover:border-[#0FA37F]/30 transition-colors">
          {t("view_profile")}
        </span>
      </div>
    </Link>
  );
}
