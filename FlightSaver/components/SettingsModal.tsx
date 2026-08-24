"use client";

import React, { useEffect } from "react";
import { X, Eye, Check, Globe, HelpCircle, Shield, Plane } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { InfoModalType } from "./InfoModal";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAccessibility: boolean;
  onToggleAccessibility: () => void;
  currency: string;
  onSelectCurrency: (curr: string) => void;
  onOpenInfoModal?: (type: InfoModalType) => void;
}

const CURRENCIES = [
  { code: "RUB", symbol: "₽" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
];

export function SettingsModal({
  isOpen,
  onClose,
  isAccessibility,
  onToggleAccessibility,
  currency,
  onSelectCurrency,
  onOpenInfoModal,
}: SettingsModalProps) {
  const { lang, setLang } = useI18n();

  // Блокировка прокрутки страницы при открытом окне
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:justify-end bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 sm:pt-16 transition-opacity duration-200"
      onClick={onClose}
    >
      {/* Карточка меню: на мобильном — снизу (Bottom Sheet), на десктопе — справа вверху */}
      <div
        className="w-full sm:w-[360px] max-w-lg bg-white rounded-t-[28px] sm:rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Индикатор свайпа для мобильных */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Шапка модального окна */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-lg">
            {lang === "ru" ? "Настройки и доступность" : "Settings & Accessibility"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть настройки"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Блок 1: Доступность */}
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
              {lang === "ru" ? "ДОСТУПНОСТЬ" : "ACCESSIBILITY"}
            </div>
            <div
              onClick={onToggleAccessibility}
              className={`w-full p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isAccessibility
                  ? "border-amber-400 bg-amber-50/60 text-slate-900"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                <Eye size={20} className={isAccessibility ? "text-amber-600" : "text-slate-500"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm leading-tight text-slate-900">
                  {lang === "ru" ? "Режим для слабовидящих" : "High Contrast & Large Font"}
                </div>
                <div className="text-xs text-slate-500 leading-snug mt-0.5">
                  {lang === "ru" ? "Крупный шрифт 118% и контраст" : "118% larger text & bold borders"}
                </div>
              </div>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  isAccessibility ? "bg-amber-500 text-white" : "bg-slate-200 text-transparent"
                }`}
              >
                <Check size={14} />
              </div>
            </div>
          </div>

          {/* Блок 2: Валюта и Язык */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
                {lang === "ru" ? "ВАЛЮТА" : "CURRENCY"}
              </div>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => onSelectCurrency(c.code)}
                    className={`h-10 rounded-lg font-bold text-sm transition-all flex items-center justify-center ${
                      currency === c.code
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {c.symbol}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
                {lang === "ru" ? "ЯЗЫК" : "LANGUAGE"}
              </div>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLang("ru")}
                  className={`h-10 rounded-lg font-bold text-sm transition-all flex items-center justify-center ${
                    lang === "ru"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  RU
                </button>
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`h-10 rounded-lg font-bold text-sm transition-all flex items-center justify-center ${
                    lang === "en"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          {/* Блок 3: Сервисы и информация */}
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
              {lang === "ru" ? "СЕРВИСЫ И ИНФОРМАЦИЯ" : "SERVICES & INFORMATION"}
            </div>
            <div className="space-y-2">
              <div
                onClick={() => {
                  onClose();
                  onOpenInfoModal?.('stpc');
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors cursor-pointer"
              >
                <Plane size={18} className="text-blue-600 shrink-0" />
                <span>{lang === "ru" ? "Бесплатные отели STPC" : "Free STPC Transit Hotels"}</span>
              </div>
              <div
                onClick={() => {
                  onClose();
                  onOpenInfoModal?.('twov');
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors cursor-pointer"
              >
                <Shield size={18} className="text-sky-500 shrink-0" />
                <span>{lang === "ru" ? "Безвизовый транзит TWOV" : "Visa-Free Transit (TWOV)"}</span>
              </div>
              <div
                onClick={() => {
                  onClose();
                  onOpenInfoModal?.('split');
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors cursor-pointer"
              >
                <HelpCircle size={18} className="text-indigo-500 shrink-0" />
                <span>{lang === "ru" ? "О технологии Split-Ticketing" : "About Split-Ticketing Tech"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
