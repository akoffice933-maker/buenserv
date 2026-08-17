"use client";

import React from "react";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { useMiniApp } from "@/context/MiniAppContext";
import { getCategoryIcon } from "./CategoryTile";
import { StatusBadge, BadgeStatus } from "./StatusBadge";
import { triggerHaptic } from "@/lib/telegram-client";
import { CATEGORY_LABELS, CategorySlug } from "@/lib/categories";

export interface LeadCardData {
  id: number;
  categorySlug: string;
  barrioName: string;
  status: BadgeStatus | string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  providerDisplayName?: string;
  providerAvatar?: string | null;
  initialDescription?: string | null;
}

export function LeadCard({
  lead,
  role = "customer",
}: {
  lead: LeadCardData;
  role?: "customer" | "provider";
}) {
  const { t, locale } = useMiniApp();

  const formattedDate = new Date(lead.createdAt).toLocaleDateString(
    locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "es-AR",
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  // Localized category label (canonical map), fallback to slug.
  const catMeta = CATEGORY_LABELS[lead.categorySlug as CategorySlug];
  const categoryLabel = catMeta
    ? (locale === "ru" ? catMeta.ru : locale === "en" ? catMeta.en : catMeta.es)
    : lead.categorySlug.replace("-", " ");

  // Short id: last 6 chars of the UUID.
  const shortId = `#${String(lead.id).slice(-6).toUpperCase()}`;

  // CTA by state.
  const ctaLabel =
    lead.status === "provider_replied" ? t("ld_cta_chat") :
    (role === "provider" && (lead.status === "contacted" || lead.status === "notified")) ? t("ld_cta_reply") :
    (lead.status === "success" || lead.status === "cancelled") ? t("ld_cta_view") :
    t("ld_cta_chat");

  // Peer name: customer sees provider, provider sees "New request".
  const peerName = role === "provider"
    ? t("ld_new_request")
    : (lead.providerDisplayName ?? "");

  return (
    <Link
      href={`/mini-app/leads/${lead.id}`}
      onClick={() => triggerHaptic("light")}
      className="block bg-white rounded-[16px] p-4 border border-[#DCE4DE]/80 bs-card-shadow active:scale-[0.99] transition-all hover:border-[#0FA37F]/50 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-[12px] bg-[#EAF7F1] flex items-center justify-center shrink-0">
            {getCategoryIcon(lead.categorySlug, "w-5 h-5 text-[#0FA37F]")}
          </div>
          <div className="min-w-0">
            <span className="text-[16px] font-extrabold text-[#1A1F1D] tracking-tight block truncate">
              {categoryLabel}
            </span>
            <span className="text-[12px] text-[#66706B] block truncate">
              {lead.barrioName} · {formattedDate}
            </span>
            <span className="text-[11px] text-[#9aa39e] font-semibold block">{shortId}</span>
          </div>
        </div>

        <StatusBadge status={lead.status} size="sm" />
      </div>

      {peerName && (
        <p className="text-[13px] text-[#1A1F1D] font-semibold mt-2 mb-1">{peerName}</p>
      )}

      {lead.initialDescription && (
        <p className="text-[13px] text-[#66706B] line-clamp-2 mb-2 italic">
          &ldquo;{lead.initialDescription}&rdquo;
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[#DCE4DE]/50 text-[12px] text-[#66706B]">
        <span className="font-semibold text-[#1A1F1D]">{peerName || lead.barrioName}</span>
        <span className="inline-flex items-center gap-1 font-bold text-[#0FA37F] group-hover:translate-x-0.5 transition-transform">
          {ctaLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}
