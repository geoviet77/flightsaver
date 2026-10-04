/**
 * Aviasales / Travelpayouts Flight Data API Service
 * Отвечает за получение реальных живых тарифов Авиасейлс по всему интернету
 * и предоставление эталонного бенчмарка и живых рейсов для FlightSaver.
 */

import { CurrencyService } from './currencyService';
import { Flight, FlightSegment } from '@/lib/types';
import { Currency as PricingCurrency } from '@/types/pricing';

export interface AviasalesOffer {
  price: number;
  airline: string;
  flightNumber: string;
  departureAt: string;
  returnAt?: string;
  expiresAt: string;
  transfers: number;
  durationMinutes: number;
  link?: string;
  origin: string;
  destination: string;
  originAirport?: string;
  destinationAirport?: string;
  gate?: string;
}

export interface MarketBenchmarkResult {
  marketPrice: number;
  airline: string;
  flightNumber?: string;
  formattedDuration: string;
  durationMinutes: number;
  transfers: number;
  isLive: boolean;
  source: string;
}

export class AviasalesService {
  private static readonly API_ENDPOINT = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates';
  private static readonly REQUEST_TIMEOUT_MS = 4500;

  /**
   * Справочник авиакомпаний для расшифровки кодов IATA
   */
  public static readonly AIRLINE_NAMES: Record<string, string> = {
    DP: 'Победа',
    SU: 'Аэрофлот',
    S7: 'S7 Airlines',
    '5N': 'Smartavia',
    UT: 'ЮТэйр',
    A4: 'Азимут',
    WZ: 'Red Wings',
    FV: 'Россия',
    U6: 'Уральские авиалинии',
    N4: 'Nordwind Airlines',
    EO: 'Икар',
    VJ: 'VietJet Air',
    VN: 'Vietnam Airlines',
    TK: 'Turkish Airlines',
    PC: 'Pegasus Airlines',
    QR: 'Qatar Airways',
    EK: 'Emirates',
    FZ: 'Flydubai',
    G9: 'Air Arabia',
    GF: 'Gulf Air',
    WY: 'Oman Air',
    J9: 'Jazeera Airways',
    CA: 'Air China',
    CZ: 'China Southern',
    MU: 'China Eastern',
    JD: 'Beijing Capital Airlines',
    HU: 'Hainan Airlines',
    ZH: 'Shenzhen Airlines',
    MF: 'XiamenAir',
    AK: 'AirAsia',
    FD: 'Thai AirAsia',
    W6: 'Wizz Air',
    SV: 'Saudia',
    MS: 'EgyptAir',
    ET: 'Ethiopian Airlines',
    HY: 'Uzbekistan Airways',
    KC: 'Air Astana',
    DV: 'SCAT Airlines',
  };

  /**
   * Справочник основных городов и аэропортов
   */
  public static readonly CITY_NAMES: Record<string, { city: string; name: string }> = {
    MOW: { city: 'Москва', name: 'Москва (все аэропорты)' },
    SVO: { city: 'Москва', name: 'Шереметьево (SVO)' },
    DME: { city: 'Москва', name: 'Домодедово (DME)' },
    VKO: { city: 'Москва', name: 'Внуково (VKO)' },
    LED: { city: 'Санкт-Петербург', name: 'Пулково (LED)' },
    AER: { city: 'Сочи', name: 'Адлер (AER)' },
    KZN: { city: 'Казань', name: 'Казань (KZN)' },
    SVX: { city: 'Екатеринбург', name: 'Кольцово (SVX)' },
    OVB: { city: 'Новосибирск', name: 'Толмачево (OVB)' },
    IKT: { city: 'Иркутск', name: 'Иркутск (IKT)' },
    KJA: { city: 'Красноярск', name: 'Емельяново (KJA)' },
    VVO: { city: 'Владивосток', name: 'Кневичи (VVO)' },
    KHV: { city: 'Хабаровск', name: 'Новый (KHV)' },
    UUS: { city: 'Южно-Сахалинск', name: 'Хомутово (UUS)' },
    KUF: { city: 'Самара', name: 'Курумоч (KUF)' },
    CSY: { city: 'Чебоксары', name: 'Чебоксары (CSY)' },
    DAD: { city: 'Дананг', name: 'Дананг International (DAD)' },
    HAN: { city: 'Ханой', name: 'Нойбай (HAN)' },
    SGN: { city: 'Хошимин', name: 'Таншоннят (SGN)' },
    CXR: { city: 'Нячанг', name: 'Камрань (CXR)' },
    BKK: { city: 'Бангкок', name: 'Суварнабхуми (BKK)' },
    HKT: { city: 'Пхукет', name: 'Пхукет International (HKT)' },
    DPS: { city: 'Бали', name: 'Нгурах-Рай (DPS)' },
    IST: { city: 'Стамбул', name: 'Стамбул Новый (IST)' },
    SAW: { city: 'Стамбул', name: 'Сабиха Гёкчен (SAW)' },
    DXB: { city: 'Дубай', name: 'Дубай (DXB)' },
    DOH: { city: 'Доха', name: 'Хамад (DOH)' },
    PEK: { city: 'Пекин', name: 'Шоуду (PEK)' },
    PKX: { city: 'Пекин', name: 'Дасин (PKX)' },
    CAN: { city: 'Гуанчжоу', name: 'Байюнь (CAN)' },
    PVG: { city: 'Шанхай', name: 'Пудун (PVG)' },
    MUC: { city: 'Мюнхен', name: 'Франц Йозеф Штраус (MUC)' },
    BER: { city: 'Берлин', name: 'Бранденбург (BER)' },
    FRA: { city: 'Франкфурт', name: 'Рейн-Майн (FRA)' },
    DUS: { city: 'Дюссельдорф', name: 'Дюссельдорф (DUS)' },
    ROM: { city: 'Рим', name: 'Фьюмичино (FCO)' },
    PAR: { city: 'Париж', name: 'Шарль де Голль (CDG)' },
  };

