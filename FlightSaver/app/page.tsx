'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { AIInputBar } from '@/components/AIInputBar';
import { QuickSuggestions } from '@/components/QuickSuggestions';
import { FlightResultsList } from '@/components/FlightResultsList';
import { BookingModal } from '@/components/BookingModal';
import { InfoModal, InfoModalType } from '@/components/InfoModal';
import { parseTravelQuery } from '@/lib/nlpParser';
import { generateMockFlights } from '@/lib/mockFlights';
import { Flight, ParsedSearchParams, Currency, Language, BookingOrder } from '@/lib/types';
import { TRANSLATIONS, formatPrice, useI18n } from '@/lib/i18n';
import { addStoredSearch, addStoredOrder } from '@/lib/mockStorage';
import { CheckCircle2, Headphones, Lightbulb, User, RotateCcw } from 'lucide-react';

function HomeContent() {
  const searchParams = useSearchParams();
  const { lang: currentLanguage, setLang: setCurrentLanguage, t } = useI18n();

  const [query, setQuery] = useState<string>('');
  const [activeSearchQuery, setActiveSearchQuery] = useState<string | null>(null);
  const [parsedParams, setParsedParams] = useState<ParsedSearchParams | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentCurrency, setCurrentCurrency] = useState<Currency>('RUB');
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);

  // Info Modal state (STPC, TWOV, Split-Ticketing)
  const [activeInfoModal, setActiveInfoModal] = useState<InfoModalType>(null);

  // Agency Booking Modal state
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [bookingSuccessMessage, setBookingSuccessMessage] = useState<string | null>(null);

  // Sync Accessibility Mode (118% font size + high contrast borders on <html>)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('accessibility-mode', isHighContrast);
    }
  }, [isHighContrast]);

  // Check URL query param from Dashboard 1-click re-search
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== activeSearchQuery) {
      handlePerformSearch(q);
    }
  }, [searchParams]);

  const handlePerformSearch = (searchQuery: string) => {
    setIsLoading(true);
    setQuery(searchQuery);
    setActiveSearchQuery(searchQuery);

    // Auto-save to search history (Mock Storage / Supabase)
    addStoredSearch(searchQuery, 'text');

    setTimeout(() => {
      const parsed = parseTravelQuery(searchQuery);
      parsed.currency = currentCurrency;
      const results = generateMockFlights(parsed);

      setParsedParams(parsed);
      setFlights(results);
      setIsLoading(false);
    }, 400);
  };

  const handleResetSearch = () => {
    setActiveSearchQuery(null);
    setParsedParams(null);
    setFlights([]);
    setQuery('');
  };

  const handleSelectFlight = (flight: Flight) => {
    setSelectedFlight(flight);
    setIsBookingOpen(true);
  };

  const handleBookingComplete = (order: BookingOrder) => {
    // Auto-save booked order to Mock Storage / Supabase
    addStoredOrder({
      id: `ord-${Date.now()}`,
      pnr: order.pnr,
      route: `${order.flight.originCity} ➔ ${order.flight.destinationCity}`,
      airline: order.flight.segments.map((s) => s.airline).join(' + '),
      departureDate: order.flight.departureDate || 'Ноябрь 2026',
      totalPriceRub: order.flight.pricing.totalPrice,
      originalPriceRub: order.flight.pricing.marketPrice,
      savedAmountRub: order.flight.pricing.savedAmount,
      stpcHotelIncluded: !!order.flight.transit.stpcHotelIncluded,
      stpcHotelName: order.flight.transit.stpcDetails || undefined,
      status: 'confirmed',
    });

    const savedFormatted = formatPrice(order.flight.pricing.savedAmount, order.currency);
    setBookingSuccessMessage(
      currentLanguage === 'ru'
        ? `Заказ #${order.pnr} оформлен! Выписаны билеты ${order.flight.originCity} → ${order.flight.destinationCity}. Экономия: ${savedFormatted}.`
        : `Order #${order.pnr} confirmed! Tickets issued for ${order.flight.originCity} → ${order.flight.destinationCity}. Savings: ${savedFormatted}.`
    );
  };

  return (
    <div
      className="min-h-screen py-3 sm:py-4 px-2 sm:px-6 relative overflow-hidden flex flex-col justify-between"
    >
      {/* Soft Ambient Radial Lights */}
      <div className="ambient-glow-tl" />
      <div className="ambient-glow-br" />

      {/* Subtle Ambient Watermark */}
      <div className="bg-watermark">
        FLIGHTSAVER
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto w-full flex flex-col relative z-10">
        
        {/* Floating Minimalist Header (Logo + User Profile + Settings Dialog) */}
        <Header
          currentCurrency={currentCurrency}
          onCurrencyChange={(c) => {
            setCurrentCurrency(c);
            if (activeSearchQuery) {
              handlePerformSearch(activeSearchQuery);
            }
          }}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
          isHighContrast={isHighContrast}
          onToggleHighContrast={() => setIsHighContrast((prev) => !prev)}
          onOpenInfoModal={(modalType) => setActiveInfoModal(modalType)}
        />

        {/* Main Content Body */}
        <main className="flex-1 w-full px-1 sm:px-4 pt-3 sm:pt-6 pb-4 flex flex-col items-center">
          
          {/* Confirmed Booking Banner */}
          {bookingSuccessMessage && (
            <div className="w-full max-w-3xl mb-4 p-3.5 rounded-2xl bg-blue-600 text-white shadow-lg flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-sky-200" />
                <p className="text-sm font-semibold">
                  {bookingSuccessMessage}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingSuccessMessage(null)}
                className="text-xs font-bold uppercase px-3 py-1 bg-white/20 hover:bg-white/30 rounded-xl transition-all shrink-0"
              >
                {t.modalClose}
              </button>
            </div>
          )}

          {/* Hero Section (100% Normalized Cyrillic/Latin Typography) */}
          <section className="text-center w-full max-w-2xl mb-4 sm:mb-5">
            {/* Core Headline with Gradient Accent */}
            <h1 className="hero-headline-geometric text-slate-900 mb-2">
              {t.headlineMain} <br className="hidden sm:inline" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-sky-500">
                {t.headlineSub}
              </span>
            </h1>

            {/* Fixed 32px Hint Badge below Headline */}
            <div className="inline-flex items-center gap-2 h-auto min-h-[32px] py-1 px-4 rounded-full chat-pill-badge text-xs sm:text-sm font-medium text-slate-600 shadow-sm border border-white">
              <div className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center shrink-0 shadow-sm">
                <Lightbulb className="w-3 h-3 fill-slate-900" />
              </div>
              <span>{t.heroVoiceHint}</span>
            </div>
          </section>

          {/* AI Single Input Bar (min-h-[64px] Elastic Height) */}
          <section className="w-full">
            <AIInputBar
              initialQuery={query}
              onSearch={handlePerformSearch}
              isLoading={isLoading}
              language={currentLanguage}
            />
          </section>

          {/* Mode A: Initial Suggestions Dialogue (When no active search) */}
          {!activeSearchQuery && (
            <section className="w-full">
              <QuickSuggestions onSelectSuggestion={handlePerformSearch} language={currentLanguage} />
            </section>
          )}

          {/* Mode B: Seamless Conversational Stream (User Message -> AI Results) */}
          {activeSearchQuery && (
            <section className="w-full max-w-3xl mx-auto mt-6 space-y-4 animate-fadeIn">
              {/* Traveler Active Query Chat Bubble */}
              <div className="flex items-center justify-between pl-4 sm:pl-10">
                <div className="inline-flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
                  <div className="w-7 h-7 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold">
                    «{activeSearchQuery}»
                  </p>
                </div>

                {/* Reset / New Search Button */}
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.newSearchBtn}</span>
                </button>
              </div>

              {/* AI Results & Flight Cards Stream */}
              <FlightResultsList
                parsedParams={parsedParams}
                flights={flights}
                isLoading={isLoading}
                onSelectFlight={handleSelectFlight}
                currency={currentCurrency}
                language={currentLanguage}
              />
            </section>
          )}
        </main>

        {/* Crisp, Highly Readable Minimalist Footer with 3-Tier Hierarchy */}
        <footer className="w-full py-4 px-4 sm:px-6 text-center liquid-glass rounded-2xl sm:rounded-3xl mt-6 mb-3 border border-white/90 shadow-sm">
          <div className="max-w-xl mx-auto flex flex-col items-center justify-center gap-1.5">
            {/* 1. ПОДДЕРЖКА 24/7 (Blue accent in both standard and accessibility modes) */}
            <div className="support-blue inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold tracking-wide uppercase text-blue-600">
              <Headphones className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{t.footerSupport}</span>
            </div>

            {/* 2. Оптовые тарифы NDC/GDS */}
            <p className="text-xs sm:text-sm font-semibold text-slate-700">
              {t.footerFares}
            </p>

            {/* 3. © 2026 FlightSaver AI Travel. Умный поиск авиабилетов. */}
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed pt-1 border-t border-slate-200/60 w-full">
              {t.footerCopyright}
            </p>
          </div>
        </footer>
      </div>

      {/* 3x Smaller, Highly Legible Info Modal for STPC, TWOV, and Split-Ticketing */}
      <InfoModal
        type={activeInfoModal}
        isOpen={!!activeInfoModal}
        onClose={() => setActiveInfoModal(null)}
        onSelectScenario={handlePerformSearch}
        language={currentLanguage}
      />

      {/* In-House Agency Booking Checkout Modal */}
      <BookingModal
        flight={selectedFlight}
        passengersCount={parsedParams?.passengersCount || 1}
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onBookingComplete={handleBookingComplete}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
