import { Currency, UserTier, PriceBreakdown } from '@/types/pricing';
import { CurrencyConverter } from '@/lib/currency';

export const STANDARD_SERVICE_FEE_RUB_PER_SEGMENT = 1500;

export class PricingService {
  /**
   * Вычисляет полную стоимость билета / плеча:
   * Net Fare + 1.5% FX Buffer + Сервисный сбор (1500 ₽ за сегмент, 0 ₽ для Club)
   */
  public static calculateLegPrice(
    netFare: number,
    fareCurrency: Currency,
    targetCurrency: Currency,
    segmentCount: number,
    userTier: UserTier
  ): PriceBreakdown {
    // 1. Конвертация базового тарифа с FX-буфером 1.5%
    const { convertedAmount: netWithBuffer, fxBufferAmount, baseConverted } =
      CurrencyConverter.convertWithBuffer(netFare, fareCurrency, targetCurrency, true);

    // 2. Расчет сервисного сбора (0 ₽ для подписчиков Club)
    const feePerSegmentRub = userTier === 'club' ? 0 : STANDARD_SERVICE_FEE_RUB_PER_SEGMENT;
    const totalFeeRub = feePerSegmentRub * segmentCount;

    // Конвертация сбора в целевую валюту пользователя
    const totalServiceFeeTarget = CurrencyConverter.convertPlain(totalFeeRub, 'RUB', targetCurrency);
    const feePerSegmentTarget = segmentCount > 0 ? totalServiceFeeTarget / segmentCount : 0;

    const totalCustomerPrice = Math.round((netWithBuffer + totalServiceFeeTarget) * 100) / 100;

    return {
      currency: targetCurrency,
      netFare: baseConverted,
      fxBufferAmount,
      serviceFeePerSegment: Math.round(feePerSegmentTarget * 100) / 100,
      totalServiceFee: Math.round(totalServiceFeeTarget * 100) / 100,
      totalCustomerPrice,
    };
  }
}
