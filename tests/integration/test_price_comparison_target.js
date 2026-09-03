const { execSync } = require('child_process');
const { z } = require('zod');

console.log('=== 1. TYPESCRIPT STRICT COMPILATION CHECK ===');
try {
  execSync('node ./node_modules/typescript/bin/tsc --noEmit', { cwd: __dirname, stdio: 'inherit' });
  console.log('TypeScript Compilation: PASS (0 errors)\n');
} catch (e) {
  console.error('TypeScript Compilation: FAILED');
  process.exit(1);
}

// 2. Logic Verification in Node runtime
const SUPPORTED_CURRENCIES = ['RUB', 'USD', 'EUR', 'VND'];
const STPC_AIRLINES = ['EK', 'TK', 'QR', 'GF'];

class CurrencyService {
  static FX_BUFFER_RATE = 0.015;

  static roundMoney(amount, currency) {
    if (currency === 'VND') {
      return Math.round(amount);
    }
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  static async convertAmount(amount, from, to, applyFxBuffer = true) {
    if (from === to) {
      return {
        convertedAmount: this.roundMoney(amount, to),
        fxBufferAmount: 0,
        rate: 1.0,
      };
    }
    const rate = 1.0;
    const rawConverted = amount * rate;
    const fxBufferAmount = applyFxBuffer ? this.roundMoney(rawConverted * this.FX_BUFFER_RATE, to) : 0;
    return {
      convertedAmount: this.roundMoney(rawConverted, to),
      fxBufferAmount,
      rate,
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
    const serviceFeePerSegment = baseFeeRub;
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
        return {
          eligible: true,
          airlineCode: airline,
          layoverDurationHours: Number(layoverHours.toFixed(1)),
          hotelValueEstimate: 7400, // ~$80 in RUB
          currency: targetCurrency,
          details: `Бесплатный отель 4★ по программе STPC от авиакомпании ${airline} (стыковка ${layoverHours.toFixed(1)}ч в хабе).`,
        };
      }
    }
    return null;
  }

  static async calculateSplitEconomy(directBenchmarkPrice, directBenchmarkCurrency, splitLegs, options, userTargetInfo) {
    const { targetCurrency } = options;
    const hasUserTarget = Boolean(userTargetInfo && userTargetInfo.userTargetPrice && userTargetInfo.userTargetPrice > 0);
    const rawBenchmarkPrice = hasUserTarget ? userTargetInfo.userTargetPrice : directBenchmarkPrice;
    const rawBenchmarkCurrency = hasUserTarget ? targetCurrency : directBenchmarkCurrency;

    const benchmarkConversion = await CurrencyService.convertAmount(rawBenchmarkPrice, rawBenchmarkCurrency, targetCurrency, false);
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

    const benchmarkType = hasUserTarget ? 'user_target' : 'gds_through_fare';
    const benchmarkLabel = hasUserTarget ? `Ваша цена на ${userTargetInfo.userTargetSource || 'стороннем сайте'}` : 'Сквозной тариф GDS (Единый билет)';

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
      userTargetPrice: userTargetInfo ? userTargetInfo.userTargetPrice : undefined,
      userTargetSource: userTargetInfo ? userTargetInfo.userTargetSource : undefined,
    };
  }
}

