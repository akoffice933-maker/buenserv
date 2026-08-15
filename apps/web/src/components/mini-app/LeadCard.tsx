"use client";

import React from "react";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { useMiniApp } from "@/context/MiniAppContext";
import { getCategoryIcon } from "./CategoryTile";
import { StatusBadge, BadgeStatus } from "./StatusBadge";
import { triggerHaptic } from "@/lib/telegram-client";

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

  return (
    <Link
      href={`/mini-app/leads/${lead.id}`}
      onClick={() => triggerHaptic("light")}
      className="block bg-white rounded-[16px] p-4 border border-[#DCE4DE]/80 bs-card-shadow active:scale-[0.99] transition-all hover:border-[#0FA37F]/50 group"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#EAF7F1] flex items-center justify-center shrink-0">
            {getCategoryIcon(lead.categorySlug, "w-4 h-4 text-[#0FA37F]")}
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#66706B] uppercase tracking-wider block">
              {t("lead_header_title", { id: lead.id })}
            </span>
            <span className="text-[14px] font-extrabold text-[#1A1F1D] capitalize">
              {lead.categorySlug.replace("-", " ")}
            </span>
          </div>
        </div>

        <StatusBadge status={lead.status} size="sm" />
      </div>

      {role === "customer" && lead.providerDisplayName && (
        <p className="text-[13px] text-[#1A1F1D] font-semibold mb-2">
          {lead.providerDisplayName}
        </p>
      )}

      {lead.initialDescription && (
        <p className="text-[13px] text-[#66706B] line-clamp-2 mb-3 italic">
          "{lead.initialDescription}"
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[#DCE4DE]/50 text-[12px] text-[#66706B]">
        <div className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-[#0FA37F]" />
          <span className="font-semibold text-[#1A1F1D]">{lead.barrioName}</span>
          <span>•</span>
          <span>{formattedDate}</span>
        </div>

        <span className="inline-flex items-center gap-1 font-bold text-[#0FA37F] group-hover:translate-x-0.5 transition-transform">
          {t("open_request")}
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}
