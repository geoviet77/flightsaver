'use client';

import React, { useState } from 'react';
import { X, Ticket, History, Heart, CreditCard, TrendingUp, Plane } from 'lucide-react';

export interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: { name: string; email?: string } | null;
}

export default function DashboardModal({ isOpen, onClose, user }: DashboardModalProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'favorites' | 'history'>('history');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="liquid-glass-card bg-white/95 rounded-3xl max-w-2xl w-full shadow-glass-elevated border border-white/90 overflow-hidden">
        {/* Шапка модального окна */}
        <div className="p-5 sm:p-6 border-b border-white/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 text-white flex items-center justify-center text-sm font-bold shadow-sm">
              {user ? user.name.charAt(0).toUpperCase() : '👤'}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {user ? user.name : 'Личный кабинет'}
              </h2>
              <p className="text-xs text-slate-400">{user?.email || 'Авторизованный доступ'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full subtle-glass text-slate-500 hover:bg-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 карточки статистики (Stitch Liquid Cards) */}
        <div className="grid grid-cols-3 gap-3 p-5 sm:p-6 subtle-glass bg-white/40 border-b border-white/80">
          <div className="liquid-card p-3.5 rounded-2xl border border-white/90 shadow-glass-edge text-center">
            <div className="text-xs text-slate-500 font-medium mb-1 flex items-center justify-center gap-1">
              <CreditCard className="w-3 h-3 text-sky-600" />
              <span>Потрачено</span>
            </div>
            <div className="text-base font-extrabold text-slate-900">0 ₽</div>
          </div>
          <div className="liquid-card p-3.5 rounded-2xl border border-white/90 shadow-glass-edge text-center">
            <div className="text-xs text-slate-500 font-medium mb-1 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span>Сэкономлено</span>
            </div>
            <div className="text-base font-extrabold text-emerald-600">0 ₽</div>
          </div>
          <div className="liquid-card p-3.5 rounded-2xl border border-white/90 shadow-glass-edge text-center">
            <div className="text-xs text-slate-500 font-medium mb-1 flex items-center justify-center gap-1">
              <Plane className="w-3 h-3 text-sky-600" />
              <span>Поездки</span>
            </div>
            <div className="text-base font-extrabold text-slate-900">0</div>
          </div>
        </div>

        {/* Табы навигации */}
        <div className="flex border-b border-white/80 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            🕒 История поисков
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            📋 Мои заказы
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'favorites'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            ❤️ Избранное
          </button>
        </div>

        {/* Контент табов */}
        <div className="p-6 max-h-64 overflow-y-auto">
          {activeTab === 'history' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3.5 rounded-2xl liquid-row shadow-xs text-xs">
                <div>
                  <span className="font-bold text-slate-900">Хабаровск [KHV] → Ханой [HAN]</span>
                  <div className="text-[11px] text-slate-500">21 сентября 2026 • 1 пассажир</div>
                </div>
                <span className="px-3 py-1 rounded-xl subtle-glass text-sky-700 font-bold hover:bg-white transition cursor-pointer">
                  Повторить
                </span>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              У вас пока нет активных заказов
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              Список избранных маршрутов пуст
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { DashboardModal };
