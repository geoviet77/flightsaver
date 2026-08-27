import { PricingService } from '../pricingService';
import { FlightSegment, SplitTicketLegInput } from '@/types/pricing';

describe('PricingService & Split-Ticketing Economy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateFareBreakdown', () => {
    it('начисляет сервисный сбор 1 500 ₽ за сегмент для обычного пользователя', async () => {
      const breakdown = await PricingService.calculateFareBreakdown(
        10000,
        'RUB',
        2, // 2 сегмента
        { isClubMember: false, targetCurrency: 'RUB' }
      );

      expect(breakdown.serviceFeePerSegment).toBe(1500);
      expect(breakdown.totalServiceFee).toBe(3000);
      expect(breakdown.fxBufferAmount).toBe(0); // Одинаковая валюта -> 0 буфера
      expect(breakdown.finalPrice).toBe(13000); // 10 000 + 0 + 3 000
    });

    it('устанавливает сервисный сбор 0 ₽ для участника FlightSaver Club', async () => {
      const breakdown = await PricingService.calculateFareBreakdown(
        10000,
        'RUB',
        2,
        { isClubMember: true, targetCurrency: 'RUB' }
      );

      expect(breakdown.serviceFeePerSegment).toBe(0);
      expect(breakdown.totalServiceFee).toBe(0);
      expect(breakdown.finalPrice).toBe(10000);
    });

    it('применяет 1.5% FX-буфер при кросс-валютной конвертации', async () => {
      // 100 USD в RUB по базовому курсу 92.5
      // Net Fare Converted: 100 * 92.5 = 9 250 ₽
      // FX Buffer: 9 250 * 0.015 = 138.75 ₽
      // Service fee (1 segment, Standard): 1 500 ₽
      // Final: 9 250 + 138.75 + 1 500 = 10 888.75 ₽
      const breakdown = await PricingService.calculateFareBreakdown(
        100,
        'USD',
        1,
        { isClubMember: false, targetCurrency: 'RUB' }
      );

      expect(breakdown.netFareConverted).toBe(9250);
      expect(breakdown.fxBufferAmount).toBe(138.75);
      expect(breakdown.totalServiceFee).toBe(1500);
      expect(breakdown.finalPrice).toBe(10888.75);
    });
  });

  describe('evaluateSTPC', () => {
    it('активирует программу STPC для Emirates при стыковке от 8 до 24 часов', async () => {
      const segments: FlightSegment[] = [
        {
          airlineCode: 'EK',
          flightNumber: 'EK132',
          departureAirport: 'DME',
          arrivalAirport: 'DXB',
          departureTime: '2026-10-01T12:00:00Z',
          arrivalTime: '2026-10-01T17:30:00Z',
          layoverDurationMinutes: 600, // 10 часов
        },
      ];

      const stpc = await PricingService.evaluateSTPC(segments, 'USD');
      expect(stpc).not.toBeNull();
      expect(stpc?.eligible).toBe(true);
      expect(stpc?.airlineCode).toBe('EK');
      expect(stpc?.hotelValueEstimate).toBe(80);
    });

    it('отклоняет STPC, если стыковка менее 8 часов или более 24 часов', async () => {
      const segmentsShortLayover: FlightSegment[] = [
        {
          airlineCode: 'TK',
          flightNumber: 'TK414',
          departureAirport: 'VKO',
          arrivalAirport: 'IST',
          departureTime: '2026-10-01T12:00:00Z',
          arrivalTime: '2026-10-01T16:00:00Z',
          layoverDurationMinutes: 300, // 5 часов
        },
      ];

      const stpc = await PricingService.evaluateSTPC(segmentsShortLayover, 'USD');
      expect(stpc).toBeNull();
    });
  });

  describe('calculateSplitEconomy', () => {
    it('корректно рассчитывает положительную экономию Split-Ticketing + STPC', async () => {
      const benchmarkPrice = 60000; // Прямой билет: 60 000 ₽

      const splitLegs: SplitTicketLegInput[] = [
        {
          netFare: 20000,
          currency: 'RUB',
          segments: [
            {
              airlineCode: 'TK',
              flightNumber: 'TK414',
              departureAirport: 'VKO',
              arrivalAirport: 'IST',
              departureTime: '2026-10-01T12:00:00Z',
              arrivalTime: '2026-10-01T16:00:00Z',
              layoverDurationMinutes: 720, // 12 часов стыковка (STPC отель ~$80 = 7400 ₽)
            },
          ],
        },
        {
          netFare: 22000,
          currency: 'RUB',
          segments: [
            {
              airlineCode: 'TK',
              flightNumber: 'TK168',
              departureAirport: 'IST',
              arrivalAirport: 'HAN',
              departureTime: '2026-10-02T04:00:00Z',
              arrivalTime: '2026-10-02T16:00:00Z',
            },
          ],
        },
      ];

      const economy = await PricingService.calculateSplitEconomy(
        benchmarkPrice,
        'RUB',
        splitLegs,
        { isClubMember: false, targetCurrency: 'RUB' }
      );

      // Leg 1: 20 000 + 1 500 = 21 500 ₽
      // Leg 2: 22 000 + 1 500 = 23 500 ₽
      // Total Split: 45 000 ₽
      // Monetary Savings: 60 000 - 45 000 = 15 000 ₽
      // STPC Hotel Value ($80 * 92.5): 7 400 ₽
      // Total Economic Savings: 15 000 + 7 400 = 22 400 ₽

      expect(economy.splitRouteTotalPrice).toBe(45000);
      expect(economy.monetarySavings).toBe(15000);
      expect(economy.stpcInfo?.eligible).toBe(true);
      expect(economy.totalEconomicSavings).toBe(22400);
      expect(economy.isSplitAdvantageous).toBe(true);
    });

    it('обрабатывает случай невыгодного раздельного тарифа (отрицательная экономия)', async () => {
      const benchmarkPrice = 30000;
      const splitLegs: SplitTicketLegInput[] = [
        {
          netFare: 20000,
          currency: 'RUB',
          segments: [
            {
              airlineCode: 'SU',
              flightNumber: 'SU100',
              departureAirport: 'SVO',
              arrivalAirport: 'AER',
              departureTime: '2026-10-01T12:00:00Z',
              arrivalTime: '2026-10-01T16:00:00Z',
            },
          ],
        },
        {
          netFare: 15000,
          currency: 'RUB',
          segments: [
            {
              airlineCode: 'SU',
              flightNumber: 'SU101',
              departureAirport: 'AER',
              arrivalAirport: 'SVO',
              departureTime: '2026-10-10T12:00:00Z',
              arrivalTime: '2026-10-10T16:00:00Z',
            },
          ],
        },
      ];

      const economy = await PricingService.calculateSplitEconomy(
        benchmarkPrice,
        'RUB',
        splitLegs,
        { isClubMember: false, targetCurrency: 'RUB' }
      );

      // Split Total: (20000 + 1500) + (15000 + 1500) = 38 000 ₽
      // Benchmark: 30 000 ₽
      // Monetary Savings: -8 000 ₽
      expect(economy.splitRouteTotalPrice).toBe(38000);
      expect(economy.monetarySavings).toBe(-8000);
      expect(economy.totalEconomicSavings).toBe(-8000);
      expect(economy.isSplitAdvantageous).toBe(false);
    });
  });
});
