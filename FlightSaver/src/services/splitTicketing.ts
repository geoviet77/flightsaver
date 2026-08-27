import {
  Currency,
  FlightSegment,
  PricingCalculationRequest,
  SplitTicketComparison,
  ConnectionRiskAnalysis,
} from '@/types/pricing';
import { PricingService } from './pricing';
import { CurrencyConverter } from '@/lib/currency';

export class SplitTicketingEngine {
  // Минимальные безопасные интервалы пересадок при раздельных PNR (Self-Transfer)
  private static readonly MCT_SAME_AIRPORT_MINUTES = 180;      // 3 часа (получение и повторная сдача багажа)
  private static readonly MCT_INTER_AIRPORT_MINUTES = 360;     // 6 часов (смена аэропорта в одном городе)

  /**
   * Анализирует риски стыковки между раздельными билетами (Self-Transfer)
   */
  public static evaluateMCT(
    arrivalSegment: FlightSegment,
    nextDepartureSegment: FlightSegment
  ): ConnectionRiskAnalysis {
    const arrTime = new Date(arrivalSegment.arrivalTime).getTime();
    const depTime = new Date(nextDepartureSegment.departureTime).getTime();
    const layoverMinutes = Math.max(0, Math.floor((depTime - arrTime) / (1000 * 60)));

    const isDifferentAirport = arrivalSegment.arrivalAirport !== nextDepartureSegment.departureAirport;
    const requiredMCT = isDifferentAirport
      ? this.MCT_INTER_AIRPORT_MINUTES
      : this.MCT_SAME_AIRPORT_MINUTES;

    const warnings: string[] = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH_RISK' = 'LOW';

    warnings.push(
      'Раздельное бронирование (Self-Transfer): при опоздании первого рейса ответственность за стыковку несет пассажир.'
    );

    if (isDifferentAirport) {
      warnings.push(
        `Смена аэропорта: ${arrivalSegment.arrivalAirport} ➔ ${nextDepartureSegment.departureAirport}. Требуется получение багажа и трансфер.`
      );
    }

    if (layoverMinutes < requiredMCT) {
      riskLevel = 'HIGH_RISK';
      warnings.push(
        `Критически короткая пересадка: ${layoverMinutes} мин (рекомендуемый минимум: ${requiredMCT} мин).`
      );
    } else if (layoverMinutes < requiredMCT + 60) {
      riskLevel = 'MEDIUM';
      warnings.push(`Плотная пересадка (${layoverMinutes} мин). Рекомендуется путешествовать без багажа.`);
    }

    return {
      isSelfTransfer: true,
      transferDurationMinutes: layoverMinutes,
      minimumConnectingTimeMinutes: requiredMCT,
      isMCTCompliant: layoverMinutes >= requiredMCT,
      riskLevel,
      warnings,
    };
  }

  /**
   * Рассчитывает полную экономику split-маршрута и сравнивает ее со сквозным тарифом
   */
  public static calculateEconomics(request: PricingCalculationRequest): SplitTicketComparison {
    const { userTier, targetCurrency, standardItinerary, splitLegs, stpcBenefit } = request;

    // 1. Расчет стоимости раздельных билетов (Split Legs)
    let totalSplitCustomerPrice = 0;
    const calculatedLegs = splitLegs.map((leg) => {
      const breakdown = PricingService.calculateLegPrice(
        leg.netFare,
        leg.fareCurrency,
        targetCurrency,
        leg.segments.length,
        userTier
      );
      totalSplitCustomerPrice += breakdown.totalCustomerPrice;
      return {
        legId: leg.legId,
        breakdown,
      };
    });

    totalSplitCustomerPrice = Math.round(totalSplitCustomerPrice * 100) / 100;

    // 2. Расчет стоимости стандартного прямого/сквозного маршрута для бенчмарка
    let standardTotalPrice = 0;
    if (standardItinerary) {
      const standardBreakdown = PricingService.calculateLegPrice(
        standardItinerary.totalNetFare,
        standardItinerary.currency,
        targetCurrency,
        standardItinerary.segmentsCount,
        userTier
      );
      standardTotalPrice = standardBreakdown.totalCustomerPrice;
    } else {
      // При отсутствии сквозного бенчмарка берем базовую сумму плеч с коэффициентом +20%
      standardTotalPrice = Math.round(totalSplitCustomerPrice * 1.2 * 100) / 100;
    }

    // 3. Учет экономической ценности STPC Hotel (бесплатный отель авиакомпании)
    let stpcValueInTargetCurrency = 0;
    if (stpcBenefit && stpcBenefit.isEligible) {
      stpcValueInTargetCurrency = CurrencyConverter.convertPlain(
        stpcBenefit.hotelEstimatedValue.amount,
        stpcBenefit.hotelEstimatedValue.currency,
        targetCurrency
      );
    }

    // 4. Расчет суммарной экономии (Savings)
    const fareDifference = Math.max(
      0,
      Math.round((standardTotalPrice - totalSplitCustomerPrice) * 100) / 100
    );
    const totalEconomicBenefit = Math.round((fareDifference + stpcValueInTargetCurrency) * 100) / 100;
    const savingsPercentage =
      standardTotalPrice > 0
        ? Math.round((totalEconomicBenefit / standardTotalPrice) * 1000) / 10
        : 0;

    // 5. Валидация стыковки (MCT) между плечами
    let connectionRisk: ConnectionRiskAnalysis = {
      isSelfTransfer: false,
      transferDurationMinutes: 0,
      minimumConnectingTimeMinutes: 0,
      isMCTCompliant: true,
      riskLevel: 'LOW',
      warnings: [],
    };

    if (splitLegs.length >= 2) {
      const leg1Segments = splitLegs[0].segments;
      const leg2Segments = splitLegs[1].segments;

      if (leg1Segments.length > 0 && leg2Segments.length > 0) {
        const arrivalSeg = leg1Segments[leg1Segments.length - 1];
        const departureSeg = leg2Segments[0];
        connectionRisk = this.evaluateMCT(arrivalSeg, departureSeg);
      }
    }

    return {
      standardDirectOption: {
        totalPrice: standardTotalPrice,
        currency: targetCurrency,
        pnrCount: 1,
      },
      splitTicketOption: {
        legs: calculatedLegs,
        totalPrice: totalSplitCustomerPrice,
        currency: targetCurrency,
        pnrCount: splitLegs.length,
      },
      savings: {
        fareDifference,
        stpcHotelBenefitValue: stpcValueInTargetCurrency,
        totalEconomicBenefit,
        savingsPercentage,
      },
      connectionRisk,
    };
  }
}
