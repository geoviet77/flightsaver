import { Currency } from '@/types/pricing';

export const FX_SAFETY_BUFFER_PERCENT = 0.015; // 1.5% валютный буфер защиты

// Базовые курсы (при необходимости обновляются через API ЦБ/ЕЦБ с фоновым кэшем)
const BASE_RATES_TO_RUB: Record<Currency, number> = {
  RUB: 1.0,
  USD: 91.5,
  EUR: 99.2,
  VND: 0.0036,
};

export class CurrencyConverter {
  /**
   * Конвертирует сумму в целевую валюту с учетом 1.5% защитного FX-буфера.
   */
  public static convertWithBuffer(
    amount: number,
    from: Currency,
    to: Currency,
    applyBuffer: boolean = true
  ): { convertedAmount: number; fxBufferAmount: number; baseConverted: number } {
    if (from === to) {
      const fxBuffer = applyBuffer ? Math.round(amount * FX_SAFETY_BUFFER_PERCENT * 100) / 100 : 0;
      return {
        convertedAmount: amount + fxBuffer,
        fxBufferAmount: fxBuffer,
        baseConverted: amount,
      };
    }

    // Приведение к RUB как базовой валюте
    const inRub = amount * BASE_RATES_TO_RUB[from];
    const baseTarget = inRub / BASE_RATES_TO_RUB[to];

    const fxBuffer = applyBuffer ? baseTarget * FX_SAFETY_BUFFER_PERCENT : 0;
    const finalAmount = Math.round((baseTarget + fxBuffer) * 100) / 100;

    return {
      convertedAmount: finalAmount,
      fxBufferAmount: Math.round(fxBuffer * 100) / 100,
      baseConverted: Math.round(baseTarget * 100) / 100,
    };
  }

  /**
   * Конвертирует произвольную сумму без буфера (для расчета номинальной ценности)
   */
  public static convertPlain(amount: number, from: Currency, to: Currency): number {
    if (from === to) return amount;
    const inRub = amount * BASE_RATES_TO_RUB[from];
    return Math.round((inRub / BASE_RATES_TO_RUB[to]) * 100) / 100;
  }
}
