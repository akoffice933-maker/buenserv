"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Heart, User } from "lucide-react";
import { useMiniApp } from "@/context/MiniAppContext";
import { triggerHaptic } from "@/lib/telegram-client";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useMiniApp();

  const navItems = [
    {
      label: t("nav_home"),
      href: "/mini-app",
      icon: Home,
      exact: true,
    },
    {
      label: t("nav_search"),
      href: "/mini-app/search",
      icon: Search,
      exact: false,
    },
    {
      label: t("nav_favorites"),
      href: "/mini-app/favorites",
      icon: Heart,
      exact: false,
    },
    {
      label: t("nav_profile"),
      href: "/mini-app/profile",
      icon: User,
      exact: false,
    },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-3 pointer-events-none">
      <nav
        aria-label="Navegación principal"
        className="max-w-md mx-auto bg-white/95 backdrop-blur-md rounded-[24px] border border-[#DCE4DE] px-3 py-2 flex items-center justify-around shadow-[0_13px_32px_rgba(23,53,42,0.12)] pointer-events-auto min-h-[64px]"
      >
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => triggerHaptic("light")}
              className={`min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-2xl px-3 transition-colors active:scale-95 ${
                isActive
                  ? "text-[#0FA37F] font-semibold"
                  : "text-[#66706B] hover:text-[#1A1F1D]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? "bg-[#EAF7F1]" : "bg-transparent"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "stroke-[2.5px]" : "stroke-[1.8px]"
                  }`}
                />
              </div>
              <span className="text-[11px] leading-none tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
