'use client';

import React, { useState } from 'react';

export interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: { name: string; email?: string } | null;
}

export default function DashboardModal({ isOpen, onClose, user }: DashboardModalProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'favorites' | 'history'>('history');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Шапка модального окна */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
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
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 3 карточки статистики */}
        <div className="grid grid-cols-3 gap-3 p-6 bg-[#f8fbff] border-b border-slate-100">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm text-center">
            <div className="text-xs text-slate-400 font-medium mb-1">💳 Потрачено</div>
            <div className="text-base font-extrabold text-slate-800">0 ₽</div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm text-center">
            <div className="text-xs text-slate-400 font-medium mb-1">💎 Сэкономлено</div>
            <div className="text-base font-extrabold text-sky-600">0 ₽</div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm text-center">
            <div className="text-xs text-slate-400 font-medium mb-1">✈️ Поездки</div>
            <div className="text-base font-extrabold text-slate-800">0</div>
          </div>
        </div>

        {/* Табы навигации */}
        <div className="flex border-b border-slate-100 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            🕒 История поисков
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            📋 Мои заказы
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'favorites'
                ? 'border-blue-600 text-blue-600'
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
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="font-bold text-slate-800">Хабаровск [KHV] → Ханой [HAN]</span>
                  <div className="text-[11px] text-slate-400">21 сентября 2026 • 1 пассажир</div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-sky-50 text-sky-600 font-semibold cursor-pointer">
                  Повторить
                </span>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="text-center py-8 text-slate-400 text-xs">
              У вас пока нет активных заказов
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="text-center py-8 text-slate-400 text-xs">
              Список избранных маршрутов пуст
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { DashboardModal };
