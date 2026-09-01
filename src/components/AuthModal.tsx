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
  Smartphone,
  ExternalLink,
  Phone,
  Check,
  ChevronDown,
  Search,
} from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Language } from '../lib/types';
import { TRANSLATIONS } from '../lib/i18n';
import { UserProfile, setStoredUser } from '../lib/mockStorage';

export interface CountryDial {
  name: string;
  code: string;
  dial: string;
  flag: string;
}

export const COUNTRIES: CountryDial[] = [
  { name: 'Вьетнам', code: 'VN', dial: '+84', flag: '🇻🇳' },
  { name: 'Россия', code: 'RU', dial: '+7', flag: '🇷🇺' },
  { name: 'Казахстан', code: 'KZ', dial: '+7', flag: '🇰🇿' },
  { name: 'Беларусь', code: 'BY', dial: '+375', flag: '🇧🇾' },
  { name: 'Узбекистан', code: 'UZ', dial: '+998', flag: '🇺🇿' },
  { name: 'Таиланд', code: 'TH', dial: '+66', flag: '🇹🇭' },
  { name: 'Турция', code: 'TR', dial: '+90', flag: '🇹🇷' },
  { name: 'ОАЭ', code: 'AE', dial: '+971', flag: '🇦🇪' },
  { name: 'Грузия', code: 'GE', dial: '+995', flag: '🇬🇪' },
  { name: 'Армения', code: 'AM', dial: '+374', flag: '🇦🇲' },
  { name: 'Индонезия (Бали)', code: 'ID', dial: '+62', flag: '🇮🇩' },
  { name: 'Германия', code: 'DE', dial: '+49', flag: '🇩🇪' },
  { name: 'Франция', code: 'FR', dial: '+33', flag: '🇫🇷' },
  { name: 'Великобритания', code: 'GB', dial: '+44', flag: '🇬🇧' },
  { name: 'США', code: 'US', dial: '+1', flag: '🇺🇸' },
  { name: 'Китай', code: 'CN', dial: '+86', flag: '🇨🇳' },
  { name: 'Сербия', code: 'RS', dial: '+381', flag: '🇷🇸' },
  { name: 'Израиль', code: 'IL', dial: '+972', flag: '🇮🇱' },
  { name: 'Кыргызстан', code: 'KG', dial: '+996', flag: '🇰🇬' },
  { name: 'Таджикистан', code: 'TJ', dial: '+992', flag: '🇹🇯' },
  { name: 'Азербайджан', code: 'AZ', dial: '+994', flag: '🇦🇿' },
  { name: 'Молдова', code: 'MD', dial: '+373', flag: '🇲🇩' },
  { name: 'Кипр', code: 'CY', dial: '+357', flag: '🇨🇾' },
  { name: 'Испания', code: 'ES', dial: '+34', flag: '🇪🇸' },
  { name: 'Италия', code: 'IT', dial: '+39', flag: '🇮🇹' },
  { name: 'Япония', code: 'JP', dial: '+81', flag: '🇯🇵' },
  { name: 'Южная Корея', code: 'KR', dial: '+82', flag: '🇰🇷' },
  { name: 'Индия', code: 'IN', dial: '+91', flag: '🇮🇳' },
];

