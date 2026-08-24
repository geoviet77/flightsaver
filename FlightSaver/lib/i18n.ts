import React, { useState, useEffect } from 'react';
import { Language, Currency } from './types';

export const CURRENCY_RATES: Record<Currency, { rate: number; symbol: string }> = {
  RUB: { rate: 1, symbol: '₽' },
  USD: { rate: 1 / 92.5, symbol: '$' },
  EUR: { rate: 1 / 100.5, symbol: '€' },
  THB: { rate: 0.38, symbol: '฿' },
  AED: { rate: 25.2, symbol: 'AED' },
};

export function formatPrice(amountRub: number, currency: Currency): string {
  const currInfo = CURRENCY_RATES[currency] || CURRENCY_RATES.RUB;
  const converted = Math.round(amountRub * currInfo.rate);
  return `${converted.toLocaleString(currency === 'RUB' ? 'ru-RU' : 'en-US')} ${currInfo.symbol}`;
}

export function useI18n() {
  const [lang, setLangState] = useState<Language>('ru');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flightsaver_lang') as Language;
      if (saved && (saved === 'ru' || saved === 'en')) {
        setLangState(saved);
      }
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('flightsaver_lang', newLang);
      window.dispatchEvent(new Event('languageChange'));
    }
  };

  return {
    lang,
    setLang,
    t: TRANSLATIONS[lang],
  };
}

