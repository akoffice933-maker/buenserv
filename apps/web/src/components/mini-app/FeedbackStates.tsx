"use client";

import React from "react";
import { AlertCircle, RotateCcw, MapPin, Sparkles, Send, ShieldAlert, Loader2 } from "lucide-react";
import { useMiniApp } from "@/context/MiniAppContext";
import { PrimaryButton, SecondaryButton } from "./Buttons";
import { closeTelegramWebApp } from "@/lib/telegram-client";

export function LoadingState({ message }: { message?: string }) {
  const { t } = useMiniApp();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-[#EAF7F1] flex items-center justify-center mb-4">
        <Loader2 className="w-7 h-7 text-[#0FA37F] animate-spin" />
      </div>
      <p className="text-[15px] font-semibold text-[#66706B]">
        {message || t("loading")}
      </p>
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const { t } = useMiniApp();

  return (
    <div className="p-6 bg-white rounded-[20px] border border-red-100 text-center bs-card-shadow my-4">
      <div className="w-14 h-14 rounded-full bg-red-50 text-[#B84040] flex items-center justify-center mx-auto mb-3">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-[#1A1F1D] mb-1">
        {title || t("network_error_title")}
      </h3>
      {message && (
        <p className="text-[14px] text-[#66706B] mb-5">{message}</p>
      )}
      {onRetry && (
        <PrimaryButton
          type="button"
          onClick={onRetry}
          variant="secondary"
          className="max-w-[200px] mx-auto"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          {t("network_error_retry")}
        </PrimaryButton>
      )}
    </div>
  );
}

export function SessionExpiredState() {
  const { t } = useMiniApp();

  return (
    <div className="p-6 bg-white rounded-[24px] border border-amber-200/80 text-center bs-card-shadow max-w-sm mx-auto my-8">
      <div className="w-16 h-16 rounded-full bg-amber-50 text-[#C88716] flex items-center justify-center mx-auto mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-[#1A1F1D] mb-2">
        {t("session_expired_title")}
      </h3>
      <p className="text-[14px] text-[#66706B] mb-6 leading-relaxed">
        {t("session_expired_desc")}
      </p>
      <PrimaryButton
        type="button"
        onClick={() => closeTelegramWebApp()}
      >
        {t("btn_close_to_bot")}
      </PrimaryButton>
    </div>
  );
}

export function EmptySearchState({
  onChangeBarrio,
}: {
  onChangeBarrio: () => void;
}) {
  const { t } = useMiniApp();

  const handleOpenBot = () => {
    if (typeof window !== "undefined") {
      window.open("https://t.me/BuenServBot", "_blank");
    }
  };

  return (
    <div className="p-6 bg-white rounded-[24px] border border-[#DCE4DE]/80 text-center bs-card-shadow my-4 space-y-4">
      <div className="w-16 h-16 rounded-full bg-[#FAF9F6] text-[#0FA37F] border border-[#DCE4DE] flex items-center justify-center mx-auto">
        <MapPin className="w-8 h-8" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-[#1A1F1D] mb-1.5">
          {t("no_providers_found_title")}
        </h3>
        <p className="text-[14px] text-[#66706B] leading-relaxed max-w-xs mx-auto">
          {t("no_providers_found_desc")}
        </p>
      </div>

      <div className="space-y-2 pt-2">
        <PrimaryButton type="button" onClick={onChangeBarrio}>
          {t("btn_change_barrio")}
        </PrimaryButton>

        <SecondaryButton type="button" onClick={handleOpenBot}>
          <Send className="w-4 h-4 text-[#0FA37F] mr-1" />
          {t("btn_contact_bot")}
        </SecondaryButton>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  actionText,
  onAction,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <div className="p-8 bg-white rounded-[24px] border border-[#DCE4DE]/70 text-center bs-card-shadow my-4">
      <div className="w-16 h-16 rounded-full bg-[#EAF7F1] text-[#0FA37F] flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-[#1A1F1D] mb-1.5">{title}</h3>
      {description && (
        <p className="text-[14px] text-[#66706B] mb-5 leading-relaxed max-w-xs mx-auto">
          {description}
        </p>
      )}
      {actionText && onAction && (
        <PrimaryButton
          type="button"
          onClick={onAction}
          className="max-w-[220px] mx-auto"
        >
          {actionText}
        </PrimaryButton>
      )}
    </div>
  );
}
