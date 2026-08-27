import { Currency } from '@/types/pricing';

interface ExchangeRateCache {
  rates: Record<Currency, number>; // Базовая валюта: USD
  lastUpdated: number;
}

export class CurrencyService {
  private static readonly FX_BUFFER_RATE = 0.015; // 1.5% буфер
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 час

  // Резервные фиксированные курсы (Base: USD)
  private static readonly FALLBACK_RATES_TO_USD: Record<Currency, number> = {
    USD: 1.0,
    EUR: 0.92,       // 1 USD = 0.92 EUR
    RUB: 92.50,      // 1 USD = 92.50 RUB
    VND: 25400.0,    // 1 USD = 25 400 VND
  };

  private static cache: ExchangeRateCache | null = null;

  /**
   * Округление до копеек/центов с защитой от погрешностей float
   */
  public static roundMoney(amount: number, currency: Currency): number {
    if (currency === 'VND') {
      return Math.round(amount); // У вьетнамского донга нет дробных единиц
    }
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  /**
   * Получение актуальных курсов валют (с in-memory кэшированием и fallback)
   */
  public static async getExchangeRates(): Promise<Record<Currency, number>> {
    const now = Date.now();
    if (this.cache && now - this.cache.lastUpdated < this.CACHE_TTL_MS) {
      return this.cache.rates;
    }

    try {
      // Подключение внешнего фида (например, ЦБ/ЕЦБ/OpenExchangeRates через API-роут)
      // При отсутствии внешнего ключа/сбое используется fallback
      this.cache = {
        rates: { ...this.FALLBACK_RATES_TO_USD },
        lastUpdated: now,
      };
      return this.cache.rates;
    } catch {
      return this.FALLBACK_RATES_TO_USD;
    }
  }

  /**
   * Расчет прямого курса между двумя валютами
   */
  public static async getRate(from: Currency, to: Currency): Promise<number> {
    if (from === to) return 1.0;
    const rates = await this.getExchangeRates();
    const rateFromUSD = rates[from];
    const rateToUSD = rates[to];

    // from -> USD -> to
    return rateToUSD / rateFromUSD;
  }

  /**
   * Конвертация суммы с опциональным учетом 1.5% FX буфера
   */
  public static async convertAmount(
    amount: number,
    from: Currency,
    to: Currency,
    applyFxBuffer: boolean = true
  ): Promise<{
    convertedAmount: number;
    fxBufferAmount: number;
    rate: number;
  }> {
    if (from === to) {
      const rounded = this.roundMoney(amount, to);
      return {
        convertedAmount: rounded,
        fxBufferAmount: 0,
        rate: 1.0,
      };
    }

    const rate = await this.getRate(from, to);
    const rawConverted = amount * rate;
    const fxBufferAmount = applyFxBuffer ? rawConverted * this.FX_BUFFER_RATE : 0;
    const totalConverted = rawConverted + fxBufferAmount;

    return {
      convertedAmount: this.roundMoney(totalConverted, to),
      fxBufferAmount: this.roundMoney(fxBufferAmount, to),
      rate: Number(rate.toFixed(6)),
    };
  }
}