export const TRANSLATIONS = {
  ru: {
    brandName: 'FLIGHTSAVER',
    settingsTitle: 'Настройки и сервисы',
    accessibility: 'Доступность',
    highContrastMode: 'Режим для слабовидящих',
    highContrastDesc: 'Крупный шрифт 118% и контраст',
    currency: 'Валюта',
    language: 'Язык',
    servicesAndInfo: 'Сервисы и информация',
    stpcTitle: 'Бесплатные отели STPC',
    twovTitle: 'Безвизовый транзит TWOV',
    splitTitle: 'О технологии Split-Ticketing',
    headlineMain: 'Умный поиск перелётов',
    headlineSub: 'одной фразой',
    heroVoiceHint: 'Напишите или скажите голосом куда и когда вы хотите полететь',
    searchPlaceholder: 'Куда и когда вы хотите полететь? (например: В Бангкок из Москвы в ноябре на 2 недели)',
    searchListening: 'Слушаю вас... Говорите...',
    searchBtn: 'Найти билеты',
    newSearchBtn: 'Задать новый вопрос',
    
    // Auth & Personal Cabinet
    loginBtn: 'Войти',
    dashboardBtn: 'Личный кабинет',
    logoutBtn: 'Выйти',
    authTitle: 'Вход в FlightSaver',
    authSubtitle: 'Сохраняйте историю поиска, маршруты и бронирования',
    googleSignIn: 'Войти через Google в 1 клик',
    orEmail: 'или по электронной почте',
    emailPlaceholder: 'ivan@example.com',
    magicLinkBtn: 'Получить ссылку для входа',
    magicLinkSent: 'Ссылка для входа отправлена на ваш Email!',
    demoLoginBtn: 'Быстрый вход (Демо)',

    // Dashboard
    dashboardTitle: 'Личный кабинет путешественника',
    mySearchesTab: 'История поисков ИИ',
    myOrdersTab: 'Мои билеты и ваучеры',
    profileSettingsTab: 'Настройки профиля',
    noSearchesYet: 'Вы пока не совершали поисковых запросов',
    noOrdersYet: 'У вас пока нет оформленных заказов',
    repeatSearchBtn: 'Повторить поиск',
    downloadTicketBtn: 'Маршрутная квитанция (PDF)',
    hotelVoucherBtn: 'Ваучер отеля STPC (PDF)',
    backToHome: 'Вернуться на главную',

    // Chat Dialogue System
    aiChatBadge: 'ИИ Консьерж FlightSaver',
    aiChatMessage: '«Привет! Я подбираю прямые агентские билеты без наценок, нахожу бесплатные 4★ отели STPC при стыковках от 8ч и комбинирую рейсы с экономией до 50%. Нажмите на пример или напишите свой запрос:»',
    aiSearchingStatus: 'Ищу лучшие прямые и составные рейсы без наценок агрегаторов...',
    aiResultsFound: (count: number) => `Нашёл ${count} лучших варианта с максимальной экономией и комфортными пересадками:`,
    
    chatPrompt1User: 'Путешественник',
    chatPrompt1Title: 'Бангкок + Бесплатный 4★ отель',
    chatPrompt1Query: 'В Бангкок из Москвы с отелем STPC на 2 недели',
    chatPrompt1Badge: 'Бесплатный отель в Дубае • -39%',

    chatPrompt2User: 'Путешественник',
    chatPrompt2Title: 'Пхукет + Багаж 25 кг включен',
    chatPrompt2Query: 'На Пхукет с багажом на двоих до 120 000 ₽',
    chatPrompt2Badge: 'Прямая выписка сегментов • -41%',

    // Flight Card
    selectFlightBtn: 'Выбрать этот билет',
    fareDetailsBtn: 'Детали тарифа и экономии',
    savedText: 'Экономия',
    aggregatorPriceLabel: 'в обычных кассах',
    directIssuance: 'Прямая агентская выписка',
    hotelIncludedBadge: 'Бесплатный 4★ отель STPC',
    twovBadge: 'Безвизовый транзит TWOV',
    layoverText: (city: string, duration: string) => `Пересадка в ${city}: ${duration}`,

    footerCopyright: '© 2026 FlightSaver AI Travel. Умный поиск авиабилетов.',
    footerSupport: 'Поддержка 24/7',
    footerFares: 'Оптовые тарифы NDC/GDS',
    modalClose: 'Закрыть',
    modalSearchBtn: 'Подобрать такие рейсы',
  },
  en: {
    brandName: 'FLIGHTSAVER',
    settingsTitle: 'Settings & Services',
    accessibility: 'Accessibility',
    highContrastMode: 'High Contrast & Large Font',
    highContrastDesc: '118% larger text & bold borders',
    currency: 'Currency',
    language: 'Language',
    servicesAndInfo: 'Services & Information',
    stpcTitle: 'Free STPC Transit Hotels',
    twovTitle: 'Visa-Free Transit (TWOV)',
    splitTitle: 'About Split-Ticketing Tech',
    headlineMain: 'Smart Flight Search',
    headlineSub: 'in a single phrase',
    heroVoiceHint: 'Type or speak where and when you want to travel',
    searchPlaceholder: 'Where and when do you want to fly? (e.g., To Bangkok from Moscow in November for 2 weeks)',
    searchListening: 'Listening to your voice... Speak now...',
    searchBtn: 'Search Flights',
    newSearchBtn: 'Ask another question',
    
    // Auth & Personal Cabinet
    loginBtn: 'Sign In',
    dashboardBtn: 'Dashboard',
    logoutBtn: 'Sign Out',
    authTitle: 'Sign in to FlightSaver',
    authSubtitle: 'Save your AI search history, routes, and bookings',
    googleSignIn: 'Continue with Google in 1 click',
    orEmail: 'or via email address',
    emailPlaceholder: 'john@example.com',
    magicLinkBtn: 'Send Magic Sign-In Link',
    magicLinkSent: 'Magic sign-in link has been sent to your email!',
    demoLoginBtn: 'Instant Demo Login',

    // Dashboard
    dashboardTitle: 'Traveler Dashboard',
    mySearchesTab: 'AI Search History',
    myOrdersTab: 'My Tickets & Vouchers',
    profileSettingsTab: 'Profile Settings',
    noSearchesYet: 'No search history yet',
    noOrdersYet: 'No flight bookings yet',
    repeatSearchBtn: 'Search again',
    downloadTicketBtn: 'E-Ticket Itinerary (PDF)',
    hotelVoucherBtn: 'STPC Hotel Voucher (PDF)',
    backToHome: 'Back to Home',

    // Chat Dialogue System
    aiChatBadge: 'FlightSaver AI Concierge',
    aiChatMessage: '“Hello! I find direct wholesale airfares without markups, discover free 4★ STPC hotels for 8h+ layovers, and combine split-ticket segments saving you up to 50%. Pick an example or enter your route:”',
    aiSearchingStatus: 'Searching wholesale NDC/GDS airline fares with zero middleman fees...',
    aiResultsFound: (count: number) => `Found ${count} optimal itineraries with maximum savings and comfortable layovers:`,
    
    chatPrompt1User: 'Traveler',
    chatPrompt1Title: 'Bangkok + Free 4★ STPC Hotel',
    chatPrompt1Query: 'To Bangkok from Moscow with STPC hotel for 2 weeks',
    chatPrompt1Badge: 'Free hotel in Dubai • Save 39%',

    chatPrompt2User: 'Traveler',
    chatPrompt2Title: 'Phuket + 25kg Baggage Included',
    chatPrompt2Query: 'To Phuket with baggage for 2 up to $1,300',
    chatPrompt2Badge: 'Direct split-ticketing • Save 41%',

    // Flight Card
    selectFlightBtn: 'Select this flight',
    fareDetailsBtn: 'Price & savings breakdown',
    savedText: 'Saved',
    aggregatorPriceLabel: 'on regular sites',
    directIssuance: 'Direct agency ticketing',
    hotelIncludedBadge: 'Free 4★ STPC Hotel',
    twovBadge: 'Visa-free transit (TWOV)',
    layoverText: (city: string, duration: string) => `Layover in ${city}: ${duration}`,

    footerCopyright: '© 2026 FlightSaver AI Travel. Smart flight aggregator.',
    footerSupport: '24/7 Support',
    footerFares: 'Wholesale NDC/GDS fares',
    modalClose: 'Close',
    modalSearchBtn: 'Find these flights',
  },
};