export function detectCountryFromCoords(lat?: number | null, lon?: number | null): CountryDial {
  if (typeof lat === 'number' && typeof lon === 'number') {
    // Вьетнам: широта 8.5..23.4, долгота 102.1..109.5
    if (lat >= 8.5 && lat <= 23.4 && lon >= 102.1 && lon <= 109.5) {
      return COUNTRIES.find((c) => c.code === 'VN') || COUNTRIES[0];
    }
    // Таиланд
    if (lat >= 5.6 && lat <= 20.5 && lon >= 97.3 && lon <= 105.6) {
      return COUNTRIES.find((c) => c.code === 'TH') || COUNTRIES[5];
    }
    // ОАЭ
    if (lat >= 22.6 && lat <= 26.1 && lon >= 51.5 && lon <= 56.4) {
      return COUNTRIES.find((c) => c.code === 'AE') || COUNTRIES[7];
    }
    // Турция
    if (lat >= 35.8 && lat <= 42.2 && lon >= 25.6 && lon <= 44.8) {
      return COUNTRIES.find((c) => c.code === 'TR') || COUNTRIES[6];
    }
    // Индонезия
    if (lat >= -11.0 && lat <= 6.1 && lon >= 95.0 && lon <= 141.0) {
      return COUNTRIES.find((c) => c.code === 'ID') || COUNTRIES[10];
    }
    // Грузия
    if (lat >= 41.0 && lat <= 43.6 && lon >= 40.0 && lon <= 46.7) {
      return COUNTRIES.find((c) => c.code === 'GE') || COUNTRIES[8];
    }
    // Армения
    if (lat >= 38.8 && lat <= 41.3 && lon >= 43.4 && lon <= 46.6) {
      return COUNTRIES.find((c) => c.code === 'AM') || COUNTRIES[9];
    }
    // Казахстан
    if (lat >= 40.5 && lat <= 55.4 && lon >= 46.5 && lon <= 87.3) {
      return COUNTRIES.find((c) => c.code === 'KZ') || COUNTRIES[2];
    }
    // Узбекистан
    if (lat >= 37.2 && lat <= 45.6 && lon >= 56.0 && lon <= 73.1) {
      return COUNTRIES.find((c) => c.code === 'UZ') || COUNTRIES[4];
    }
    // Россия
    if (lat >= 41.0 && lat <= 82.0 && (lon >= 19.0 || lon <= -169.0)) {
      return COUNTRIES.find((c) => c.code === 'RU') || COUNTRIES[1];
    }
  }

  // Определение по часовому поясу устройства
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase();
    if (tz.includes('vietnam') || tz.includes('ho_chi_minh') || tz.includes('saigon')) {
      return COUNTRIES.find((c) => c.code === 'VN') || COUNTRIES[0];
    }
    if (tz.includes('bangkok')) {
      return COUNTRIES.find((c) => c.code === 'TH') || COUNTRIES[5];
    }
    if (tz.includes('dubai')) {
      return COUNTRIES.find((c) => c.code === 'AE') || COUNTRIES[7];
    }
    if (tz.includes('istanbul')) {
      return COUNTRIES.find((c) => c.code === 'TR') || COUNTRIES[6];
    }
    if (tz.includes('bali') || tz.includes('jakarta')) {
      return COUNTRIES.find((c) => c.code === 'ID') || COUNTRIES[10];
    }
    if (tz.includes('almaty')) {
      return COUNTRIES.find((c) => c.code === 'KZ') || COUNTRIES[2];
    }
    if (tz.includes('tashkent')) {
      return COUNTRIES.find((c) => c.code === 'UZ') || COUNTRIES[4];
    }
  } catch {}

  return COUNTRIES[1]; // По умолчанию Россия (+7)
}

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
  const [authMode, setAuthMode] = useState<'main' | 'telegram_qr' | 'phone_prompt'>('main');
  const [email, setEmail] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryDial>(COUNTRIES[1]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Кэшированные координаты пользователя
  const cachedLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Состояние Telegram QR / Deep Link сессии
  const [telegramSession, setTelegramSession] = useState<{
    sessionId: string;
    deepLink: string;
    qrCodeUrl: string;
  } | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [isSessionConfirmed, setIsSessionConfirmed] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
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

  // Очистка таймеров
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Закрытие выпадающего списка стран по клику вне
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    if (isCountryDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isCountryDropdownOpen]);

  // Сброс состояния при закрытии
  useEffect(() => {
    if (!isOpen) {
      setAuthMode('main');
      setErrorMessage(null);
      setIsSuccessMessage(false);
      setTelegramSession(null);
      setIsSessionConfirmed(false);
      setPhoneDigits('');
      setIsCountryDropdownOpen(false);
      setCountrySearchQuery('');
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }
  }, [isOpen]);

  // Функция надежного извлечения Telegram initData (из SDK или хэша URL)
  const getTelegramInitData = (): string => {
    if (typeof window === 'undefined') return '';
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initData && tg.initData.trim().length > 0) {
      return tg.initData;
    }
    if (window.location.hash && window.location.hash.includes('tgWebAppData=')) {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const raw = hashParams.get('tgWebAppData');
        if (raw && raw.trim().length > 0) {
          return raw;
        }
      } catch {}
    }
    if (window.location.search && window.location.search.includes('tgWebAppData=')) {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const raw = searchParams.get('tgWebAppData');
        if (raw && raw.trim().length > 0) {
          return raw;
        }
      } catch {}
    }
    return '';
  };

  // Запрос геопозиции через браузер с автоматическим выбором страны
  const requestUserLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (cachedLocationRef.current) return cachedLocationRef.current;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    try {
      const loc = await new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
        const timer = setTimeout(() => resolve(null), 3000);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timer);
            const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            cachedLocationRef.current = coords;
            // Автоматически подставляем код страны по координатам
            const detected = detectCountryFromCoords(coords.latitude, coords.longitude);
            setSelectedCountry(detected);
            resolve(coords);
          },
          () => {
            clearTimeout(timer);
            // Если отказано в локации — определяем хотя бы по TimeZone
            const detected = detectCountryFromCoords(null, null);
            setSelectedCountry(detected);
            resolve(null);
          },
          { timeout: 3000, enableHighAccuracy: false }
        );
      });
      return loc;
    } catch {
      return null;
    }
  };

  // Завершение авторизации Telegram на сервере с собранным телефоном и локацией
  const finalizeTelegramAuth = async (rawPhone: string | null) => {
    try {
      setIsQrLoading(true);
      setErrorMessage(null);

      // Запрашиваем геопозицию (если еще не была получена)
      const location = cachedLocationRef.current || (await requestUserLocation());
      const rawInitData = getTelegramInitData();

      // Если есть initData (TWA) -> мгновенная авторизация
      if (rawInitData && rawInitData.trim().length > 0) {
        const authRes = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData: rawInitData,
            phone: rawPhone ? rawPhone.trim() : null,
            location: location || null,
          }),
        });

        const authData = await authRes.json();
        if (authData.success && authData.user) {
          const profile: UserProfile = {
            id: authData.user.id,
            email: authData.user.email,
            fullName: authData.user.fullName || authData.user.username || 'Telegram User',
            avatarUrl: authData.user.avatarUrl || '',
            preferredCurrency: 'RUB',
            isAccessibilityMode: false,
          };
          setStoredUser(profile);
          setIsSessionConfirmed(true);
          setIsQrLoading(false);

          // Уведомляем родительский компонент и закрываем окно через 800 мс
          setTimeout(() => {
            onSuccess?.(profile);
            onClose();
          }, 800);
          return;
        } else {
          setErrorMessage(authData.error || 'Ошибка подтверждения сессии Telegram');
        }
      }

      // Если initData нет (обычный мобильный браузер): открываем QR-сессию
      const res = await fetch('/api/auth/telegram/session', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.sessionId) {
        setTelegramSession({
          sessionId: data.sessionId,
          deepLink: data.deepLink,
          qrCodeUrl: data.qrCodeUrl,
        });
        setAuthMode('telegram_qr');

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
              setTimeout(() => {
                onSuccess?.(profile);
                onClose();
              }, 800);
            }
          } catch {}
        }, 1500);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ошибка авторизации Telegram');
    } finally {
      setIsQrLoading(false);
    }
  };

  // Точка входа авторизации через Telegram
  const startTelegramAuth = async () => {
    try {
      setIsQrLoading(true);
      setErrorMessage(null);

      const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
      if (tg && typeof tg.ready === 'function') {
        tg.ready();
      }

      // Сначала определяем страну по геопозиции / часовому поясу
      await requestUserLocation();

      // 1. Попытка нативного запроса контакта через Telegram WebApp SDK
      let nativePhone: string | null = null;
      if (tg && typeof tg.requestContact === 'function') {
        try {
          const contactRes: any = await new Promise((resolve) => {
            const timer = setTimeout(() => resolve(null), 2000);
            tg.requestContact((status: boolean, response: any) => {
              clearTimeout(timer);
              if (status && response?.responseUnsafe?.contact?.phone_number) {
                resolve(response.responseUnsafe.contact.phone_number);
              } else {
                resolve(null);
              }
            });
          });
          nativePhone = contactRes || null;
        } catch {
          nativePhone = null;
        }
      }

      // Если номер получен нативно -> сразу финализируем авторизацию
      if (nativePhone) {
        await finalizeTelegramAuth(nativePhone);
        return;
      }

      // 2. Если нативный метод SDK не вернул номер -> переходим на интерактивный экран ввода номера
      setIsQrLoading(false);
      setAuthMode('phone_prompt');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ошибка запуска авторизации');
      setIsQrLoading(false);
    }
  };

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

  // Фильтрация списка стран при поиске
  const filteredCountries = COUNTRIES.filter((c) => {
    const q = countrySearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.dial.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  // 🛑 ГАРАНТИРОВАННОЕ СКРЫТИЕ МОДАЛЬНОГО ОКНА, КОГДА isOpen === false
  if (!isOpen) {
    return null;
  }

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
        {/* Modal Top Header (БЕЗ кнопки назад, только статус и крестик) */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-sky-500 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-sm shrink-0">
              {authMode === 'phone_prompt' ? (
                <Phone className="w-4 h-4" />
              ) : (
                <Gem className="w-4 h-4" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                {authMode === 'phone_prompt'
                  ? 'Номер телефона'
                  : authMode === 'telegram_qr'
                  ? 'Вход через Telegram'
                  : t.authTitle}
              </h2>
              <p className="text-[11px] text-sky-100 font-medium">
                {authMode === 'phone_prompt'
                  ? 'Для оформления билетов и STPC'
                  : authMode === 'telegram_qr'
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

          {/* 🌟 ГЛОБАЛЬНЫЙ ЭКРАН УСПЕХА ДЛЯ ВСЕХ РЕЖИМОВ */}
          {isSessionConfirmed ? (
            <div className="p-8 text-center space-y-4 bg-emerald-50 rounded-2xl border border-emerald-200 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-emerald-900">
                  Вход успешно выполнен!
                </p>
                <p className="text-xs text-emerald-700 font-medium">
                  Загружаем ваш профиль и специальные тарифы...
                </p>
              </div>
            </div>
          ) : authMode === 'phone_prompt' ? (
            /* 📱 РЕЖИМ СБОРА НОМЕРА ТЕЛЕФОНА С ВЫБОРОМ РЕГИОНА И НЕСТИРАЕМЫМ "+" */
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto shadow-sm">
                  <Phone className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Укажите ваш номер телефона
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Код страны определен автоматически. При необходимости вы можете изменить регион:
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {/* Компонент ввода телефона: Выбор страны + Нестираемый префикс "+" */}
                <div className="relative" ref={dropdownRef}>
                  <div className="flex rounded-2xl border-2 border-slate-200 focus-within:border-blue-600 bg-slate-50 transition-all overflow-visible">
                    {/* Кнопка выпадающего списка страны */}
                    <button
                      type="button"
                      onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                      className="flex items-center gap-1.5 px-3 py-3 bg-slate-100 hover:bg-slate-200/80 rounded-l-2xl border-r border-slate-200 text-slate-800 font-bold text-sm sm:text-base shrink-0 cursor-pointer transition-colors"
                    >
                      <span className="text-lg leading-none">{selectedCountry.flag}</span>
                      <span>{selectedCountry.dial}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {/* Поле ввода цифр номера (префикс "+" уже зафиксирован) */}
                    <div className="relative flex-1 flex items-center">
                      <input
                        type="tel"
                        id="input-auth-phone-digits"
                        value={phoneDigits}
                        onChange={(e) => {
                          // Разрешаем ввод только цифр, пробелов и дефисов
                          const cleaned = e.target.value.replace(/[^\d\s-]/g, '');
                          setPhoneDigits(cleaned);
                        }}
                        placeholder="912 345-67-89"
                        autoFocus
                        className="w-full h-full px-3 py-3 bg-transparent text-slate-900 font-semibold text-sm sm:text-base focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Выпадающий список выбора страны с поиском */}
                  {isCountryDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 space-y-2 max-h-60 overflow-hidden flex flex-col animate-fadeIn">
                      {/* Поиск региона */}
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={countrySearchQuery}
                          onChange={(e) => setCountrySearchQuery(e.target.value)}
                          placeholder="Поиск страны или кода (+7, +84...)"
                          className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Список стран */}
                      <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                        {filteredCountries.map((country) => (
                          <button
                            key={country.code + country.dial}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(country);
                              setIsCountryDropdownOpen(false);
                              setCountrySearchQuery('');
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer ${
                              selectedCountry.code === country.code
                                ? 'bg-blue-50 text-blue-700 font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">{country.flag}</span>
                              <span>{country.name}</span>
                            </div>
                            <span className="text-slate-400 font-mono">{country.dial}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Кнопка подтверждения номера */}
                <button
                  type="button"
                  id="btn-confirm-phone"
                  disabled={isQrLoading}
                  onClick={() => {
                    const fullPhone = phoneDigits.trim()
                      ? `${selectedCountry.dial}${phoneDigits.replace(/[\s-]/g, '')}`
                      : null;
                    finalizeTelegramAuth(fullPhone);
                  }}
                  className="w-full min-h-[52px] p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  {isQrLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Подтвердить и завершить вход</span>
                    </>
                  )}
                </button>

                {/* Кнопка пропуска шага */}
                <button
                  type="button"
                  id="btn-skip-phone"
                  disabled={isQrLoading}
                  onClick={() => finalizeTelegramAuth(null)}
                  className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors cursor-pointer text-center"
                >
                  Пропустить (укажу при покупке билета)
                </button>
              </div>
            </div>
          ) : authMode === 'telegram_qr' ? (
            /* РЕЖИМ QR ДЛЯ ДЕСКТОПА */
            <div className="space-y-4 text-center">
              {isQrLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#229ED9]" />
                  <span className="text-xs text-slate-500 font-medium">
                    Авторизация через Telegram...
                  </span>
                </div>
              ) : telegramSession ? (
                <div className="space-y-4">
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
                    <span>Открыть Telegram Desktop</span>
                    <ExternalLink className="w-4 h-4 opacity-75 shrink-0" />
                  </a>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#229ED9]" />
                    <span>Ожидание подтверждения входа...</span>
                  </div>
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
                  onClick={startTelegramAuth}
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
                      ? 'Войти с помощью Telegram'
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
