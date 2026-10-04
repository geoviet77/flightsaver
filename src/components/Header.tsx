"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { User, LogOut, LayoutDashboard, Ticket, History, LayoutGrid, ChevronDown, Gem } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Currency, Language } from "@/lib/types";
import { TRANSLATIONS } from "@/lib/i18n";
import { InfoModalType } from "./InfoModal";
import SettingsModal from "./SettingsModal";
import AuthModal from "./AuthModal";

export interface HeaderProps {
  currentCurrency?: Currency;
  onCurrencyChange?: (c: Currency) => void;
  currentLanguage?: Language;
  onLanguageChange?: (l: Language) => void;
  isHighContrast?: boolean;
  onToggleHighContrast?: () => void;
  onOpenInfoModal?: (type: InfoModalType) => void;
}

export function Header({
  currentCurrency = "RUB",
  onCurrencyChange,
  currentLanguage = "ru",
  onLanguageChange,
  isHighContrast = false,
  onToggleHighContrast,
  onOpenInfoModal,
}: HeaderProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileDropdown, setIsProfileDropdown] = useState(false);

  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.ru;
  const supabase = createClient();

  useEffect(() => {
    const supabase = createClient();

    // 1. Если в URL есть ?code= от Google OAuth — мгновенно обмениваем его на сессию
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
          if (!error && data?.user) {
            setUser(data.user);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        });
      }
    }

    // 2. Получаем текущую сессию
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUser(user);
        setLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("flightsaver_user");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed?.id) {
              setUser({
                id: parsed.id,
                email: parsed.email,
                user_metadata: {
                  full_name: parsed.fullName,
                  avatar_url: parsed.avatarUrl,
                },
              });
              setLoading(false);
              return;
            }
          } catch {}
        }

        // Проверяем pending сессию Telegram (при возврате из бота в TWA)
        const pendingSessionId = localStorage.getItem("flightsaver_pending_auth_session");
        if (pendingSessionId) {
          try {
            const res = await fetch(`/api/auth/telegram/session?id=${pendingSessionId}`);
            const data = await res.json();
            if (data.success && data.status === "confirmed" && data.user) {
              const profile = {
                id: data.user.id,
                email: data.user.email,
                fullName: data.user.fullName || data.user.username || "Telegram User",
                avatarUrl: data.user.avatarUrl || "",
                preferredCurrency: "RUB",
                isAccessibilityMode: false,
              };
              localStorage.setItem("flightsaver_user", JSON.stringify(profile));
              localStorage.removeItem("flightsaver_pending_auth_session");
              setUser({
                id: profile.id,
                email: profile.email,
                user_metadata: {
                  full_name: profile.fullName,
                  avatar_url: profile.avatarUrl,
                },
              });
            }
          } catch {}
        }
      }
      setLoading(false);
    });

    // 3. Подписка на изменения
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("flightsaver_user");
        localStorage.removeItem("flightsaver_pending_auth_session");
        localStorage.removeItem("flightsaver_auth_token");
      }
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    setIsProfileDropdown(false);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    user?.email ||
    "Пользователь";
  const displayEmail = user?.email || "";
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <>
      <header className="relative z-40 w-full pt-4 pb-2 px-2 sm:px-6 flex items-center justify-between">
        {/* Left: Isolated Brand Logo Capsule */}
        <Link
          href="/"
          className="liquid-glass-pill rounded-full px-3.5 sm:px-5 py-2 flex items-center gap-2.5 shadow-card-glass border border-white/90 no-underline transition-all hover:scale-[1.01] shrink-0"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Gem className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-sm sm:text-lg tracking-tight text-slate-900 font-heading">
            FLIGHT<span className="text-sky-600">SAVER</span>
          </span>
        </Link>

        {/* Right: User Profile Capsule + Grid Settings Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!loading && (
            <>
              {user ? (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    id="btn-user-avatar"
                    onClick={() => setIsProfileDropdown(!isProfileDropdown)}
                    className="liquid-glass-pill shadow-card-glass px-3 sm:px-4 py-1.5 rounded-full flex items-center gap-2 hover:bg-white/80 transition-all text-xs sm:text-sm font-semibold text-slate-800 border border-white/90 cursor-pointer"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-6 h-6 rounded-full object-cover shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="max-w-[110px] truncate text-slate-800 font-bold">
                      {displayName.split(" ")[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>

                  {/* Выпадающее меню профиля */}
                  {isProfileDropdown && (
                    <div
                      role="menu"
                      className="absolute right-0 top-[calc(100%+8px)] w-60 rounded-3xl border border-white/90 shadow-glass-elevated p-3 space-y-1 animate-fadeIn bg-white/95 backdrop-blur-2xl text-slate-900 text-left z-50"
                    >
                      <div className="px-3 py-2 border-b border-slate-100 mb-1">
                        <div className="font-bold text-xs text-slate-900 truncate">{displayName}</div>
                        <div className="text-[11px] text-slate-400 truncate">{displayEmail}</div>
                      </div>

                      <Link
                        href="/dashboard"
                        onClick={() => setIsProfileDropdown(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-sky-50 text-slate-700 hover:text-sky-700 font-semibold text-xs sm:text-sm transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-sky-600 shrink-0" />
                        <span>{t.dashboardBtn || "Личный кабинет"}</span>
                      </Link>

                      <Link
                        href="/dashboard?tab=orders"
                        onClick={() => setIsProfileDropdown(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-sky-50 text-slate-700 hover:text-sky-700 font-semibold text-xs sm:text-sm transition-colors"
                      >
                        <Ticket className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{t.myOrdersTab || "Мои заказы"}</span>
                      </Link>

                      <Link
                        href="/dashboard?tab=history"
                        onClick={() => setIsProfileDropdown(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-sky-50 text-slate-700 hover:text-sky-700 font-semibold text-xs sm:text-sm transition-colors"
                      >
                        <History className="w-4 h-4 text-sky-600 shrink-0" />
                        <span>{t.mySearchesTab || "История поиска"}</span>
                      </Link>

                      <div className="pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold text-xs sm:text-sm transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 shrink-0" />
                          <span>{t.logoutBtn || "Выйти"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  id="btn-user-login"
                  className="liquid-glass-pill shadow-card-glass px-3.5 sm:px-4 py-1.5 rounded-full flex items-center gap-2 hover:bg-white/80 transition-all text-xs sm:text-sm font-semibold text-slate-800 border border-white/90 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-bold text-slate-800">{t.loginBtn || "Войти"}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              )}
            </>
          )}

          {/* Кнопка меню / настроек */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label={t.settingsTitle || "Настройки"}
            id="menu-button"
            className="liquid-glass-pill shadow-card-glass w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-200 shrink-0 hover:bg-white text-sky-600 border border-white/90 cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4 text-sky-600" />
          </button>
        </div>
      </header>

      {/* Модальные окна */}
      <SettingsModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isAccessibility={isHighContrast}
        onToggleAccessibility={() => onToggleHighContrast?.()}
        currency={currentCurrency}
        onSelectCurrency={(c) => onCurrencyChange?.(c as Currency)}
        currentLanguage={currentLanguage}
        onLanguageChange={onLanguageChange}
        onOpenInfoModal={onOpenInfoModal}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(newUser) => {
          setIsAuthOpen(false);
          setUser({
            id: newUser.id,
            email: newUser.email,
            user_metadata: {
              full_name: newUser.fullName,
              avatar_url: newUser.avatarUrl,
            },
          });
          if (typeof window !== 'undefined' && newUser.originCity) {
            window.dispatchEvent(
              new CustomEvent('flightsaver_origin_updated', {
                detail: { city: newUser.originCity, iata: newUser.originIata },
              })
            );
          }
        }}
        language={currentLanguage}
      />
    </>
  );
}

export default Header;
