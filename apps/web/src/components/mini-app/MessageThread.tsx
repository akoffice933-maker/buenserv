"use client";

import React, { useState } from "react";
import { Send, Loader2, Lock } from "lucide-react";
import { useMiniApp } from "@/context/MiniAppContext";
import { triggerHaptic } from "@/lib/telegram-client";

export interface MessageData {
  id: number;
  senderRole: "customer" | "provider" | "system";
  isOwn: boolean;
  text: string;
  createdAt: string | Date;
}

export function MessageBubble({ message }: { message: MessageData }) {
  const { locale } = useMiniApp();

  const formattedTime = new Date(message.createdAt).toLocaleTimeString(
    locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "es-AR",
    { hour: "2-digit", minute: "2-digit" }
  );

  return (
    <div
      className={`flex flex-col max-w-[82%] mb-3 ${
        message.isOwn ? "ml-auto items-end" : "mr-auto items-start"
      }`}
    >
      <div
        className={`px-4 py-3 rounded-[18px] text-[15px] leading-relaxed shadow-xs ${
          message.isOwn
            ? "bg-[#0FA37F] text-white rounded-br-[4px]"
            : "bg-white text-[#1A1F1D] border border-[#DCE4DE] rounded-bl-[4px]"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
      </div>
      <span className="text-[11px] text-[#66706B] font-medium mt-1 px-1">
        {formattedTime}
      </span>
    </div>
  );
}

interface MessageComposerProps {
  onSend: (text: string) => Promise<boolean>;
  disabled?: boolean;
}

export function MessageComposer({ onSend, disabled = false }: MessageComposerProps) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { t } = useMiniApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending || disabled) return;

    triggerHaptic("medium");
    setIsSending(true);
    const success = await onSend(text.trim());
    setIsSending(false);
    if (success) {
      setText("");
    }
  };

  if (disabled) {
    return (
      <div className="p-4 bg-slate-100 rounded-[18px] border border-slate-200 text-center flex items-center justify-center gap-2 text-[13px] text-[#66706B]">
        <Lock className="w-4 h-4 text-slate-500 shrink-0" />
        <span>{t("lead_terminal_state_notice")}</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="relative flex items-end gap-2 bg-white rounded-[20px] p-2 border border-[#DCE4DE] shadow-xs focus-within:border-[#0FA37F] focus-within:ring-2 focus-within:ring-[#0FA37F]/20 transition-all">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 2000))}
          placeholder={t("lead_composer_placeholder")}
          disabled={disabled || isSending}
          className="flex-1 resize-none bg-transparent border-0 px-2 py-1 text-[15px] text-[#1A1F1D] placeholder-[#66706B] focus:outline-hidden"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />

        <button
          type="submit"
          disabled={!text.trim() || isSending}
          aria-label={t("lead_send_btn")}
          className="w-11 h-11 shrink-0 rounded-[14px] bg-[#0FA37F] text-white flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none hover:bg-[#08735A]"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5 ml-0.5" />
          )}
        </button>
      </div>

      <div className="flex justify-between items-center px-2 text-[11px] text-[#66706B]">
        <span>{t("contact_desc_hint")}</span>
        <span>{text.length} / 2000</span>
      </div>
    </form>
  );
}
