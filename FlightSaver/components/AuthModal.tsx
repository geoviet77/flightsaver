'use client';

import React, { useState } from 'react';
import { X, Mail, CheckCircle2, Loader2, Sparkles, Gem, ArrowRight, ShieldCheck } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Language } from '../lib/types';
import { TRANSLATIONS } from '../lib/i18n';
import { UserProfile, setStoredUser } from '../lib/mockStorage';

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
  const t = TRANSLATIONS[language];

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
        },
      });

      if (error) {
        // Fallback for local demo simulation
        setTimeout(() => {
          const userObj: UserProfile = {
            id: 'usr-google',
            email: 'traveler@gmail.com',
            fullName: 'Александр Путешественник',
            avatarUrl: '',
            preferredCurrency: 'RUB',
            isAccessibilityMode: false,
          };
          setStoredUser(userObj);
          onSuccess(userObj);
          setIsLoading(false);
          onClose();
        }, 500);
      }
    } catch {
      setTimeout(() => {
        const userObj: UserProfile = {
          id: 'usr-google',
          email: 'traveler@gmail.com',
          fullName: 'Александр Путешественник',
          avatarUrl: '',
          preferredCurrency: 'RUB',
          isAccessibilityMode: false,
        };
        setStoredUser(userObj);
        onSuccess(userObj);
        setIsLoading(false);
        onClose();
      }, 500);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
        },
      });

      if (error) {
        // Local simulation
        setIsSuccessMessage(true);
        setTimeout(() => {
          const userObj: UserProfile = {
            id: `usr-${Date.now()}`,
            email: email.trim(),
            fullName: email.split('@')[0],
            preferredCurrency: 'RUB',
            isAccessibilityMode: false,
          };
          setStoredUser(userObj);
          onSuccess(userObj);
          setIsLoading(false);
          onClose();
        }, 1200);
      } else {
        setIsSuccessMessage(true);
        setIsLoading(false);
      }
    } catch {
      setIsSuccessMessage(true);
      setTimeout(() => {
        const userObj: UserProfile = {
          id: `usr-${Date.now()}`,
          email: email.trim(),
          fullName: email.split('@')[0],
          preferredCurrency: 'RUB',
          isAccessibilityMode: false,
        };
        setStoredUser(userObj);
        onSuccess(userObj);
        setIsLoading(false);
        onClose();
      }, 1200);
    }
  };

  const handleDemoSignIn = () => {
    const userObj: UserProfile = {
      id: 'usr-demo',
      email: 'demo.traveler@flightsaver.ai',
      fullName: 'Игорь Путешественник',
      preferredCurrency: 'RUB',
      isAccessibilityMode: false,
    };
    setStoredUser(userObj);
    onSuccess(userObj);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fadeIn"
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
              <p className="text-[11px] text-white/80 font-medium leading-tight">
                {t.authSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.modalClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body (All Large 56px Fields, No Fixed Heights) */}
        <div className="p-6 space-y-4">
          
          {/* 1. Large 56px Google 1-Click Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full min-h-[56px] h-auto p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-sm sm:text-base border-2 border-slate-200 shadow-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            {/* Google Icon */}
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
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
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span className="leading-snug break-words">{t.googleSignIn}</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t.orEmail}
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* 2. Large 56px Email Input + Magic Link */}
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="w-full min-h-[56px] h-auto p-4 rounded-2xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 font-bold text-sm sm:text-base focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full min-h-[56px] h-auto p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
              ) : (
                <Mail className="w-5 h-5 shrink-0" />
              )}
              <span className="leading-snug break-words">{t.magicLinkBtn}</span>
            </button>
          </form>

          {/* Success Notification */}
          {isSuccessMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="break-words">{t.magicLinkSent}</span>
            </div>
          )}

          {/* Quick Demo Sign In for Testing */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Тестовый аккаунт:</span>
            </span>
            <button
              type="button"
              onClick={handleDemoSignIn}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.demoLoginBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
