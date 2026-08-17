"use client";

import React from "react";
import { CheckCircle2, Clock, AlertCircle, XCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useMiniApp } from "@/context/MiniAppContext";

export type BadgeStatus =
  | "approved"
  | "verified"
  | "pending_moderation"
  | "draft"
  | "needs_changes"
  | "suspended"
  | "created"
  | "notified"
  | "opened"
  | "in_progress"
  | "completed"
  | "confirmed"
  | "cancelled";

interface StatusBadgeProps {
  status: BadgeStatus | string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const { t } = useMiniApp();

  let label = status;
  let bg = "bg-slate-100";
  let text = "text-slate-700";
  let border = "border-slate-200";
  let Icon = Clock;

  switch (status) {
    case "approved":
      label = t("status_approved");
      bg = "bg-[#EAF7F1]";
      text = "text-[#0FA37F]";
      border = "border-[#0FA37F]/30";
      Icon = CheckCircle2;
      break;

    case "verified":
      label = t("status_verified");
      bg = "bg-[#EAF7F1]";
      text = "text-[#0FA37F]";
      border = "border-[#0FA37F]/30";
      Icon = ShieldCheck;
      break;

    case "pending_moderation":
      label = t("status_pending_moderation");
      bg = "bg-amber-50";
      text = "text-amber-700";
      border = "border-amber-200";
      Icon = Clock;
      break;

    case "draft":
      label = t("status_draft");
      bg = "bg-slate-100";
      text = "text-slate-600";
      border = "border-slate-200";
      Icon = Clock;
      break;

    case "needs_changes":
      label = t("status_needs_changes");
      bg = "bg-orange-50";
      text = "text-orange-700";
      border = "border-orange-200";
      Icon = AlertCircle;
      break;

    case "suspended":
      label = t("status_suspended");
      bg = "bg-red-50";
      text = "text-red-700";
      border = "border-red-200";
      Icon = XCircle;
      break;

    case "created":
      label = t("status_created");
      bg = "bg-slate-100";
      text = "text-slate-700";
      border = "border-slate-200";
      Icon = Clock;
      break;

    case "notified":
      label = t("status_notified");
      bg = "bg-sky-50";
      text = "text-sky-700";
      border = "border-sky-200";
      Icon = Sparkles;
      break;

    case "opened":
      label = t("status_opened");
      bg = "bg-teal-50";
      text = "text-teal-700";
      border = "border-teal-200";
      Icon = Sparkles;
      break;

    case "in_progress":
      label = t("status_in_progress");
      bg = "bg-[#EAF7F1]";
      text = "text-[#0FA37F]";
      border = "border-[#0FA37F]/30";
      Icon = Clock;
      break;

    case "completed":
      label = t("status_completed");
      bg = "bg-emerald-50";
      text = "text-emerald-700";
      border = "border-emerald-200";
      Icon = CheckCircle2;
      break;

    case "confirmed":
      label = t("status_confirmed");
      bg = "bg-emerald-100";
      text = "text-emerald-800";
      border = "border-emerald-300";
      Icon = CheckCircle2;
      break;

    case "cancelled":
      label = t("status_cancelled");
      bg = "bg-red-50";
      text = "text-red-600";
      border = "border-red-200";
      Icon = XCircle;
      break;

    // Lead lifecycle statuses (from leads.status)
    case "contacted":
      label = t("ld_status_waiting");
      bg = "bg-[#F8F1E4]";
      text = "text-[#8A6A2F]";
      border = "border-amber-200";
      Icon = Clock;
      break;

    case "provider_replied":
      label = t("ld_status_replied");
      bg = "bg-[#EAF7F1]";
      text = "text-[#08735A]";
      border = "border-[#0FA37F]/30";
      Icon = Sparkles;
      break;

    case "success":
      label = t("ld_status_success");
      bg = "bg-[#E8F8EE]";
      text = "text-[#1a7a4c]";
      border = "border-emerald-200";
      Icon = CheckCircle2;
      break;

    case "no_response":
      label = t("ld_status_no_response");
      bg = "bg-[#F8F1E4]";
      text = "text-[#8A6A2F]";
      border = "border-amber-200";
      Icon = Clock;
      break;
  }

  const isSmall = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${bg} ${text} ${border} ${
        isSmall ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-[12px]"
      }`}
    >
      <Icon className={isSmall ? "w-3 h-3" : "w-3.5 h-3.5"} />
      <span>{label}</span>
    </span>
  );
}
