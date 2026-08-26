'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export interface HeaderProps {
  user?: { name: string; email?: string } | null;
  onOpenAuthModal?: () => void;
  onOpenDashboardModal?: () => void;
  currentCurrency?: any;
  onCurrencyChange?: (c: any) => void;
  currentLanguage?: any;
  onLanguageChange?: (l: any) => void;
  isHighContrast?: boolean;
  onToggleHighContrast?: () => void;
  onOpenInfoModal?: (type: any) => void;
}

export default function Header({
  user,
  onOpenAuthModal,
  onOpenDashboardModal,
}: HeaderProps) {
  const [showAppsMenu, setShowAppsMenu] = useState(false);
  const [lang, setLang] = useState<'RU' | 'EN'>('RU');
  const [currency, setCurrency] = useState<'RUB' | 'USD'>('RUB');
  const [accessibility, setAccessibility] = useState(false);

  return (
    <header className="w-full pt-4 pb-2 px-4 sticky top-0 z-50 flex justify-center">
      {/* Плавающая белая капсула */}
      <div className="w-full max-w-5xl bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100/80 px-6 h-16 flex items-center justify-between">
        {/* Логотип */}
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-sky-500/20">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z" />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight text-slate-800 uppercase">
            flight<span className="text-sky-500">saver</span>
          </span>
        </Link>

        {/* Правый блок: Профиль + 4 квадратика */}
        <div className="flex items-center gap-3 relative">
          {/* Кнопка Профиля / Войти */}
          {user ? (
            <button
              type="button"
              onClick={onOpenDashboardModal}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all"
            >
              <span className="text-xs">👤</span>
              <span className="max-w-[120px] truncate">{user.name}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenDashboardModal || onOpenAuthModal}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-500/20 transition-all"
            >
              <span>👤</span>
              <span>Войти</span>
            </button>
          )}

          {/* Кнопка Google Apps (4 квадратика) */}
          <button
            type="button"
            onClick={() => setShowAppsMenu(!showAppsMenu)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors ${
              showAppsMenu ? 'bg-slate-100 text-sky-600' : ''
            }`}
            title="Сервисы и настройки"
          >
            {/* Иконка 4 квадратиков (2x2 grid) */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>

          {/* Выпадающее меню Google Apps */}
          {showAppsMenu && (
            <div className="absolute right-0 top-14 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-3">
                Настройки и сервисы
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {/* Выбор языка */}
                <button
                  type="button"
                  onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')}
                  className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors"
                >
                  <span className="text-lg mb-1">🌐</span>
                  <span className="text-xs font-semibold text-slate-700">Язык: {lang}</span>
                </button>

                {/* Выбор валюты */}
                <button
                  type="button"
                  onClick={() => setCurrency(currency === 'RUB' ? 'USD' : 'RUB')}
                  className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors"
                >
                  <span className="text-lg mb-1">💱</span>
                  <span className="text-xs font-semibold text-slate-700">Валюта: {currency}</span>
                </button>
              </div>

              <div className="space-y-1 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <span>❓</span>
                  <span>Поддержка 24/7</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccessibility(!accessibility)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="flex items-center gap-3">
                    <span>♿</span>
                    <span>Режим 118% (крупный шрифт)</span>
                  </span>
                  <span
                    className={`w-3 h-3 rounded-full ${
                      accessibility ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                </button>

                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <span>ℹ️</span>
                  <span>О технологии Split-Ticketing</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export { Header };
