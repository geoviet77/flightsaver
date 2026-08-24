"use client";

import React, { useEffect } from "react";
import { X, Eye, Check, Globe, HelpCircle, Shield, Plane, Coins } from "lucide-react";
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
      className="fixed inset-0 z-50 flex items-start justify-end bg-slate-900/60 backdrop-blur-sm p-2 pt-4 sm:p-4 sm:pt-4 transition-opacity duration-200"
      onClick={onClose}
    >
      {/* Карточка меню: позиционируется сверху справа так, чтобы крестик совпадал с кнопкой открытия */}
      <div
        className="w-[calc(100%-8px)] sm:w-[360px] max-w-sm bg-white rounded-3xl p-4 sm:p-5 shadow-2xl max-h-[92vh] overflow-y-auto transform transition-all duration-200 ease-out border border-slate-200/80 mr-1 sm:mr-2 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модального окна: крестик точно на позиции кнопки меню */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
            {lang === "ru" ? "Настройки и доступность" : "Settings & Accessibility"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть настройки"
            id="btn-settings-close"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Блок 1: Доступность */}
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2 px-0.5">
              {lang === "ru" ? "ДОСТУПНОСТЬ" : "ACCESSIBILITY"}
            </div>
            <div
              onClick={onToggleAccessibility}
              className={`w-full p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isAccessibility
                  ? "border-amber-400 bg-amber-50/70 text-slate-900 shadow-sm"
                  : "border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0 border border-slate-100">
                <Eye size={20} className={isAccessibility ? "text-amber-600" : "text-blue-600"} />
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
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  isAccessibility ? "bg-amber-500 text-white shadow-sm" : "bg-slate-200 text-transparent"
                }`}
              >
                <Check size={14} />
              </div>
            </div>
          </div>

          {/* Блок 2: Валюта и Язык */}
          <div className="grid grid-cols-2 gap-3">
            {/* Валюта */}
            <div>
              <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2 px-0.5 flex items-center gap-1">
                <Coins size={12} className="text-blue-600" />
                <span>{lang === "ru" ? "ВАЛЮТА" : "CURRENCY"}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => onSelectCurrency(c.code)}
                    className={`h-9 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center justify-center ${
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

            {/* Язык */}
            <div>
              <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2 px-0.5 flex items-center gap-1">
                <Globe size={12} className="text-blue-600" />
                <span>{lang === "ru" ? "ЯЗЫК" : "LANGUAGE"}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setLang("ru")}
                  className={`h-9 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center justify-center ${
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
                  className={`h-9 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center justify-center ${
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
            <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2 px-0.5">
              {lang === "ru" ? "СЕРВИСЫ И ИНФОРМАЦИЯ" : "SERVICES & INFORMATION"}
            </div>
            <div className="space-y-1.5">
              <div
                onClick={() => {
                  onClose();
                  onOpenInfoModal?.('stpc');
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              >
                <Plane size={18} className="text-blue-600 shrink-0" />
                <span className="leading-snug">{lang === "ru" ? "Бесплатные отели STPC" : "Free STPC Transit Hotels"}</span>
              </div>
              <div
                onClick={() => {
                  onClose();
                  onOpenInfoModal?.('twov');
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              >
                <Shield size={18} className="text-sky-500 shrink-0" />
                <span className="leading-snug">{lang === "ru" ? "Безвизовый транзит TWOV" : "Visa-Free Transit (TWOV)"}</span>
              </div>
              <div
                onClick={() => {
                  onClose();
                  onOpenInfoModal?.('split');
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              >
                <HelpCircle size={18} className="text-indigo-500 shrink-0" />
                <span className="leading-snug">{lang === "ru" ? "О технологии Split-Ticketing" : "About Split-Ticketing Tech"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
