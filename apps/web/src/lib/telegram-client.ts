"use client";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          auth_date?: number;
          hash?: string;
        };
        themeParams?: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        colorScheme?: "light" | "dark";
        isExpanded?: boolean;
        viewportHeight?: number;
        viewportStableHeight?: number;
        headerColor?: string;
        backgroundColor?: string;
        ready: () => void;
        expand: () => void;
        close: () => void;
        HapticFeedback?: {
          impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
          notificationOccurred: (type: "error" | "success" | "warning") => void;
          selectionChanged: () => void;
        };
        openTelegramLink?: (url: string) => void;
        openLink?: (url: string) => void;
      };
    };
  }
}

/**
 * Returns raw Telegram initData if running in Telegram WebApp,
 * or checks URL launch parameters (tgWebAppData / tgWebAppPlatform),
 * without logging, rendering, storing in localStorage, or leaking to analytics.
 */
export function getTelegramInitData(): string {
  if (typeof window === "undefined") {
    return "";
  }

  // 1. Check window.Telegram.WebApp.initData
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }

  // 2. Check URL search parameters or hash for real Telegram launch parameters (tgWebAppData)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const tgWebAppData = urlParams.get("tgWebAppData") || hashParams.get("tgWebAppData");
    if (tgWebAppData) {
      return tgWebAppData;
    }
  } catch {
    // Ignore URL parse errors
  }

  return "";
}

/**
 * Trigger soft haptic feedback on Telegram client if supported
 */
export function triggerHaptic(type: "light" | "medium" | "success" | "warning" | "error" = "light") {
  if (typeof window !== "undefined" && window.Telegram?.WebApp?.HapticFeedback) {
    try {
      if (type === "success" || type === "warning" || type === "error") {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
      } else {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
      }
    } catch {
      // Haptics not available
    }
  }
}

/**
 * Safely close the Telegram Mini App
 */
export function closeTelegramWebApp() {
  if (typeof window !== "undefined" && window.Telegram?.WebApp?.close) {
    window.Telegram.WebApp.close();
  }
}

/**
 * Helper to fetch Mini App API endpoints with verified x-telegram-init-data header
 */
export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const initData = getTelegramInitData();

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (initData) {
    headers.set("x-telegram-init-data", initData);
  }

  // If body is JSON and not already set
  if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const status = res.status;
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        data: null,
        error: errJson.error || errJson.message || `Request failed with status ${status}`,
        status,
      };
    }

    const data = await res.json().catch(() => null);
    return { data, error: null, status };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Network error",
      status: 0,
    };
  }
}