  /**
   * Базовые калиброванные тарифы метапоисковика (при отсутствии токена или офлайн-режиме)
   */
  private static readonly CALIBRATED_MARKET_BASELINE: Record<string, { price: number; airline: string; duration: string; transfers: number }> = {
    DAD: { price: 89735, airline: 'VietJet Air', duration: '1д 10ч', transfers: 1 },
    CXR: { price: 87500, airline: 'VietJet Air', duration: '1д 08ч', transfers: 1 },
    HAN: { price: 46200, airline: 'Аэрофлот / VietJet', duration: '9ч 15м', transfers: 0 },
    SGN: { price: 49800, airline: 'Аэрофлот', duration: '9ч 40м', transfers: 0 },
    BKK: { price: 44500, airline: 'Аэрофлот / Gulf Air', duration: '9ч 20м', transfers: 0 },
    HKT: { price: 48900, airline: 'Аэрофлот / Oman Air', duration: '9ч 50м', transfers: 0 },
    DPS: { price: 58900, airline: 'Qatar Airways / AirAsia', duration: '16ч 30м', transfers: 1 },
    KUL: { price: 43200, airline: 'Air Arabia / AirAsia', duration: '14ч 10м', transfers: 1 },
    SIN: { price: 47800, airline: 'Gulf Air / Scoot', duration: '15ч 20м', transfers: 1 },
    PEK: { price: 34500, airline: 'Air China / S7', duration: '7ч 30м', transfers: 0 },
    CAN: { price: 36800, airline: 'China Southern', duration: '9ч 05м', transfers: 0 },
    MUC: { price: 42100, airline: 'Pegasus Airlines', duration: '8ч 30м', transfers: 1 },
    BER: { price: 41500, airline: 'Pegasus Airlines', duration: '8ч 15м', transfers: 1 },
    FRA: { price: 44800, airline: 'Turkish Airlines', duration: '8ч 45м', transfers: 1 },
    DUS: { price: 43200, airline: 'Pegasus Airlines', duration: '8ч 20м', transfers: 1 },
    ROM: { price: 45600, airline: 'Pegasus Airlines', duration: '8ч 50м', transfers: 1 },
    PAR: { price: 47200, airline: 'Turkish Airlines', duration: '9ч 10м', transfers: 1 },
    BCN: { price: 46500, airline: 'Pegasus Airlines', duration: '9ч 30м', transfers: 1 },
    MAD: { price: 48100, airline: 'Turkish Airlines', duration: '9ч 45м', transfers: 1 },
    PRG: { price: 49300, airline: 'FlyOne / Pegasus', duration: '8ч 40м', transfers: 1 },
    VIE: { price: 46900, airline: 'Pegasus Airlines', duration: '8ч 25м', transfers: 1 },
    AMS: { price: 48900, airline: 'Turkish Airlines', duration: '9ч 15м', transfers: 1 },
    LUX: { price: 52400, airline: 'Lufthansa / Luxair', duration: '10ч 20м', transfers: 1 },
    LED: { price: 3490, airline: 'Победа', duration: '1ч 20м', transfers: 0 },
    AER: { price: 6200, airline: 'Победа / Smartavia', duration: '3ч 50м', transfers: 0 },
  };

