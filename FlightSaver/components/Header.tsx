'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  LayoutGrid,
  Eye,
  Globe,
  Coins,
  Plane,
  Hotel,
  Info,
  Gem,
  Check,
  X,
  User,
  LogOut,
  Sparkles,
  Ticket,
  History,
  Shield,
  ChevronDown
} from 'lucide-react';
import { Currency, Language } from '../lib/types';
import { TRANSLATIONS } from '../lib/i18n';
import { InfoModalType } from './InfoModal';
import { AuthModal } from './AuthModal';
import { UserProfile, getStoredUser, setStoredUser } from '../lib/mockStorage';

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
  const [user, setUser] = useState<UserProfile | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[currentLanguage];

  // Load user on mount
  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isMenuOpen || isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isUserMenuOpen]);

  const handleLogout = () => {
    setUser(null);
    setStoredUser(null);
    setIsUserMenuOpen(false);
  };

  return (
    <>
      <header className="relative z-50 w-full pt-4 pb-2 px-2 sm:px-6 flex items-center justify-between">
        {/* Floating Pill Glass Container */}
        <div className="w-full liquid-glass rounded-full px-4 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between shadow-[0_8px_30px_rgba(37,99,235,0.06)] border border-white/90">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
              <Gem className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900">
              FLIGHT<span className="text-blue-600">SAVER</span>
            </span>
          </Link>

          {/* Right Controls: User Profile / Login + Google-Style 9-Dots Menu Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* 1. User Profile or Guest Login (min-h-[44px]) */}
            {user ? (
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  type="button"
                  id="btn-user-avatar"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  aria-expanded={isUserMenuOpen}
                  aria-label="Меню пользователя"
                  className="min-h-[44px] h-auto px-3 sm:px-4 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-sm flex items-center gap-2 font-bold text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
                    {user.fullName.charAt(0)}
                  </div>
                  <span className="hidden sm:inline max-w-[120px] truncate">{user.fullName.split(' ')[0]}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    role="menu"
                    id="user-dropdown-menu"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      width: '240px',
                      zIndex: 100,
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      backdropFilter: 'blur(30px)',
                    }}
                    className="rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.18)] p-3 space-y-1 animate-fadeIn text-slate-900 text-left"
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
                className="min-h-[44px] h-auto px-4 sm:px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <User className="w-4 h-4 shrink-0" />
                <span>{t.loginBtn}</span>
              </button>
            )}

            {/* 2. Google-Style 9-Dots Menu Button */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
                aria-label={t.settingsTitle}
                title={t.settingsTitle}
                id="menu-button"
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-200 shrink-0 ${
                  isMenuOpen
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 rotate-90'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm'
                }`}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5 text-blue-600" />}
              </button>

              {/* Solid, Highly-Readable Dropdown Menu with Elastic Layout */}
              {isMenuOpen && (
                <div
                  role="menu"
                  id="header-dropdown-menu"
                  style={{
                    position: 'absolute',
                    right: 'calc(100% + 14px)',
                    top: '-4px',
                    width: '350px',
                    minWidth: '340px',
                    maxWidth: 'calc(100vw - 70px)',
                    zIndex: 100,
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(30px)',
                  }}
                  className="rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.18)] p-5 space-y-4 animate-fadeIn text-slate-900"
                >
                  {/* Dashboard Quick Access Link */}
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all hover:opacity-95"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-white shrink-0" />
                      <span>{t.dashboardBtn}</span>
                    </div>
                    <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-lg">PRO</span>
                  </Link>

                  {/* 1. Accessibility Mode Button (Elastic min-h-[64px] h-auto) */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 px-1">
                      {t.accessibility}
                    </span>
                    <button
                      type="button"
                      id="btn-accessibility"
                      onClick={() => {
                        onToggleHighContrast();
                      }}
                      className={`w-full min-h-[64px] h-auto p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 ${
                        isHighContrast
                          ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold ring-2 ring-amber-300 shadow-sm'
                          : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200 text-slate-900 font-semibold'
                      }`}
                    >
                      <div className={`p-2 rounded-xl shadow-sm border shrink-0 flex items-center justify-center ${isHighContrast ? 'bg-amber-500 text-white border-amber-400' : 'bg-white text-blue-600 border-slate-100'}`}>
                        <Eye className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                        <p className="text-sm font-bold text-slate-900 leading-snug break-words">
                          {t.highContrastMode}
                        </p>
                        <p className="text-xs text-slate-500 font-normal leading-normal break-words">
                          {t.highContrastDesc}
                        </p>
                      </div>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${isHighContrast ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-200 text-transparent'}`}>
                        <Check className="w-3.5 h-3.5 text-white" />
                      </span>
                    </button>
                  </div>

                  {/* 2. Currency & 3. Language Row (Elastic min-h-[44px] h-auto) */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Currency Switcher */}
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 px-1 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-blue-600" /> {t.currency}
                      </span>
                      <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 min-h-[44px] h-auto items-center">
                        {(['RUB', 'USD', 'EUR'] as Currency[]).map((curr) => (
                          <button
                            key={curr}
                            type="button"
                            id={`btn-currency-${curr.toLowerCase()}`}
                            onClick={() => onCurrencyChange(curr)}
                            className={`flex-1 min-h-[36px] py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center ${
                              currentCurrency === curr
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-700 hover:text-blue-600'
                            }`}
                          >
                            {curr === 'RUB' ? '₽' : curr === 'USD' ? '$' : '€'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Language Switcher */}
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 px-1 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-blue-600" /> {t.language}
                      </span>
                      <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 min-h-[44px] h-auto items-center">
                        {(['ru', 'en'] as Language[]).map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            id={`btn-lang-${lang}`}
                            onClick={() => onLanguageChange(lang)}
                            className={`flex-1 min-h-[36px] py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center ${
                              currentLanguage === lang
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-700 hover:text-blue-600'
                            }`}
                          >
                            {lang.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4, 5, 6. Services Links */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 px-1">
                      {t.servicesAndInfo}
                    </span>
                    <div className="space-y-1">
                      <button
                        type="button"
                        id="btn-info-stpc"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenInfoModal('stpc');
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-xs sm:text-sm transition-colors text-left"
                      >
                        <Hotel className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="leading-snug">{t.stpcTitle}</span>
                      </button>

                      <button
                        type="button"
                        id="btn-info-twov"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenInfoModal('twov');
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-xs sm:text-sm transition-colors text-left"
                      >
                        <Plane className="w-4 h-4 text-sky-600 shrink-0" />
                        <span className="leading-snug">{t.twovTitle}</span>
                      </button>

                      <button
                        type="button"
                        id="btn-info-split"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenInfoModal('split');
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-xs sm:text-sm transition-colors text-left"
                      >
                        <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="leading-snug">{t.splitTitle}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

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
