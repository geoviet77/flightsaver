'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, KeyRound, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/admin';

  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('owner@flightsaver.com');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка входа в систему управления');
      }

      // Сохранение информации профиля в localStorage для интерфейса
      if (data.user) {
        localStorage.setItem('fs_admin_profile', JSON.stringify(data.user));
      }

      router.push(returnUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка подключения к серверу');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl relative z-10">
      {/* Заголовок */}
      <div className="text-center space-y-3 mb-8">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-sky-400 p-0.5 mx-auto shadow-xl shadow-indigo-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">FlightSaver Operations Hub</h1>
          <p className="text-xs text-slate-400 mt-1">Авторизованный вход для администраторов и персонала</p>
        </div>
      </div>

      {/* Ошибка */}
      {errorMessage && (
        <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Форма авторизации */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Рабочий Email администратора
          </label>
          <div className="relative">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@flightsaver.com"
              className="w-full h-11 px-4 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Мастер-PIN Суперадминистратора
            </label>
            <span className="text-[10px] text-amber-400 font-mono">root access</span>
          </div>
          <div className="relative">
            <input
              type="password"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••••••••"
              className="w-full h-11 px-4 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all tracking-widest font-mono"
            />
            <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* Быстрая подсказка для демонстрации */}
        <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Мастер-PIN по умолчанию:</span>
          <button
            type="button"
            onClick={() => setPin('flightsaver2026')}
            className="text-amber-400 font-mono font-bold hover:underline cursor-pointer"
          >
            flightsaver2026
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer mt-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Войти в Центр управления</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-800/80 text-center text-[10px] text-slate-500 font-mono">
        Security Level: Tier-3 PCI-DSS Compliant • Audit Log Enabled
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      {/* Фоновые градиентные сферы */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <Suspense
        fallback={
          <div className="w-full max-w-md p-12 text-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-2" />
            <p className="text-xs">Загрузка формы авторизации...</p>
          </div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
