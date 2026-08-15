"use client";

import React, { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { triggerHaptic } from "@/lib/telegram-client";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "soft";
  fullWidth?: boolean;
}

export function PrimaryButton({
  loading = false,
  children,
  variant = "primary",
  fullWidth = true,
  className = "",
  disabled,
  onClick,
  ...props
}: PrimaryButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;
    triggerHaptic("medium");
    onClick?.(e);
  };

  let variantStyle = "bg-[#0FA37F] text-white hover:bg-[#08735A] active:bg-[#08735A]";
  if (variant === "secondary") {
    variantStyle = "bg-[#FAF9F6] text-[#1A1F1D] border border-[#DCE4DE] hover:bg-slate-100 active:bg-slate-200";
  } else if (variant === "soft") {
    variantStyle = "bg-[#EAF7F1] text-[#0FA37F] hover:bg-[#d8f2e6] active:bg-[#cbf0de]";
  } else if (variant === "danger") {
    variantStyle = "bg-[#B84040] text-white hover:bg-red-700 active:bg-red-800";
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      onClick={handleClick}
      className={`min-h-[50px] px-5 py-3 rounded-[14px] text-[16px] font-bold tracking-tight inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 ${
        fullWidth ? "w-full" : "w-auto"
      } ${variantStyle} ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function SecondaryButton(props: PrimaryButtonProps) {
  return <PrimaryButton {...props} variant="secondary" />;
}

export function IconButton({
  children,
  onClick,
  ariaLabel,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        triggerHaptic("light");
        onClick?.();
      }}
      aria-label={ariaLabel}
      className={`min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full text-[#1A1F1D] hover:bg-white/80 active:scale-95 transition-all ${className}`}
    >
      {children}
    </button>
  );
}
