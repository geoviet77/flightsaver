"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { User, LogOut, LayoutDashboard, Ticket, History, LayoutGrid, Menu, ChevronDown, Gem } from "lucide-react";
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

    // 1. Получаем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Слушаем события входа / выхода
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    setIsProfileDropdown(false);
    if (typeof window !== "undefined") {
      window.location.reload();
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
      <header className="relative z-40 w-full pt-3 pb-2 px-1 sm:px-6 flex items-center justify-between">
        {/* Floating Pill Glass Container */}
        <div className="w-full liquid-glass rounded-full px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-4 shadow-[0_8px_30px_rgba(37,99,235,0.06)] border border-white/90">
          
          {/* Логотип */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial no-underline">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
              <Gem className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="font-extrabold text-sm xs:text-base sm:text-2xl tracking-tight text-slate-900 truncate">
              FLIGHT<span className="text-blue-600">SAVER</span>
            </span>
          </Link>

          {/* Правая часть: Профиль / Вход + Меню Настроек */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {!loading && (
              <>
                {user ? (
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      id="btn-user-avatar"
                      onClick={() => setIsProfileDropdown(!isProfileDropdown)}
                      className="min-h-[38px] sm:min-h-[44px] h-auto p-1 sm:px-3 sm:py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-sm flex items-center gap-1.5 font-bold text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-200 shrink-0 cursor-pointer"
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-7 h-7 rounded-full object-cover shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="hidden md:inline max-w-[110px] truncate text-slate-700">
                        {displayName.split(" ")[0]}
                      </span>
                      <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                    </button>

                    {/* Выпадающее меню профиля */}
                    {isProfileDropdown && (
                      <div
                        role="menu"
                        className="absolute right-0 top-[calc(100%+8px)] w-60 rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.18)] p-3 space-y-1 animate-fadeIn bg-white/95 backdrop-blur-2xl text-slate-900 text-left z-50"
                      >
                        <div className="px-3 py-2 border-b border-slate-100 mb-1">
                          <div className="font-bold text-xs text-slate-900 truncate">{displayName}</div>
                          <div className="text-[11px] text-slate-400 truncate">{displayEmail}</div>
                        </div>

                        <Link
                          href="/dashboard"
                          onClick={() => setIsProfileDropdown(false)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-xs sm:text-sm transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{t.dashboardBtn || "Личный кабинет"}</span>
                        </Link>

                        <Link
                          href="/dashboard?tab=orders"
                          onClick={() => setIsProfileDropdown(false)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-xs sm:text-sm transition-colors"
                        >
                          <Ticket className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{t.myOrdersTab || "Мои заказы"}</span>
                        </Link>

                        <Link
                          href="/dashboard?tab=history"
                          onClick={() => setIsProfileDropdown(false)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-xs sm:text-sm transition-colors"
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
                    className="min-h-[38px] sm:min-h-[44px] h-auto px-3.5 sm:px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 cursor-pointer"
                  >
                    <User className="w-4 h-4 shrink-0" />
                    <span>{t.loginBtn || "Войти"}</span>
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
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 shrink-0 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm cursor-pointer"
            >
              <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </button>
          </div>
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
        language={currentLanguage}
      />
    </>
  );
}

export default Header;
