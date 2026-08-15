"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Locale, translations, getTranslation } from "@/lib/i18n";
import { apiFetch, triggerHaptic } from "@/lib/telegram-client";

interface MiniAppContextType {
  locale: Locale;
  setLocale: (newLocale: Locale) => Promise<boolean>;
  hydrateLocale: (newLocale: Locale) => void;
  t: (key: keyof typeof translations["es-AR"], params?: Record<string, string | number>) => string;
  isLocaleSheetOpen: boolean;
  setIsLocaleSheetOpen: (open: boolean) => void;
}

const MiniAppContext = createContext<MiniAppContextType | undefined>(undefined);

export function MiniAppProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es-AR");
  const [isLocaleSheetOpen, setIsLocaleSheetOpen] = useState(false);

  // Initialize Telegram WebApp (expand only; no fake identity).
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      } catch (err) {
        // ignore
      }
    }
  }, []);

  const setLocale = useCallback(async (newLocale: Locale): Promise<boolean> => {
    triggerHaptic("light");
    // Persist to server first; only update local state on success so the canonical
    // profiles.locale stays the source of truth.
    try {
      const res = await apiFetch<{ok: boolean; locale: Locale}>("/api/mini-app/profile/locale", {
        method: "POST",
        body: JSON.stringify({ locale: newLocale }),
      });
      if (res.error || !res.data?.ok) {
        return false;
      }
      setLocaleState(newLocale);
      setIsLocaleSheetOpen(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  const hydrateLocale = useCallback((newLocale: Locale) => {
    if (["es-AR", "ru", "en"].includes(newLocale)) {
      setLocaleState(newLocale);
    }
  }, []);

  const t = useCallback(
    (key: keyof typeof translations["es-AR"], params?: Record<string, string | number>) => {
      return getTranslation(locale, key, params);
    },
    [locale]
  );

  return (
    <MiniAppContext.Provider
      value={{ locale, setLocale, hydrateLocale, t, isLocaleSheetOpen, setIsLocaleSheetOpen }}
    >
      {children}
    </MiniAppContext.Provider>
  );
}

export function useMiniApp() {
  const context = useContext(MiniAppContext);
  if (!context) {
    throw new Error("useMiniApp must be used within a MiniAppProvider");
  }
  return context;
}
