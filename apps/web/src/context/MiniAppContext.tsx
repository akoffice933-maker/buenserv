"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Locale, translations, getTranslation, LOCALES } from "@/lib/i18n";
import { apiFetch, triggerHaptic } from "@/lib/telegram-client";

interface MiniAppContextType {
  locale: Locale;
  setLocale: (newLocale: Locale) => Promise<void>;
  t: (key: keyof typeof translations["es-AR"], params?: Record<string, string | number>) => string;
  isLocaleSheetOpen: boolean;
  setIsLocaleSheetOpen: (open: boolean) => void;
  mockActor: "customer" | "provider";
  setMockActor: (actor: "customer" | "provider") => void;
  isSimulatorOpen: boolean;
  setIsSimulatorOpen: (open: boolean) => void;
}

const MiniAppContext = createContext<MiniAppContextType | undefined>(undefined);

export function MiniAppProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es-AR");
  const [isLocaleSheetOpen, setIsLocaleSheetOpen] = useState(false);
  const [mockActor, setMockActorState] = useState<"customer" | "provider">("customer");
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Initialize Telegram WebApp
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      } catch (err) {
        console.error("Telegram WebApp init error:", err);
      }
    }

    // Check saved locale in cookie/localStorage or detect browser
    const savedLocale = localStorage.getItem("buenserv_locale") as Locale;
    if (savedLocale && ["es-AR", "ru", "en"].includes(savedLocale)) {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = useCallback(
    async (newLocale: Locale) => {
      triggerHaptic("light");
      setLocaleState(newLocale);
      localStorage.setItem("buenserv_locale", newLocale);
      setIsLocaleSheetOpen(false);

      // Persist to server
      try {
        await apiFetch("/api/mini-app/profile/locale", {
          method: "POST",
          body: JSON.stringify({ locale: newLocale }),
        });
      } catch (err) {
        // Silently keep local state if offline
      }
    },
    []
  );

  const setMockActor = useCallback((actor: "customer" | "provider") => {
    triggerHaptic("medium");
    setMockActorState(actor);
    localStorage.setItem("buenserv_mock_actor", actor);
    // Reload data if needed
  }, []);

  const t = useCallback(
    (key: keyof typeof translations["es-AR"], params?: Record<string, string | number>) => {
      return getTranslation(locale, key, params);
    },
    [locale]
  );

  return (
    <MiniAppContext.Provider
      value={{
        locale,
        setLocale,
        t,
        isLocaleSheetOpen,
        setIsLocaleSheetOpen,
        mockActor,
        setMockActor,
        isSimulatorOpen,
        setIsSimulatorOpen,
      }}
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
