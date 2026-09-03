'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, CheckCircle2, AlertCircle, Loader2, DollarSign, Percent, Hotel, Plane, ShieldAlert } from 'lucide-react';

export default function AdminSettingsPage() {
  const [fxBuffer, setFxBuffer] = useState(1.5);
  const [splitFee, setSplitFee] = useState(1500);
  const [stpcEnabled, setStpcEnabled] = useState(true);
  const [duffelEnabled, setDuffelEnabled] = useState(true);
  const [amadeusEnabled, setAmadeusEnabled] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>('');

  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.success && data.settings) {
          setFxBuffer(data.settings.fxBufferPercent);
          setSplitFee(data.settings.splitTicketingFeeRub);
          setStpcEnabled(data.settings.stpcEnabled);
          setDuffelEnabled(data.settings.duffelLiveEnabled);
          setAmadeusEnabled(data.settings.amadeusLiveEnabled);
          setUpdatedAt(new Date(data.settings.updatedAt).toLocaleString('ru-RU'));
        }
      } catch (e) {
        console.warn('Failed to load settings:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fxBufferPercent: Number(fxBuffer),
          splitTicketingFeeRub: Number(splitFee),
          stpcEnabled,
          duffelLiveEnabled: duffelEnabled,
          amadeusLiveEnabled: amadeusEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при сохранении настроек');
      }

      setStatusMessage({ type: 'success', text: 'Конфигурация маржинальности успешно обновлена и зафиксирована в аудит-логе' });
      setUpdatedAt(new Date().toLocaleString('ru-RU'));
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Ошибка сервера' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            Rules & Pricing Engine
          </span>
          <span className="text-xs text-slate-400">• Доступно только Super Admin</span>
        </div>
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <span>Бизнес-конфигуратор: маржинальность, FX-буфер и GDS</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Управление комиссией сервиса, валютными буферами от волатильности и интеграцией поставщиков.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* БЛОК 1: ЦЕНООБРАЗОВАНИЕ И FX */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
          <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Финансовые коэффициенты и сборы</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FX-буфер */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-indigo-400" />
                  <span>FX-буфер от волатильности валют</span>
                </span>
                <span className="text-sm font-black text-indigo-400 font-mono">{fxBuffer}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={fxBuffer}
                onChange={(e) => setFxBuffer(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Защитный буфер курса при конвертации мультивалютных билетов (USD/EUR/VND в RUB). По умолчанию 1.5%.
              </p>
            </div>

            {/* Сервисный сбор за плечо */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Сбор за плечо Split-Ticketing</span>
                <span className="text-sm font-black text-emerald-400 font-mono">{splitFee.toLocaleString('ru-RU')} ₽</span>
              </div>
              <input
                type="number"
                min="0"
                max="10000"
                step="100"
                value={splitFee}
                onChange={(e) => setSplitFee(parseInt(e.target.value) || 0)}
                className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500">
                Комиссия сервиса за каждое сегментированное плечо стыковки. По умолчанию 1 500 ₽.
              </p>
            </div>
          </div>
        </div>

        {/* БЛОК 2: ПЕРЕКЛЮЧАТЕЛИ ПРОВАЙДЕРОВ */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
            <Plane className="w-4 h-4 text-sky-400" />
            <span>Интеграции и шлюзы бронирования</span>
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Hotel className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Матрица STPC транзитных отелей (8–24ч)</p>
                  <p className="text-[11px] text-slate-500">Автоматический подбор бесплатного отеля 4★/5★ при длинных стыковках</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={stpcEnabled}
                onChange={(e) => setStpcEnabled(e.target.checked)}
                className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-black text-xs">
                  GDS
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Duffel Aviation Live API</p>
                  <p className="text-[11px] text-slate-500">Прямой коннектор к 300+ авиакомпаниям (NDC / GDS)</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={duffelEnabled}
                onChange={(e) => setDuffelEnabled(e.target.checked)}
                className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-black text-xs">
                  1A
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Amadeus GDS Live API (Резервный коннектор)</p>
                  <p className="text-[11px] text-slate-500">Автоматический переключатель при сбоях основного провайдера</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={amadeusEnabled}
                onChange={(e) => setAmadeusEnabled(e.target.checked)}
                className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* КНОПКА СОХРАНЕНИЯ */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-500 font-mono">
            {updatedAt ? `Последнее обновление: ${updatedAt}` : ''}
          </span>
          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Применить конфигурацию</span>}
          </button>
        </div>
      </form>
    </div>
  );
}
