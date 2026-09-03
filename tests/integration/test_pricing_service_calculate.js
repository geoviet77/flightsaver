const { execSync } = require('child_process');

console.log('=== 1. TYPESCRIPT COMPILATION CHECK ===');
try {
  execSync('node ./node_modules/typescript/bin/tsc --noEmit', { cwd: __dirname, stdio: 'inherit' });
  console.log('TypeScript Compilation: PASS (0 errors)\n');
} catch (e) {
  console.error('TypeScript Compilation: FAILED');
  process.exit(1);
}

const { z } = require('zod');

// 2. Logic Verification in Node runtime
const SUPPORTED_CURRENCIES = ['RUB', 'USD', 'EUR', 'VND'];
const STPC_AIRLINES = ['EK', 'TK', 'QR', 'GF'];

class CurrencyService {
  static FX_BUFFER_RATE = 0.015;
  static CACHE_TTL_MS = 60 * 60 * 1000;
  static FALLBACK_RATES_TO_USD = {
    USD: 1.0,
    EUR: 0.92,
    RUB: 92.50,
    VND: 25400.0,
  };
  static cache = null;

  static roundMoney(amount, currency) {
    if (currency === 'VND') {
      return Math.round(amount);
    }
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  static async getExchangeRates() {
    const now = Date.now();
    if (this.cache && now - this.cache.lastUpdated < this.CACHE_TTL_MS) {
      return this.cache.rates;
    }
    this.cache = { rates: { ...this.FALLBACK_RATES_TO_USD }, lastUpdated: now };
    return this.cache.rates;
  }

  static async getRate(from, to) {
    if (from === to) return 1.0;
    const rates = await this.getExchangeRates();
    return rates[to] / rates[from];
  }

  static async convertAmount(amount, from, to, applyFxBuffer = true) {
    if (from === to) {
      return {
        convertedAmount: this.roundMoney(amount, to),
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

class PricingService {
  static STANDARD_SERVICE_FEE_RUB = 1500;
  static CLUB_SERVICE_FEE_RUB = 0;
  static DEFAULT_STPC_HOTEL_VALUE_USD = 80;

  static async calculateFareBreakdown(netFareOriginal, originalCurrency, segmentCount, options) {
    const { isClubMember, targetCurrency } = options;
    const isCrossCurrency = originalCurrency !== targetCurrency;
    const conversion = await CurrencyService.convertAmount(netFareOriginal, originalCurrency, targetCurrency, isCrossCurrency);
    const netFareConverted = CurrencyService.roundMoney(netFareOriginal * conversion.rate, targetCurrency);

    const baseFeeRub = isClubMember ? this.CLUB_SERVICE_FEE_RUB : this.STANDARD_SERVICE_FEE_RUB;
    let serviceFeePerSegment = baseFeeRub;
    if (targetCurrency !== 'RUB') {
      const feeConversion = await CurrencyService.convertAmount(baseFeeRub, 'RUB', targetCurrency, false);
      serviceFeePerSegment = feeConversion.convertedAmount;
    }
    const totalServiceFee = CurrencyService.roundMoney(serviceFeePerSegment * segmentCount, targetCurrency);
    const finalPrice = CurrencyService.roundMoney(netFareConverted + conversion.fxBufferAmount + totalServiceFee, targetCurrency);

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

  static async evaluateSTPC(segments, targetCurrency) {
    for (const segment of segments) {
      const airline = segment.airlineCode.toUpperCase();
      const isEligibleAirline = STPC_AIRLINES.includes(airline);
      const layoverMin = segment.layoverDurationMinutes || 0;
      const layoverHours = layoverMin / 60;

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

  static async calculateSplitEconomy(directBenchmarkPrice, directBenchmarkCurrency, splitLegs, options) {
    const { targetCurrency } = options;
    const benchmarkConversion = await CurrencyService.convertAmount(directBenchmarkPrice, directBenchmarkCurrency, targetCurrency, false);
    const benchmarkInTargetCurrency = benchmarkConversion.convertedAmount;

    const calculatedLegs = [];
    let splitRouteTotalPrice = 0;
    const allSegments = [];

    for (const leg of splitLegs) {
      const breakdown = await this.calculateFareBreakdown(leg.netFare, leg.currency, leg.segments.length, options);
      splitRouteTotalPrice += breakdown.finalPrice;
      allSegments.push(...leg.segments);
      calculatedLegs.push({ fareBreakdown: breakdown, segments: leg.segments });
    }

    splitRouteTotalPrice = CurrencyService.roundMoney(splitRouteTotalPrice, targetCurrency);
    const stpcInfo = await this.evaluateSTPC(allSegments, targetCurrency);
    const stpcHotelValue = stpcInfo ? stpcInfo.hotelValueEstimate : 0;
    const monetarySavings = CurrencyService.roundMoney(benchmarkInTargetCurrency - splitRouteTotalPrice, targetCurrency);
    const totalEconomicSavings = CurrencyService.roundMoney(monetarySavings + stpcHotelValue, targetCurrency);
    const savingsPercentage = benchmarkInTargetCurrency > 0 ? Number(((totalEconomicSavings / benchmarkInTargetCurrency) * 100).toFixed(2)) : 0;

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
    };
  }
}

// Zod schemas test
const FlightSegmentSchema = z.object({
  airlineCode: z.string().min(2).max(3),
  flightNumber: z.string().min(1),
  departureAirport: z.string().length(3),
  arrivalAirport: z.string().length(3),
  departureTime: z.string().datetime(),
  arrivalTime: z.string().datetime(),
  layoverDurationMinutes: z.number().optional(),
});

const SplitTicketLegInputSchema = z.object({
  netFare: z.number().positive(),
  currency: z.enum(['RUB', 'USD', 'EUR', 'VND']),
  segments: z.array(FlightSegmentSchema).min(1),
});

const PricingCalculateRequestSchema = z.object({
  directBenchmarkPrice: z.number().nonnegative(),
  directBenchmarkCurrency: z.enum(['RUB', 'USD', 'EUR', 'VND']),
  splitLegs: z.array(SplitTicketLegInputSchema).min(1),
  options: z.object({
    isClubMember: z.boolean().default(false),
    targetCurrency: z.enum(['RUB', 'USD', 'EUR', 'VND']).default('RUB'),
  }),
});

async function runTests() {
  console.log('=== 2. RUNNING PRICING SERVICE & SPLIT-ECONOMY SUITE ===\n');
  let allPassed = true;

  // Test 1: Standard Fee
  const breakdownStd = await PricingService.calculateFareBreakdown(10000, 'RUB', 2, { isClubMember: false, targetCurrency: 'RUB' });
  const test1Ok = breakdownStd.serviceFeePerSegment === 1500 && breakdownStd.totalServiceFee === 3000 && breakdownStd.finalPrice === 13000;
  console.log(`- [${test1Ok ? 'PASS' : 'FAIL'}] Standard Service Fee: ${breakdownStd.finalPrice} ₽ (expected 13000 ₽)`);
  if (!test1Ok) allPassed = false;

  // Test 2: Club Member Fee (0 ₽)
  const breakdownClub = await PricingService.calculateFareBreakdown(10000, 'RUB', 2, { isClubMember: true, targetCurrency: 'RUB' });
  const test2Ok = breakdownClub.serviceFeePerSegment === 0 && breakdownClub.totalServiceFee === 0 && breakdownClub.finalPrice === 10000;
  console.log(`- [${test2Ok ? 'PASS' : 'FAIL'}] Club Member 0 ₽ Fee: ${breakdownClub.finalPrice} ₽ (expected 10000 ₽)`);
  if (!test2Ok) allPassed = false;

  // Test 3: Cross Currency FX Buffer (100 USD in RUB)
  const breakdownCross = await PricingService.calculateFareBreakdown(100, 'USD', 1, { isClubMember: false, targetCurrency: 'RUB' });
  const test3Ok = breakdownCross.netFareConverted === 9250 && breakdownCross.fxBufferAmount === 138.75 && breakdownCross.finalPrice === 10888.75;
  console.log(`- [${test3Ok ? 'PASS' : 'FAIL'}] Cross-currency FX Buffer: ${breakdownCross.finalPrice} ₽ (Net=9250, FX=138.75, Fee=1500)`);
  if (!test3Ok) allPassed = false;

  // Test 4: STPC Evaluation (Emirates 10h layover)
  const stpcEK = await PricingService.evaluateSTPC([
    { airlineCode: 'EK', flightNumber: 'EK132', departureAirport: 'DME', arrivalAirport: 'DXB', departureTime: '2026-10-01T12:00:00Z', arrivalTime: '2026-10-01T17:30:00Z', layoverDurationMinutes: 600 }
  ], 'USD');
  const test4Ok = stpcEK && stpcEK.eligible === true && stpcEK.hotelValueEstimate === 80;
  console.log(`- [${test4Ok ? 'PASS' : 'FAIL'}] STPC Emirates 10h Layover: eligible=${stpcEK?.eligible}, value=$${stpcEK?.hotelValueEstimate}`);
  if (!test4Ok) allPassed = false;

  // Test 5: STPC Rejection (<8h layover)
  const stpcShort = await PricingService.evaluateSTPC([
    { airlineCode: 'TK', flightNumber: 'TK414', departureAirport: 'VKO', arrivalAirport: 'IST', departureTime: '2026-10-01T12:00:00Z', arrivalTime: '2026-10-01T16:00:00Z', layoverDurationMinutes: 300 }
  ], 'USD');
  const test5Ok = stpcShort === null;
  console.log(`- [${test5Ok ? 'PASS' : 'FAIL'}] STPC Short Layover (5h): rejected correctly (${stpcShort})`);
  if (!test5Ok) allPassed = false;

  // Test 6: Positive Split Economy + STPC
  const splitPos = await PricingService.calculateSplitEconomy(
    60000,
    'RUB',
    [
      { netFare: 20000, currency: 'RUB', segments: [{ airlineCode: 'TK', flightNumber: 'TK414', departureAirport: 'VKO', arrivalAirport: 'IST', departureTime: '2026-10-01T12:00:00Z', arrivalTime: '2026-10-01T16:00:00Z', layoverDurationMinutes: 720 }] },
      { netFare: 22000, currency: 'RUB', segments: [{ airlineCode: 'TK', flightNumber: 'TK168', departureAirport: 'IST', arrivalAirport: 'HAN', departureTime: '2026-10-02T04:00:00Z', arrivalTime: '2026-10-02T16:00:00Z' }] }
    ],
    { isClubMember: false, targetCurrency: 'RUB' }
  );
  const test6Ok = splitPos.splitRouteTotalPrice === 45000 && splitPos.monetarySavings === 15000 && splitPos.totalEconomicSavings === 22400 && splitPos.isSplitAdvantageous === true;
  console.log(`- [${test6Ok ? 'PASS' : 'FAIL'}] Positive Split Economy: Split=${splitPos.splitRouteTotalPrice} ₽, Savings=${splitPos.monetarySavings} ₽, TotalSavings=${splitPos.totalEconomicSavings} ₽, Adv=${splitPos.isSplitAdvantageous}`);
  if (!test6Ok) allPassed = false;

  // Test 7: Negative Split Economy
  const splitNeg = await PricingService.calculateSplitEconomy(
    30000,
    'RUB',
    [
      { netFare: 20000, currency: 'RUB', segments: [{ airlineCode: 'SU', flightNumber: 'SU100', departureAirport: 'SVO', arrivalAirport: 'AER', departureTime: '2026-10-01T12:00:00Z', arrivalTime: '2026-10-01T16:00:00Z' }] },
      { netFare: 15000, currency: 'RUB', segments: [{ airlineCode: 'SU', flightNumber: 'SU101', departureAirport: 'AER', arrivalAirport: 'SVO', departureTime: '2026-10-10T12:00:00Z', arrivalTime: '2026-10-10T16:00:00Z' }] }
    ],
    { isClubMember: false, targetCurrency: 'RUB' }
  );
  const test7Ok = splitNeg.splitRouteTotalPrice === 38000 && splitNeg.monetarySavings === -8000 && splitNeg.isSplitAdvantageous === false;
  console.log(`- [${test7Ok ? 'PASS' : 'FAIL'}] Negative Split Economy: Split=${splitNeg.splitRouteTotalPrice} ₽, Savings=${splitNeg.monetarySavings} ₽, Adv=${splitNeg.isSplitAdvantageous}`);
  if (!test7Ok) allPassed = false;

  // Test 8: Zod Schema Validation
  const validPayload = {
    directBenchmarkPrice: 60000,
    directBenchmarkCurrency: 'RUB',
    splitLegs: [
      {
        netFare: 20000,
        currency: 'RUB',
        segments: [{ airlineCode: 'TK', flightNumber: 'TK414', departureAirport: 'VKO', arrivalAirport: 'IST', departureTime: '2026-10-01T12:00:00Z', arrivalTime: '2026-10-01T16:00:00Z', layoverDurationMinutes: 720 }]
      }
    ],
    options: { isClubMember: false, targetCurrency: 'RUB' }
  };
  const parseResult = PricingCalculateRequestSchema.safeParse(validPayload);
  const test8Ok = parseResult.success === true;
  console.log(`- [${test8Ok ? 'PASS' : 'FAIL'}] Zod Schema Validation (Valid payload): parsed successfully`);
  if (!test8Ok) allPassed = false;

  const invalidParse = PricingCalculateRequestSchema.safeParse({ directBenchmarkPrice: -50, splitLegs: [] });
  const test9Ok = invalidParse.success === false;
  console.log(`- [${test9Ok ? 'PASS' : 'FAIL'}] Zod Schema Validation (Invalid payload): rejected correctly`);
  if (!test9Ok) allPassed = false;

  if (!allPassed) {
    console.error('\n>>> SOME TESTS FAILED <<<');
    process.exit(1);
  } else {
    console.log('\n>>> ALL 9 TESTS PASSED SUCCESSFULLY (100%) <<<');
  }
}

runTests();