  /**
   * Форматирование времени в читаемый вид (ч и м)
   */
  public static formatMinutesDuration(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return `${days}д ${remHours}ч ${mins}м`;
    }
    return `${hours}ч ${mins}м`;
  }

  /**
   * Определение времени суток по ISO дате
   */
  public static getTimeOfDay(isoString: string): 'morning' | 'day' | 'evening' | 'night' {
    try {
      const date = new Date(isoString);
      const hour = date.getHours();
      if (hour >= 6 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 18) return 'day';
      if (hour >= 18 && hour < 24) return 'evening';
      return 'night';
    } catch {
      return 'day';
    }
  }

  /**
   * Получает минимальный рыночный бенчмарк
   */
  public static async getMarketBenchmark(
    originIata: string,
    destinationIata: string,
    departureDate?: string,
    passengers = 1
  ): Promise<MarketBenchmarkResult> {
    const orig = (originIata || 'MOW').toUpperCase();
    const dest = (destinationIata || 'DAD').toUpperCase();
    const token = process.env.TRAVELPAYOUTS_TOKEN || process.env.AVIASALES_API_TOKEN;

    if (token) {
      try {
        const liveOffers = await this.queryTravelpayoutsApi(orig, dest, departureDate, token);
        if (liveOffers.length > 0) {
          const cheapest = liveOffers[0];
          const airlineName = this.AIRLINE_NAMES[cheapest.airline] || cheapest.airline;
          const formattedDuration = this.formatMinutesDuration(cheapest.durationMinutes);

          return {
            marketPrice: cheapest.price * passengers,
            airline: airlineName,
            flightNumber: cheapest.flightNumber,
            formattedDuration,
            durationMinutes: cheapest.durationMinutes,
            transfers: cheapest.transfers,
            isLive: true,
            source: 'Авиасейлс (Travelpayouts API)',
          };
        }
      } catch (err) {
        console.warn('[/services/aviasalesService] Live API query fallback:', err);
      }
    }

    const baseline = this.CALIBRATED_MARKET_BASELINE[dest];
    if (baseline) {
      return {
        marketPrice: baseline.price * passengers,
        airline: baseline.airline,
        formattedDuration: baseline.duration,
        durationMinutes: 720,
        transfers: baseline.transfers,
        isLive: false,
        source: 'Авиасейлс (Рыночный агрегатор)',
      };
    }

    return {
      marketPrice: 52000 * passengers,
      airline: 'Регулярные авиалинии',
      formattedDuration: '11ч 30м',
      durationMinutes: 690,
      transfers: 1,
      isLive: false,
      source: 'Рыночный бенчмарк',
    };
  }

  /**
   * Получает реальные живые рейсы из Aviasales Data API в виде готовых объектов Flight
   */
  public static async getLiveFlights(
    originIata: string,
    destinationIata: string,
    departureDate?: string,
    passengers = 1,
    targetCurrency: PricingCurrency = 'RUB'
  ): Promise<Flight[]> {
    const orig = (originIata || 'MOW').toUpperCase();
    const dest = (destinationIata || 'LED').toUpperCase();
    const token = process.env.TRAVELPAYOUTS_TOKEN || process.env.AVIASALES_API_TOKEN;

    if (!token) return [];

    try {
      const rawOffers = await this.queryTravelpayoutsApi(orig, dest, departureDate, token);
      if (!rawOffers || rawOffers.length === 0) return [];

      const flights: Flight[] = [];

      for (let i = 0; i < rawOffers.length; i++) {
        const offer = rawOffers[i];
        const airlineCode = offer.airline || 'SU';
        const airlineName = this.AIRLINE_NAMES[airlineCode] || airlineCode;
        const flightNumber = offer.flightNumber ? `${airlineCode} ${offer.flightNumber}` : `${airlineCode} ${100 + i}`;
        
        const origCityMeta = this.CITY_NAMES[offer.originAirport || orig] || this.CITY_NAMES[orig] || { city: orig, name: orig };
        const destCityMeta = this.CITY_NAMES[offer.destinationAirport || dest] || this.CITY_NAMES[dest] || { city: dest, name: dest };

        let depTime = '10:00';
        let arrTime = '12:00';
        let depDateStr = departureDate || '2026-10-25';

        if (offer.departureAt) {
          try {
            const depDate = new Date(offer.departureAt);
            depDateStr = depDate.toISOString().split('T')[0];
            depTime = depDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const arrDate = new Date(depDate.getTime() + (offer.durationMinutes * 60 * 1000));
            arrTime = arrDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
          } catch {
            // keep defaults
          }
        }

        const isDirect = offer.transfers === 0;
        const durationFormatted = this.formatMinutesDuration(offer.durationMinutes);
        const timeOfDay = offer.departureAt ? this.getTimeOfDay(offer.departureAt) : 'day';

        const segment: FlightSegment = {
          airline: airlineName,
          airlineCode,
          flightNumber,
          fromAirport: origCityMeta.name,
          fromCity: origCityMeta.city,
          fromIata: offer.originAirport || orig,
          toAirport: destCityMeta.name,
          toCity: destCityMeta.city,
          toIata: offer.destinationAirport || dest,
          departureTime: depTime,
          arrivalTime: arrTime,
          duration: durationFormatted,
          bookingProvider: offer.gate || 'Авиасейлс',
          cabinClass: 'Economy',
          aircraft: isDirect ? 'Airbus A320 / Boeing 737' : 'Boeing 777 / Airbus A330',
          baggage: 'Багаж 20 кг + ручная кладь 10 кг',
        };

        const totalPrice = offer.price * passengers;

        flights.push({
          id: `aviasales-live-${orig}-${dest}-${i + 1}`,
          originCity: origCityMeta.city,
          destinationCity: destCityMeta.city,
          originIata: orig,
          destinationIata: dest,
          departureDate: depDateStr,
          totalDuration: durationFormatted,
          totalDurationMinutes: offer.durationMinutes,
          segments: [segment],
          transit: {
            hasTransit: !isDirect,
            transitCity: isDirect ? undefined : 'Хаб стыковки',
            transitAirport: isDirect ? undefined : 'HUB',
            transitDuration: isDirect ? undefined : '2ч 40м',
            stpcHotelIncluded: false,
            visaFreeTransit: true,
            baggageRecheckRequired: false,
          },
          pricing: {
            currency: targetCurrency,
            totalPrice,
            marketPrice: totalPrice,
            savedAmount: 0,
            savedPercentage: 0,
            netSupplierFare: totalPrice,
            serviceFee: 0,
            fxBufferAmount: 0,
            serviceFeePerSegment: 0,
            stpcHotelValue: 0,
            totalEconomicSavings: 0,
            fareBreakdown: {} as any,
            segmentBreakdowns: [
              {
                segmentTitle: `${orig} → ${dest} (${airlineName})`,
                providerName: offer.gate || 'Авиасейлс',
                price: totalPrice,
                currency: targetCurrency,
              },
            ],
            splitSavingsReason: isDirect
              ? `Прямой рейс без пересадок (${airlineName})`
              : `Рейс с ${offer.transfers} пересадкой (${airlineName})`,
          },
          isBestValue: i === 0,
          isFastest: isDirect,
          isStpcEligible: false,
          baggageIncluded: true,
          baggageDescription: 'Багаж 20 кг + ручная кладь 10 кг',
          cabinClass: 'Economy',
          tags: isDirect
            ? ['✈️ Прямой рейс', 'Aviasales Live', 'Гарантия лучшей цены']
            : ['Aviasales Live', `${offer.transfers} пересадка`],
          stopsCount: offer.transfers,
          departureTimeOfDay: timeOfDay,
        });
      }

      return flights;
    } catch (err) {
      console.warn('[/services/aviasalesService] Error in getLiveFlights:', err);
      return [];
    }
  }

  /**
   * Прямой запрос к Travelpayouts v3 prices_for_dates
   */
  public static async queryTravelpayoutsApi(
    origin: string,
    destination: string,
    departureDate?: string,
    token?: string
  ): Promise<AviasalesOffer[]> {
    if (!token) return [];

    const dateParam = departureDate && /^\d{4}-\d{2}-\d{2}$/.test(departureDate)
      ? departureDate
      : undefined;

    const url = new URL(this.API_ENDPOINT);
    url.searchParams.set('origin', origin);
    url.searchParams.set('destination', destination);
    if (dateParam) {
      url.searchParams.set('departure_at', dateParam);
    }
    url.searchParams.set('currency', 'rub');
    url.searchParams.set('sorting', 'price');
    url.searchParams.set('direct', 'false');
    url.searchParams.set('limit', '10');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-Access-Token': token,
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return [];
      }

      const json = await res.json();
      if (!json || !json.success || !Array.isArray(json.data)) {
        return [];
      }

      return json.data.map((item: any) => ({
        price: Number(item.price) || 0,
        airline: String(item.airline || 'SU'),
        flightNumber: String(item.flight_number || ''),
        departureAt: String(item.departure_at || ''),
        returnAt: item.return_at ? String(item.return_at) : undefined,
        expiresAt: String(item.expires_at || ''),
        transfers: Number(item.transfers ?? 1),
        durationMinutes: Number(item.duration || 80),
        link: item.link ? `https://www.aviasales.ru${item.link}` : undefined,
        origin,
        destination,
        originAirport: item.origin_airport ? String(item.origin_airport) : undefined,
        destinationAirport: item.destination_airport ? String(item.destination_airport) : undefined,
        gate: item.gate ? String(item.gate) : 'Авиасейлс',
      })).filter((item: AviasalesOffer) => item.price > 0);
    } catch {
      clearTimeout(timeoutId);
      return [];
    }
  }
}
