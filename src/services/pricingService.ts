import {
  Currency,
  FareBreakdown,
  FlightSegment,
  PricingOptions,
  SplitTicketEconomyResult,
  SplitTicketLegInput,
  STPCAirlineCode,
  STPCProgramInfo,
  STPC_AIRLINES,
} from '@/types/pricing';
import { CurrencyService } from './currencyService';

export class PricingService {
  public static readonly STANDARD_SERVICE_FEE_RUB = 1500; // 1 500 ₽ за сегмент
  public static readonly CLUB_SERVICE_FEE_RUB = 0;        // 0 ₽ для FlightSaver Club
  public static readonly DEFAULT_STPC_HOTEL_VALUE_USD = 80; // $80 эквивалент 4★ отеля

  /**
   * Расчет итоговой стоимости тарифа по формуле:
   * Final Price = Net Fare + FX Buffer (1.5%) + Service Fee
   */
  public static async calculateFareBreakdown(
    netFareOriginal: number,
    originalCurrency: Currency,
    segmentCount: number,
    options: PricingOptions
  ): Promise<FareBreakdown> {
    const { isClubMember, targetCurrency } = options;

    // 1. Конвертация базового тарифа с FX-буфером 1.5%
    const isCrossCurrency = originalCurrency !== targetCurrency;
    const conversion = await CurrencyService.convertAmount(
      netFareOriginal,
      originalCurrency,
      targetCurrency,
      isCrossCurrency
    );

    const netFareConverted = CurrencyService.roundMoney(
      netFareOriginal * conversion.rate,
      targetCurrency
    );

    // 2. Расчет сервисного сбора
    const baseFeeRub = isClubMember
      ? this.CLUB_SERVICE_FEE_RUB
      : this.STANDARD_SERVICE_FEE_RUB;

    let serviceFeePerSegment = baseFeeRub;
    if (targetCurrency !== 'RUB') {
      const feeConversion = await CurrencyService.convertAmount(
        baseFeeRub,
        'RUB',
        targetCurrency,
        false
      );
      serviceFeePerSegment = feeConversion.convertedAmount;
    }

    const totalServiceFee = CurrencyService.roundMoney(
      serviceFeePerSegment * segmentCount,
      targetCurrency
    );

    // 3. Итоговая стоимость
    const finalPrice = CurrencyService.roundMoney(
      netFareConverted + conversion.fxBufferAmount + totalServiceFee,
      targetCurrency
    );

    return {
      originalCurrency,
      targetCurrency,
      netFareOriginal: CurrencyService.roundMoney(netFareOriginal, originalCurrency),
      netFareConverted,
      fxBufferAmount: conversion.fxBufferAmount,
      fxRateUsed: conversion.rate,
      serviceFeePerSegment,
      segmentCount,
      totalServiceFee,
      finalPrice,
    };
  }

  /**
   * Оценка соответствия сегментов программе STPC (бесплатный отель при стыковке 8-24ч)
   */
  public static async evaluateSTPC(
    segments: FlightSegment[],
    targetCurrency: Currency
  ): Promise<STPCProgramInfo | null> {
    for (const segment of segments) {
      const airline = segment.airlineCode.toUpperCase() as STPCAirlineCode;
      const isEligibleAirline = STPC_AIRLINES.includes(airline);

      const layoverMin = segment.layoverDurationMinutes || 0;
      const layoverHours = layoverMin / 60;

      // Критерий STPC: авиакомпания из пула и стыковка от 8 до 24 часов
      if (isEligibleAirline && layoverHours >= 8 && layoverHours <= 24) {
        const hotelConversion = await CurrencyService.convertAmount(
          this.DEFAULT_STPC_HOTEL_VALUE_USD,
          'USD',
          targetCurrency,
          false
        );

        return {
          eligible: true,
          airlineCode: airline,
          layoverDurationHours: Number(layoverHours.toFixed(1)),
          hotelValueEstimate: hotelConversion.convertedAmount,
          currency: targetCurrency,
          details: `Бесплатный отель 4★ по программе STPC от авиакомпании ${airline} (стыковка ${layoverHours.toFixed(1)}ч в хабе).`,
        };
      }
    }

    return null;
  }