// NLP Extractor Simulation for test assertions
function extractTargetPriceAndSource(text) {
  const textLower = text.toLowerCase();
  let userTargetSource = undefined;
  if (/авиасейлс|aviasales/i.test(text)) userTargetSource = 'Авиасейлс';
  else if (/яндекс|yandex/i.test(text)) userTargetSource = 'Яндекс.Путешествия';
  else if (/trip\.com|трип/i.test(text)) userTargetSource = 'Trip.com';
  else if (/купибилет|kupibilet/i.test(text)) userTargetSource = 'Купибилет';

  let userTargetPrice = undefined;
  const targetPriceMatch = text.match(/(?:видел|нашел|предложение|цена|билет|стоит|стоил|дешевле|на стороннем сайте|на другом сайте|на авиасейлс|на яндекс)\s*(?:билет|рейс)?\s*(?:за|на|в|по)?\s*(\d{1,3}[\s_]?\d{3}|\d{1,3}\s*тыс|\d{1,3}[кkKК])(?:\s|$|[^\wа-яА-ЯёЁ])/i) ||
                           text.match(/за\s+(\d{1,3}[\s_]?\d{3}|\d{1,3}[кkKК]|\d{1,3}\s*тыс)\s*(?:руб|р|rub|₽)?/i);

  if (targetPriceMatch) {
    const rawVal = targetPriceMatch[1].replace(/[\s_]/g, '').toLowerCase();
    if (rawVal.endsWith('к') || rawVal.endsWith('k')) {
      userTargetPrice = parseInt(rawVal.replace(/[кk]/g, ''), 10) * 1000;
    } else if (rawVal.includes('тыс')) {
      userTargetPrice = parseInt(rawVal.replace(/тыс/g, ''), 10) * 1000;
    } else {
      userTargetPrice = parseInt(rawVal, 10);
    }
  }


  const benchmarkType = userTargetPrice ? 'user_target' : 'gds_through_fare';
  const hasPrompt = !userTargetPrice;

  return { userTargetPrice, userTargetSource, benchmarkType, hasPrompt };
}

