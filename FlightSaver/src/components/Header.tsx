'use client';

import React from 'react';
import Link from 'next/link';

export interface HeaderProps {
  user?: { name: string; avatar?: string } | null;
  onLoginClick?: () => void;
  currentCurrency?: string;
  onCurrencyChange?: (c: any) => void;
  currentLanguage?: string;
  onLanguageChange?: (l: any) => void;
}

export default function Header({
  user,
  onLoginClick,
  currentCurrency = 'RUB',
  onCurrencyChange,
  currentLanguage = 'ru',
  onLanguageChange,
}: HeaderProps) {
  return (
    <header className="w-full border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Логотип */}
        <Link href="/" className="flex items-center gap-2.5 no-underline group">
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
          <span className="text-xl font-black tracking-tight text-slate-800">
            flight<span className="text-sky-500">saver</span>
          </span>
        </Link>

        {/* Элементы управления */}
        <div className="flex items-center gap-2 sm:gap-4 text-sm font-medium text-slate-600">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            title="Поддержка"
          >
            <span>❓</span>
            <span className="hidden sm:inline">Поддержка</span>
          </button>

          <button
            type="button"
            onClick={() => onLanguageChange && onLanguageChange(currentLanguage === 'ru' ? 'en' : 'ru')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <span>🌐</span>
            <span>{currentLanguage ? currentLanguage.toUpperCase() : 'RU'}</span>
          </button>

          <button
            type="button"
            onClick={() => onCurrencyChange && onCurrencyChange(currentCurrency === 'RUB' ? 'USD' : 'RUB')}
            className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-semibold text-slate-700"
          >
            {currentCurrency || 'RUB'}
          </button>

          {user ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-800"
            >
              <div className="w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium max-w-[100px] truncate">{user.name}</span>
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
            >
              <span>👤</span>
              <span>Кабинет</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export { Header };