  /**
   * Расчет чистой экономики Split-Ticketing:
   * Total Savings = (Direct/Target Benchmark Price - Split Route Total Price) + STPC Hotel Value
   */
  public static async calculateSplitEconomy(
    directBenchmarkPrice: number,
    directBenchmarkCurrency: Currency,
    splitLegs: SplitTicketLegInput[],
    options: PricingOptions,
    userTargetInfo?: { userTargetPrice?: number; userTargetSource?: string }
  ): Promise<SplitTicketEconomyResult> {
    const { targetCurrency } = options;

    const hasUserTarget = Boolean(userTargetInfo?.userTargetPrice && userTargetInfo.userTargetPrice > 0);
    const rawBenchmarkPrice = hasUserTarget ? userTargetInfo!.userTargetPrice! : directBenchmarkPrice;
    const rawBenchmarkCurrency = hasUserTarget ? targetCurrency : directBenchmarkCurrency;

    // Конвертация цены прямого маршрута / цены пользователя в целевую валюту
    const benchmarkConversion = await CurrencyService.convertAmount(
      rawBenchmarkPrice,
      rawBenchmarkCurrency,
      targetCurrency,
      false
    );
    const benchmarkInTargetCurrency = benchmarkConversion.convertedAmount;

    // Расчет каждого плеча составного маршрута
    const calculatedLegs = [];
    let splitRouteTotalPrice = 0;
    const allSegments: FlightSegment[] = [];

    for (const leg of splitLegs) {
      const breakdown = await this.calculateFareBreakdown(
        leg.netFare,
        leg.currency,
        leg.segments.length,
        options
      );

      splitRouteTotalPrice += breakdown.finalPrice;
      allSegments.push(...leg.segments);

      calculatedLegs.push({
        fareBreakdown: breakdown,
        segments: leg.segments,
      });
    }

    splitRouteTotalPrice = CurrencyService.roundMoney(
      splitRouteTotalPrice,
      targetCurrency
    );

    // Оценка STPC
    const stpcInfo = await this.evaluateSTPC(allSegments, targetCurrency);
    const stpcHotelValue = stpcInfo ? stpcInfo.hotelValueEstimate : 0;

    // Чистая финансовая выгода
    const monetarySavings = CurrencyService.roundMoney(
      benchmarkInTargetCurrency - splitRouteTotalPrice,
      targetCurrency
    );

    const totalEconomicSavings = CurrencyService.roundMoney(
      monetarySavings + stpcHotelValue,
      targetCurrency
    );

    const savingsPercentage =
      benchmarkInTargetCurrency > 0
        ? Number(((totalEconomicSavings / benchmarkInTargetCurrency) * 100).toFixed(2))
        : 0;

    const benchmarkType: 'gds_through_fare' | 'user_target' = hasUserTarget ? 'user_target' : 'gds_through_fare';
    const benchmarkLabel = hasUserTarget
      ? `Ваша цена на ${userTargetInfo?.userTargetSource || 'стороннем сайте'}`
      : 'Сквозной тариф GDS (Единый билет)';

    return {
      targetCurrency,
      directBenchmarkPrice: benchmarkInTargetCurrency,
      splitRouteTotalPrice,
      legs: calculatedLegs,
      monetarySavings,
      savingsPercentage,
      stpcInfo,
      totalEconomicSavings,
      isSplitAdvantageous: totalEconomicSavings > 0,
      benchmarkType,
      benchmarkLabel,
      userTargetPrice: userTargetInfo?.userTargetPrice,
      userTargetSource: userTargetInfo?.userTargetSource,
    };
  }
}

