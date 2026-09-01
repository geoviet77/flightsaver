'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  CheckCircle2,
  Loader2,
  Gem,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  QrCode,
  ArrowLeft,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
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
  const [authMode, setAuthMode] = useState<'main' | 'telegram_qr'>('main');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Состояние Telegram QR / Deep Link сессии
  const [telegramSession, setTelegramSession] = useState<{
    sessionId: string;
    deepLink: string;
    qrCodeUrl: string;
  } | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [isSessionConfirmed, setIsSessionConfirmed] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.ru;

  // Определение мобильного устройства
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        setIsMobile(
          window.innerWidth < 768 ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
              navigator.userAgent
            )
        );
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  // Бесшовная авторизация внутри Telegram Web App (TMA)
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.initData && tg.initData.trim().length > 0) {
        // Пользователь открыл модалку внутри Telegram -> сразу авторизуем без показа QR
        handleTmaAutoAuth(tg.initData);
      }
    }
  }, [isOpen]);

  // Очистка таймеров
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Сброс состояния при закрытии
  useEffect(() => {
    if (!isOpen) {
      setAuthMode('main');
      setErrorMessage(null);
      setIsSuccessMessage(false);
      setTelegramSession(null);
      setIsSessionConfirmed(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }
  }, [isOpen]);

  // Автоматический вход внутри TMA
  const handleTmaAutoAuth = async (initData: string) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

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
      } else {
        setErrorMessage(data.error || 'Не удалось выполнить вход через Telegram');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ошибка связи с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // 1. Google OAuth
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const supabase = createClient();
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        setErrorMessage('Ошибка авторизации Google: ' + error.message);
        setIsLoading(false);
        return;
      }

      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (err: any) {
      setErrorMessage('Ошибка: ' + (err?.message || 'Не удалось войти через Google'));
      setIsLoading(false);
    }
  };

  // 2. Инициализация Telegram сессии
  const startTelegramQrAuth = async () => {
    try {
      setIsQrLoading(true);
      setErrorMessage(null);

      // Если запущено внутри Telegram Mini App -> мгновенный вход
      if (typeof window !== 'undefined') {
        const tg = (window as any).Telegram?.WebApp;
        if (tg && tg.initData && tg.initData.trim().length > 0) {
          await handleTmaAutoAuth(tg.initData);
          setIsQrLoading(false);
          return;
        }
      }

      // Для браузера переходим в режим ожидания бота
      setAuthMode('telegram_qr');

      const res = await fetch('/api/auth/telegram/session', {
        method: 'POST',
      });
      const data = await res.json();

      if (!data.success || !data.sessionId) {
        throw new Error(data.error || 'Не удалось создать сессию Telegram');
      }

      setTelegramSession({
        sessionId: data.sessionId,
        deepLink: data.deepLink,
        qrCodeUrl: data.qrCodeUrl,
      });
      setIsQrLoading(false);

      // Запускаем опрос статуса подтверждения (каждые 1.5 сек)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const checkRes = await fetch(`/api/auth/telegram/session?id=${data.sessionId}`);
          const checkData = await checkRes.json();

          if (checkData.success && checkData.status === 'confirmed' && checkData.user) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsSessionConfirmed(true);

            const profile: UserProfile = {
              id: checkData.user.id,
              email: checkData.user.email,
              fullName: checkData.user.fullName || checkData.user.username || 'Telegram User',
              avatarUrl: checkData.user.avatarUrl || '',
              preferredCurrency: 'RUB',
              isAccessibilityMode: false,
            };

            setStoredUser(profile);
            onSuccess?.(profile);

            setTimeout(() => {
              onClose();
            }, 800);
          }
        } catch {}
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ошибка запуска авторизации Telegram');
      setIsQrLoading(false);
    }
  };

  // 3. Вход по Email
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
            {authMode === 'telegram_qr' ? (
              <button
                type="button"
                onClick={() => setAuthMode('main')}
                aria-label="Назад"
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-sm shrink-0">
                <Gem className="w-4 h-4" />
              </div>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                {authMode === 'telegram_qr' ? 'Вход через Telegram' : t.authTitle}
              </h2>
              <p className="text-[11px] text-sky-100 font-medium">
                {authMode === 'telegram_qr'
                  ? isMobile
                    ? 'Через приложение Telegram'
                    : 'По QR-коду или ссылке'
                  : t.authSubtitle}
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

          {/* РЕЖИМ 1: ТЕЛЕГРАМ (АДАПТИВНО ДЛЯ ПК И МОБИЛЬНЫХ) */}
          {authMode === 'telegram_qr' ? (
            <div className="space-y-4 text-center">
              {isSessionConfirmed ? (
                <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200 animate-fadeIn">
                  <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <p className="text-base font-bold text-emerald-900">
                    Вход успешно выполнен!
                  </p>
                  <p className="text-xs text-emerald-700 font-medium">
                    Загружаем ваш профиль и персональные тарифы...
                  </p>
                </div>
              ) : isQrLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#229ED9]" />
                  <span className="text-xs text-slate-500 font-medium">
                    Генерация защищенной ссылки...
                  </span>
                </div>
              ) : telegramSession ? (
                <div className="space-y-4">
                  {/* ДЛЯ СМАРТФОНОВ: КРУПНАЯ КНОПКА ПЕРЕХОДА БЕЗ QR-КОДА */}
                  {isMobile ? (
                    <div className="p-5 bg-sky-50/60 rounded-3xl border border-sky-200 text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-[#229ED9] text-white flex items-center justify-center mx-auto shadow-md shadow-sky-500/25">
                        <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                        </svg>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-slate-900">
                          Подтверждение в Telegram
                        </h3>
                        <p className="text-xs text-slate-600">
                          Нажмите кнопку ниже, чтобы открыть бота <b>@FlightSaver_AIBot</b> и подтвердить вход
                        </p>
                      </div>

                      <a
                        href={telegramSession.deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full min-h-[52px] p-3 rounded-2xl bg-gradient-to-r from-[#229ED9] to-[#1E88E5] hover:from-[#1E88E5] hover:to-[#1976D2] text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-md shadow-sky-500/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <Smartphone className="w-5 h-5 shrink-0" />
                        <span>Открыть Telegram и войти</span>
                        <ExternalLink className="w-4 h-4 opacity-75 shrink-0" />
                      </a>

                      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-1">
                        <Loader2 className="w-4 h-4 animate-spin text-[#229ED9]" />
                        <span>Ожидание нажатия START в Telegram...</span>
                      </div>
                    </div>
                  ) : (
                    /* ДЛЯ ДЕСКТОПА: QR-КОД + КНОПКА */
                    <>
                      <div className="relative inline-block p-3 bg-slate-50 rounded-2xl border-2 border-slate-200 shadow-inner">
                        <img
                          src={telegramSession.qrCodeUrl}
                          alt="QR Код для входа в Telegram"
                          className="w-48 h-48 rounded-xl mx-auto"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-10 h-10 rounded-full bg-[#229ED9] text-white flex items-center justify-center shadow-lg border-2 border-white">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm font-bold text-slate-800">
                          Отсканируйте QR-код камерой телефона
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Откроется диалог с ботом — нажмите кнопку <b>START</b>
                        </p>
                      </div>

                      <a
                        href={telegramSession.deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full min-h-[50px] p-3 rounded-2xl bg-gradient-to-r from-[#229ED9] to-[#1E88E5] hover:from-[#1E88E5] hover:to-[#1976D2] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md shadow-sky-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                      >
                        <Smartphone className="w-5 h-5 shrink-0" />
                        <span>Открыть приложение Telegram Desktop</span>
                        <ExternalLink className="w-4 h-4 opacity-75 shrink-0" />
                      </a>

                      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#229ED9]" />
                        <span>Ожидание нажатия START в Telegram...</span>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          ) : isSuccessMessage ? (
            /* РЕЖИМ 2: УСПЕХ MAGIC LINK */
            <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-emerald-900">{t.magicLinkSent}</p>
              <p className="text-xs text-emerald-700">
                {language === 'ru'
                  ? 'Проверьте входящие сообщения и перейдите по ссылке'
                  : 'Check your inbox and click the link to proceed'}
              </p>
            </div>
          ) : (
            /* РЕЖИМ 3: ГЛАВНЫЙ ЭКРАН ВХОДА */
            <>
              <div className="space-y-2.5">
                {/* 1. Кнопка Telegram */}
                <button
                  type="button"
                  id="btn-auth-telegram"
                  disabled={isLoading || isQrLoading}
                  onClick={startTelegramQrAuth}
                  className="w-full min-h-[52px] h-auto p-3 rounded-2xl bg-sky-50/70 hover:bg-sky-50 border-2 border-sky-300 hover:border-sky-500 text-slate-900 font-bold text-sm sm:text-base flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-sky-100 cursor-pointer"
                >
                  {isQrLoading || isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#229ED9] shrink-0" />
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z"
                          fill="#229ED9"
                        />
                      </svg>
                      {!isMobile && <QrCode className="w-4 h-4 text-sky-600" />}
                    </div>
                  )}
                  <span>
                    {isMobile
                      ? 'Войти через Telegram'
                      : 'Войти через Telegram (по QR-коду)'}
                  </span>
                </button>

                {/* 2. Кнопка Google 1-Click OAuth */}
                <button
                  type="button"
                  id="btn-auth-google"
                  disabled={isLoading || isQrLoading}
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
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  {t.orEmail}
                </span>
              </div>

              {/* 3. Форма входа по Email */}
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
                  disabled={isLoading || isQrLoading || !email.trim()}
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
            <span>Официальная авторизация Supabase, Google & Telegram</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
