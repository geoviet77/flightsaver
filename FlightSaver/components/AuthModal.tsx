'use client';

import React, { useState } from 'react';
import { X, Mail, CheckCircle2, Loader2, Gem, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { Language } from '../lib/types';
import { TRANSLATIONS } from '../lib/i18n';
import { UserProfile } from '../lib/mockStorage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
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
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.ru;

  if (!isOpen) return null;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-flight-saver.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key-flightsaver'
  );

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication error');
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
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
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
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
              {/* 1. Real Google 1-Click OAuth Button (min-h-[56px]) */}
              <button
                type="button"
                id="btn-auth-google"
                disabled={isLoading}
                onClick={handleGoogleLogin}
                className="w-full min-h-[56px] h-auto p-3.5 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-400 text-slate-800 font-bold text-sm sm:text-base flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-blue-100"
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

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  {t.orEmail}
                </span>
              </div>

              {/* 2. Email Magic Link Form (min-h-[56px] input) */}
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
                    className="w-full min-h-[56px] h-auto pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-blue-600 focus:bg-white rounded-2xl text-slate-900 font-semibold text-sm sm:text-base focus:outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full min-h-[52px] h-auto py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 disabled:opacity-50 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
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
            <span>{language === 'ru' ? 'Официальная авторизация Supabase & Google' : 'Official Supabase & Google OAuth'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