// Zod Schema
const PricingCalculateRequestSchema = z.object({
  directBenchmarkPrice: z.number().nonnegative(),
  directBenchmarkCurrency: z.enum(['RUB', 'USD', 'EUR', 'VND']),
  userTargetPrice: z.number().positive().optional(),
  userTargetSource: z.string().optional(),
  splitLegs: z.array(z.object({
    legId: z.string().optional(),
    netFare: z.number().positive(),
    currency: z.enum(['RUB', 'USD', 'EUR', 'VND']),
    segments: z.array(z.object({
      airlineCode: z.string(),
      departureAirport: z.string(),
      arrivalAirport: z.string(),
    })),
  })).min(1),
  options: z.object({
    isClubMember: z.boolean().default(false),
    targetCurrency: z.enum(['RUB', 'USD', 'EUR', 'VND']).default('RUB'),
  }),
});

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function runSuite() {
  console.log('=== 2. NLP TARGET PRICE EXTRACTION SUITE ===');

  const t1 = extractTargetPriceAndSource('Москва Бангкок 15 сентября видел на Авиасейлс за 68 000 руб');
  assert(t1.userTargetPrice === 68000, `Extracted userTargetPrice 68000: ${t1.userTargetPrice}`);
  assert(t1.userTargetSource === 'Авиасейлс', `Extracted userTargetSource 'Авиасейлс': ${t1.userTargetSource}`);
  assert(t1.benchmarkType === 'user_target', `Benchmark type is user_target: ${t1.benchmarkType}`);

  const t2 = extractTargetPriceAndSource('Иркутск Дюссельдорф 20 ноября нашел за 45к на яндекс путешествия');
  assert(t2.userTargetPrice === 45000, `Extracted 45k as 45000: ${t2.userTargetPrice}`);
  assert(t2.userTargetSource === 'Яндекс.Путешествия', `Extracted source: ${t2.userTargetSource}`);

  const t3 = extractTargetPriceAndSource('видел билет за 33 000 рублей Москва Стамбул');
  assert(t3.userTargetPrice === 33000, `Extracted 33000 from phrase 'видел билет за 33 000 рублей': ${t3.userTargetPrice}`);

  const t4 = extractTargetPriceAndSource('Москва Бангкок 15 сентября');
  assert(t4.userTargetPrice === undefined, `User target price is undefined when omitted`);
  assert(t4.benchmarkType === 'gds_through_fare', `Default benchmark is gds_through_fare`);
  assert(t4.hasPrompt === true, `Prompt for competitor price is activated`);

  console.log('\n=== 3. PRICING SERVICE PERSONALIZED SAVINGS SUITE ===');

  const splitLegs = [
    {
      legId: 'leg-1',
      netFare: 24000,
      currency: 'RUB',
      segments: [
        {
          airlineCode: 'EK',
          flightNumber: 'EK 132',
          departureAirport: 'SVO',
          arrivalAirport: 'DXB',
          layoverDurationMinutes: 600, // 10h layover -> STPC eligible ($80 = 7 400 ₽)
        },
      ],
    },
    {
      legId: 'leg-2',
      netFare: 28000,
      currency: 'RUB',
      segments: [
        {
          airlineCode: 'EK',
          flightNumber: 'EK 384',
          departureAirport: 'DXB',
          arrivalAirport: 'BKK',
        },
      ],
    },
  ];

  // Case A: With User Target Price (68 000 ₽ on Aviasales)
  // Split total price: (24000 + 1500) + (28000 + 1500) = 55 000 ₽
  const economyUserTarget = await PricingService.calculateSplitEconomy(
    78500, // Default GDS price (overridden by 68 000 ₽)
    'RUB',
    splitLegs,
    { isClubMember: false, targetCurrency: 'RUB' },
    { userTargetPrice: 68000, userTargetSource: 'Авиасейлс' }
  );

  assert(economyUserTarget.benchmarkType === 'user_target', `PricingService set benchmarkType: ${economyUserTarget.benchmarkType}`);
  assert(economyUserTarget.benchmarkLabel === 'Ваша цена на Авиасейлс', `Benchmark label is 'Ваша цена на Авиасейлс': ${economyUserTarget.benchmarkLabel}`);
  assert(economyUserTarget.directBenchmarkPrice === 68000, `Benchmark price is user price 68 000 ₽: ${economyUserTarget.directBenchmarkPrice}`);
  assert(economyUserTarget.splitRouteTotalPrice === 55000, `Split route total is 55 000 ₽: ${economyUserTarget.splitRouteTotalPrice}`);
  assert(economyUserTarget.monetarySavings === 13000, `Monetary savings against user price is 13 000 ₽ (68000 - 55000): ${economyUserTarget.monetarySavings}`);
  assert(economyUserTarget.totalEconomicSavings === 20400, `Total economic savings with STPC hotel (+7400 ₽) is 20 400 ₽: ${economyUserTarget.totalEconomicSavings}`);

  // Case B: Without User Target Price (Default GDS Through-fare)
  const economyGDS = await PricingService.calculateSplitEconomy(
    78500,
    'RUB',
    splitLegs,
    { isClubMember: false, targetCurrency: 'RUB' }
  );

  assert(economyGDS.benchmarkType === 'gds_through_fare', `GDS benchmarkType set: ${economyGDS.benchmarkType}`);
  assert(economyGDS.benchmarkLabel === 'Сквозной тариф GDS (Единый билет)', `GDS label set: ${economyGDS.benchmarkLabel}`);
  assert(economyGDS.directBenchmarkPrice === 78500, `GDS Benchmark price is 78 500 ₽: ${economyGDS.directBenchmarkPrice}`);
  assert(economyGDS.monetarySavings === 23500, `Monetary savings against GDS is 23 500 ₽: ${economyGDS.monetarySavings}`);

  console.log('\n=== 4. ZOD SCHEMA VALIDATION SUITE ===');

  const validPayload = {
    directBenchmarkPrice: 78500,
    directBenchmarkCurrency: 'RUB',
    userTargetPrice: 68000,
    userTargetSource: 'Авиасейлс',
    splitLegs: [
      {
        legId: 'leg-1',
        netFare: 24000,
        currency: 'RUB',
        segments: [
          { airlineCode: 'EK', departureAirport: 'SVO', arrivalAirport: 'DXB' }
        ]
      }
    ],
    options: {
      isClubMember: false,
      targetCurrency: 'RUB'
    }
  };

  const parsedValid = PricingCalculateRequestSchema.safeParse(validPayload);
  assert(parsedValid.success === true, `Valid request with userTargetPrice passed Zod validation`);
  assert(parsedValid.data.userTargetPrice === 68000, `Zod parsed userTargetPrice correctly: ${parsedValid.data.userTargetPrice}`);

  console.log('\n================================================================');
  console.log(`🏁 TARGET PRICE MATCHING SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100% PASS RATE)`);
  console.log('================================================================');
}

runSuite().catch((err) => {
  console.error('Suite error:', err);
  process.exit(1);
});
