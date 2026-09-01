'use client';

import React, { useState } from 'react';
import { X, Mail, CheckCircle2, Loader2, Gem, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Language } from '../lib/types';
import { TRANSLATIONS } from '../lib/i18n';
import { UserProfile, setStoredUser } from '../lib/mockStorage';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserProfile) => void;
  language?: Language;
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  language = 'ru',
}: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTelegramLoading, setIsTelegramLoading] = useState(false);
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.ru;

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const supabase = createClient();
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) {
        setErrorMessage("Ошибка авторизации Google: " + error.message);
        setIsLoading(false);
        return;
      }

      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (err: any) {
      setErrorMessage("Ошибка: " + (err?.message || "Не удалось войти через Google"));
      setIsLoading(false);
    }
  };

  const handleTelegramLogin = async () => {
    try {
      setIsTelegramLoading(true);
      setErrorMessage(null);

      // 1. Проверяем, запущен ли клиент внутри Telegram Web App (TMA)
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
        const initData = (window as any).Telegram.WebApp.initData;
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.fullName || data.user.username || 'Telegram User',
            avatarUrl: data.user.avatarUrl || '',
            preferredCurrency: 'RUB',
            isAccessibilityMode: false,
          };
          setStoredUser(profile);
          onSuccess?.(profile);
          onClose();
          return;
        } else {
          setErrorMessage(data.error || 'Ошибка входа через Telegram');
          setIsTelegramLoading(false);
          return;
        }
      }

      // 2. В обычном десктопном браузере открываем Telegram OAuth окно или виджет
      if (typeof window !== 'undefined') {
        const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'FlightSaverBot';
        const width = 550;
        const height = 470;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const authUrl = `https://oauth.telegram.org/auth?bot_id=${process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID || '7531984260'}&origin=${encodeURIComponent(window.location.origin)}&embed=1&request_access=write`;
        
        const popup = window.open(
          authUrl,
          'telegram_oauth',
          `width=${width},height=${height},left=${left},top=${top},status=0,location=0,menubar=0,toolbar=0`
        );

        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== 'https://oauth.telegram.org' && event.origin !== window.location.origin) return;
          try {
            const tgData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (tgData?.event === 'auth_result' && tgData?.result) {
              window.removeEventListener('message', handleMessage);
              if (popup) popup.close();

              const res = await fetch('/api/auth/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tgData.result),
              });
              const data = await res.json();
              if (data.success && data.user) {
                const profile: UserProfile = {
                  id: data.user.id,
                  email: data.user.email,
                  fullName: data.user.fullName || data.user.username || 'Telegram User',
                  avatarUrl: data.user.avatarUrl || '',
                  preferredCurrency: 'RUB',
                  isAccessibilityMode: false,
                };
                setStoredUser(profile);
                onSuccess?.(profile);
                onClose();
              } else {
                setErrorMessage(data.error || 'Ошибка входа через Telegram');
              }
              setIsTelegramLoading(false);
            }
          } catch {}
        };

        window.addEventListener('message', handleMessage);

        setTimeout(() => {
          setIsTelegramLoading(false);
        }, 20000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Не удалось авторизоваться через Telegram');
      setIsTelegramLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
      } else {
        setIsSuccessMessage(true);
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'OTP delivery error');
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-sky-500 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-sm shrink-0">
              <Gem className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                {t.authTitle}
              </h2>
              <p className="text-[11px] text-sky-100 font-medium">
                {t.authSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSuccessMessage ? (
            <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-emerald-900">
                {t.magicLinkSent}
              </p>
              <p className="text-xs text-emerald-700">
                {language === 'ru' ? 'Проверьте входящие сообщения и перейдите по ссылке' : 'Check your inbox and click the link to proceed'}
              </p>
            </div>
          ) : (
            <>
              {/* OAuth Buttons Stack */}
              <div className="space-y-2.5">
                {/* 1. Real Google 1-Click OAuth Button */}
                <button
                  type="button"
                  id="btn-auth-google"
                  disabled={isLoading || isTelegramLoading}
                  onClick={handleGoogleLogin}
                  className="w-full min-h-[52px] h-auto p-3 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-400 text-slate-800 font-bold text-sm sm:text-base flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-blue-100 cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600 shrink-0" />
                  ) : (
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  )}
                  <span>{t.googleSignIn}</span>
                </button>

                {/* 2. Official Telegram 1-Click OAuth Button */}
                <button
                  type="button"
                  id="btn-auth-telegram"
                  disabled={isLoading || isTelegramLoading}
                  onClick={handleTelegramLogin}
                  className="w-full min-h-[52px] h-auto p-3 rounded-2xl bg-sky-50/60 hover:bg-sky-50 border-2 border-sky-200 hover:border-sky-500 text-slate-800 font-bold text-sm sm:text-base flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-sky-100 cursor-pointer"
                >
                  {isTelegramLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#229ED9] shrink-0" />
                  ) : (
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z"
                        fill="#229ED9"
                      />
                    </svg>
                  )}
                  <span>{t.telegramSignIn}</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  {t.orEmail}
                </span>
              </div>

              {/* 3. Email Magic Link Form */}
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    id="input-auth-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    required
                    className="w-full min-h-[52px] h-auto pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-blue-600 focus:bg-white rounded-2xl text-slate-900 font-semibold text-sm sm:text-base focus:outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isTelegramLoading || !email.trim()}
                  className="w-full min-h-[50px] h-auto py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 disabled:opacity-50 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>{t.magicLinkBtn}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Privacy Guarantee */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{(t as any).authOfficialGuarantee || (language === 'ru' ? 'Официальная авторизация Supabase, Google & Telegram' : 'Official Supabase, Google & Telegram Auth')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
