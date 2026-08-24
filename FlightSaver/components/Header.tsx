'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  LayoutGrid,
  Gem,
  User,
  LogOut,
  Ticket,
  History,
  ChevronDown
} from 'lucide-react';
import { Currency, Language } from '../lib/types';
import { TRANSLATIONS } from '../lib/i18n';
import { InfoModalType } from './InfoModal';
import { AuthModal } from './AuthModal';
import { SettingsModal } from './SettingsModal';
import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
  currentCurrency: Currency;
  onCurrencyChange: (c: Currency) => void;
  currentLanguage: Language;
  onLanguageChange: (l: Language) => void;
  isHighContrast: boolean;
  onToggleHighContrast: () => void;
  onOpenInfoModal: (type: InfoModalType) => void;
}

export function Header({
  currentCurrency,
  onCurrencyChange,
  currentLanguage,
  onLanguageChange,
  isHighContrast,
  onToggleHighContrast,
  onOpenInfoModal,
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const { user, setUser, logout } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.ru;

  // Close user menu on click outside & Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
  };

  return (
    <>
      <header className="relative z-40 w-full pt-3 pb-2 px-1 sm:px-6 flex items-center justify-between">
        {/* Floating Pill Glass Container (Elastic, fits on all screen sizes) */}
        <div className="w-full liquid-glass rounded-full px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-4 shadow-[0_8px_30px_rgba(37,99,235,0.06)] border border-white/90">
          
          {/* Brand Logo (Elastic with truncate to avoid colliding with profile button) */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
              <Gem className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="font-extrabold text-sm xs:text-base sm:text-2xl tracking-tight text-slate-900 truncate">
              FLIGHT<span className="text-blue-600">SAVER</span>
            </span>
          </Link>

          {/* Right Controls: User Profile / Login + Google-Style 9-Dots Menu Button */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            
            {/* 1. User Profile or Guest Login (Compact on mobile) */}
            {user ? (
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  type="button"
                  id="btn-user-avatar"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  aria-expanded={isUserMenuOpen}
                  aria-label="Меню пользователя"
                  className="min-h-[38px] sm:min-h-[44px] h-auto p-1 sm:px-3 sm:py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-sm flex items-center gap-1.5 font-bold text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-200 shrink-0"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="w-7 h-7 rounded-full object-cover shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
                      {user.fullName.charAt(0)}
                    </div>
                  )}
                  <span className="hidden md:inline max-w-[100px] truncate">{user.fullName.split(' ')[0]}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    role="menu"
                    id="user-dropdown-menu"
                    className="absolute right-0 top-[calc(100%+8px)] w-60 rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.18)] p-3 space-y-1 animate-fadeIn bg-white/95 backdrop-blur-2xl text-slate-900 text-left z-50"
                  >
                    {/* User Info Header */}
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{user.fullName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    </div>

                    {/* Item 1: Личный кабинет */}
                    <Link
                      href="/dashboard"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-xs sm:text-sm transition-colors"
                    >
                      <User className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{t.dashboardBtn}</span>
                    </Link>

                    {/* Item 2: Мои заказы */}
                    <Link
                      href="/dashboard?tab=orders"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-xs sm:text-sm transition-colors"
                    >
                      <Ticket className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{t.myOrdersTab}</span>
                    </Link>

                    {/* Item 3: История поиска */}
                    <Link
                      href="/dashboard?tab=history"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-xs sm:text-sm transition-colors"
                    >
                      <History className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>{t.mySearchesTab}</span>
                    </Link>

                    {/* Item 4: Выйти */}
                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold text-xs sm:text-sm transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>{t.logoutBtn}</span>
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
                className="min-h-[38px] sm:min-h-[44px] h-auto px-3 sm:px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
              >
                <User className="w-4 h-4 shrink-0" />
                <span>{t.loginBtn}</span>
              </button>
            )}

            {/* 2. Google-Style 9-Dots Menu Button */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              aria-expanded={isMenuOpen}
              aria-haspopup="dialog"
              aria-label={t.settingsTitle}
              title={t.settingsTitle}
              id="menu-button"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 shrink-0 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm"
            >
              <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal (Fullscreen Portal / Fixed Backdrop Bottom Sheet) */}
      <SettingsModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isAccessibility={isHighContrast}
        onToggleAccessibility={onToggleHighContrast}
        currency={currentCurrency}
        onSelectCurrency={(c) => onCurrencyChange(c as Currency)}
        currentLanguage={currentLanguage}
        onLanguageChange={onLanguageChange}
        onOpenInfoModal={onOpenInfoModal}
      />

      {/* Auth Modal (Google 1-Click + Email) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(newUser) => {
          setUser(newUser);
          setIsAuthOpen(false);
        }}
        language={currentLanguage}
      />
    </>
  );
}
