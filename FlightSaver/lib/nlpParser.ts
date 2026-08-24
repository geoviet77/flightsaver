import { ParsedSearchParams, Currency, CabinClass, TimePreference } from './types';

interface CityEntity {
  nameRu: string;
  nameEn: string;
  iata: string;
  variations: string[];
}

const CITY_DATABASE: CityEntity[] = [
  {
    nameRu: 'Москва',
    nameEn: 'Moscow',
    iata: 'MOW',
    variations: ['москва', 'москвы', 'москве', 'москву', 'москвой', 'мск', 'svo', 'dme', 'vko', 'moscow']
  },
  {
    nameRu: 'Санкт-Петербург',
    nameEn: 'Saint Petersburg',
    iata: 'LED',
    variations: ['питер', 'питера', 'питере', 'питеру', 'санкт-петербург', 'санкт-петербурга', 'спб', 'led', 'st petersburg', 'saint petersburg']
  },
  {
    nameRu: 'Бангкок',
    nameEn: 'Bangkok',
    iata: 'BKK',
    variations: ['бангкок', 'бангкока', 'бангкоке', 'бангкоку', 'bkk', 'bangkok']
  },
  {
    nameRu: 'Пхукет',
    nameEn: 'Phuket',
    iata: 'HKT',
    variations: ['пхукет', 'пхукета', 'пхукете', 'пхукету', 'hkt', 'phuket']
  },
  {
    nameRu: 'Нячанг',
    nameEn: 'Nha Trang',
    iata: 'CXR',
    variations: ['нячанг', 'нячанга', 'нячанге', 'нячангу', 'камрань', 'cxr', 'nha trang']
  },
  {
    nameRu: 'Дубай',
    nameEn: 'Dubai',
    iata: 'DXB',
    variations: ['дубай', 'дубая', 'дубае', 'дубаи', 'дубаю', 'dxb', 'dubai']
  },
  {
    nameRu: 'Стамбул',
    nameEn: 'Istanbul',
    iata: 'IST',
    variations: ['стамбул', 'стамбула', 'стамбуле', 'стамбулу', 'ist', 'saw', 'istanbul']
  },
  {
    nameRu: 'Бали (Денпасар)',
    nameEn: 'Bali',
    iata: 'DPS',
    variations: ['бали', 'денпасар', 'денпасара', 'dps', 'bali', 'denpasar']
  },
  {
    nameRu: 'Париж',
    nameEn: 'Paris',
    iata: 'PAR',
    variations: ['париж', 'парижа', 'париже', 'парижу', 'par', 'cdg', 'ory', 'paris']
  },
  {
    nameRu: 'Рим',
    nameEn: 'Rome',
    iata: 'ROM',
    variations: ['рим', 'рима', 'риме', 'риму', 'fco', 'cia', 'rome']
  },
  {
    nameRu: 'Токио',
    nameEn: 'Tokyo',
    iata: 'TYO',
    variations: ['токио', 'hnd', 'nrt', 'tokyo']
  },
  {
    nameRu: 'Казань',
    nameEn: 'Kazan',
    iata: 'KZN',
    variations: ['казань', 'казани', 'казанью', 'kzn', 'kazan']
  },
  {
    nameRu: 'Сочи',
    nameEn: 'Sochi',
    iata: 'AER',
    variations: ['сочи', 'адлер', 'адлера', 'aer', 'sochi', 'adler']
  },
  {
    nameRu: 'Екатеринбург',
    nameEn: 'Yekaterinburg',
    iata: 'SVX',
    variations: ['екатеринбург', 'екатеринбурга', 'екатеринбурге', 'екб', 'svx', 'yekaterinburg']
  },
  {
    nameRu: 'Анталья',
    nameEn: 'Antalya',
    iata: 'AYT',
    variations: ['анталья', 'антальи', 'анталью', 'анталье', 'ayt', 'antalya']
  },
  {
    nameRu: 'Тбилиси',
    nameEn: 'Tbilisi',
    iata: 'TBS',
    variations: ['тбилиси', 'tbs', 'tbilisi']
  },
  {
    nameRu: 'Ереван',
    nameEn: 'Yerevan',
    iata: 'EVN',
    variations: ['ереван', 'еревана', 'ереване', 'evn', 'yerevan']
  },
  {
    nameRu: 'Самуи',
    nameEn: 'Koh Samui',
    iata: 'USM',
    variations: ['самуи', 'самуй', 'usm', 'samui']
  },
  {
    nameRu: 'Лондон',
    nameEn: 'London',
    iata: 'LON',
    variations: ['лондон', 'лондона', 'лондоне', 'lhr', 'lgw', 'london']
  }
];

const MONTH_MAP: { [key: string]: { nameRu: string; index: number } } = {
  'январ': { nameRu: 'Январь', index: 0 },
  'феврал': { nameRu: 'Февраль', index: 1 },
  'март': { nameRu: 'Март', index: 2 },
  'апрел': { nameRu: 'Апрель', index: 3 },
  'ма': { nameRu: 'Май', index: 4 },
  'июн': { nameRu: 'Июнь', index: 5 },
  'июл': { nameRu: 'Июль', index: 6 },
  'август': { nameRu: 'Август', index: 7 },
  'сентябр': { nameRu: 'Сентябрь', index: 8 },
  'октябр': { nameRu: 'Октябрь', index: 9 },
  'ноябр': { nameRu: 'Ноябрь', index: 10 },
  'декабр': { nameRu: 'Декабрь', index: 11 },
  'jan': { nameRu: 'Январь', index: 0 },
  'feb': { nameRu: 'Февраль', index: 1 },
  'mar': { nameRu: 'Март', index: 2 },
  'apr': { nameRu: 'Апрель', index: 3 },
  'may': { nameRu: 'Май', index: 4 },
  'jun': { nameRu: 'Июнь', index: 5 },
  'jul': { nameRu: 'Июль', index: 6 },
  'aug': { nameRu: 'Август', index: 7 },
  'sep': { nameRu: 'Сентябрь', index: 8 },
  'oct': { nameRu: 'Октябрь', index: 9 },
  'nov': { nameRu: 'Ноябрь', index: 10 },
  'dec': { nameRu: 'Декабрь', index: 11 },
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[,\.?!;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findCityInText(text: string, prepositionRegex?: RegExp): CityEntity | null {
  for (const city of CITY_DATABASE) {
    for (const variation of city.variations) {
      if (prepositionRegex) {
        const match = text.match(new RegExp(`${prepositionRegex.source}\\s+${variation}\\b`, 'i'));
        if (match) return city;
      } else {
        const regex = new RegExp(`\\b${variation}\\b`, 'i');
        if (regex.test(text)) return city;
      }
    }
  }
  return null;
}

export function parseTravelQuery(rawText: string): ParsedSearchParams {
  const text = normalizeText(rawText);
  let confidenceScore = 0.5;

  // 1. Origin & Destination Detection
  const fromPrepositionRegex = /(?:из|от|from)/i;
  const toPrepositionRegex = /(?:в|во|на|до|to|into)/i;

  let originCityEntity = findCityInText(text, fromPrepositionRegex);
  let destinationCityEntity = findCityInText(text, toPrepositionRegex);

  if (originCityEntity && destinationCityEntity && originCityEntity.iata === destinationCityEntity.iata) {
    destinationCityEntity = null;
  }

  if (!destinationCityEntity) {
    for (const city of CITY_DATABASE) {
      if (originCityEntity && city.iata === originCityEntity.iata) continue;
      for (const variation of city.variations) {
        if (new RegExp(`\\b${variation}\\b`, 'i').test(text)) {
          destinationCityEntity = city;
          break;
        }
      }
      if (destinationCityEntity) break;
    }
  }

  const isDestinationSpecified = Boolean(destinationCityEntity);
  const finalDest = destinationCityEntity || {
    nameRu: 'Бангкок',
    nameEn: 'Bangkok',
    iata: 'BKK',
    variations: ['бангкок']
  };

  const isOriginDefaulted = !originCityEntity;
  const finalOrigin = originCityEntity || {
    nameRu: 'Москва',
    nameEn: 'Moscow',
    iata: 'MOW',
    variations: ['москва']
  };

  if (originCityEntity && isDestinationSpecified) {
    confidenceScore += 0.25;
  }

  // 2. Dates, Months, Duration & Relative time
  let departureMonth: string | undefined = undefined;
  let departureDate: string | undefined = undefined;
  let returnDate: string | undefined = undefined;
  let durationDays: number | undefined = undefined;
  let isWeekend = false;
  let isTomorrow = false;

  for (const [key, val] of Object.entries(MONTH_MAP)) {
    if (text.includes(key)) {
      departureMonth = val.nameRu;
      confidenceScore += 0.1;
      break;
    }
  }

  if (/выходн|уикенд|weekend/i.test(text)) {
    isWeekend = true;
    durationDays = 3;
  }

  if (/завтра|tomorrow/i.test(text)) {
    isTomorrow = true;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    departureDate = tomorrow.toISOString().split('T')[0];
  } else if (/послезавтра/i.test(text)) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    departureDate = d.toISOString().split('T')[0];
  }

  const weekMatch = text.match(/(?:на\s+)?(\d+)\s*(?:недел|week)/i);
  if (weekMatch) {
    durationDays = parseInt(weekMatch[1], 10) * 7;
  } else if (/на\s+неделю|на\s+1\s+неделю/i.test(text)) {
    durationDays = 7;
  } else if (/на\s+две\s+недели|на\s+2\s+недели/i.test(text)) {
    durationDays = 14;
  } else {
    const dayMatch = text.match(/(?:на\s+)?(\d+)\s*(?:дн|дней|дня|days?)/i);
    if (dayMatch) {
      durationDays = parseInt(dayMatch[1], 10);
    }
  }

  // 3. Budget limits
  let maxBudget: number | undefined = undefined;
  let currency: Currency = 'RUB';

  if (/(\$|usd|доллар)/i.test(text)) {
    currency = 'USD';
  } else if (/(€|eur|евро)/i.test(text)) {
    currency = 'EUR';
  } else if (/(бат|thb)/i.test(text)) {
    currency = 'THB';
  } else if (/(дирхам|aed)/i.test(text)) {
    currency = 'AED';
  }

  const budgetMatchK = text.match(/(?:до|бюджет|max|under)?\s*(\d+)\s*(?:тыс|тысяч|к|k)\b/i);
  const budgetMatchExact = text.match(/(?:до|бюджет|max|under)?\s*(\d{4,7})\s*(?:руб|р|rub|\$|€)?\b/i);
  const budgetMatchShortCurrency = text.match(/(?:до|under)?\s*(\d{2,5})\s*(?:\$|usd|€|eur)/i);

  if (budgetMatchK) {
    maxBudget = parseInt(budgetMatchK[1], 10) * 1000;
  } else if (budgetMatchShortCurrency) {
    maxBudget = parseInt(budgetMatchShortCurrency[1], 10);
  } else if (budgetMatchExact) {
    maxBudget = parseInt(budgetMatchExact[1], 10);
  }

  // 4. Passenger composition
  let adults = 1;
  let children = 0;
  let infants = 0;
  let passengerDescription = '1 взрослый';

  if (/на\s+двоих|на\s+2\s+человек|2\s+пассажир/i.test(text)) {
    adults = 2;
    passengerDescription = '2 взрослых';
  } else if (/на\s+троих|на\s+3\s+человек|3\s+пассажир/i.test(text)) {
    adults = 3;
    passengerDescription = '3 взрослых';
  } else if (/на\s+четверых|на\s+4\s+человек|4\s+пассажир/i.test(text)) {
    adults = 4;
    passengerDescription = '4 взрослых';
  }

  if (/с\s+ребенком|с\s+1\s+ребенком/i.test(text)) {
    children = 1;
    passengerDescription = `${adults} взр. + 1 реб.`;
  } else if (/с\s+двумя\s+детьми|с\s+2\s+детьми/i.test(text)) {
    children = 2;
    passengerDescription = `${adults} взр. + 2 дет.`;
  }

  if (/с\s+младенцем|с\s+грудничком/i.test(text)) {
    infants = 1;
    passengerDescription += ' + младенец';
  }

  const passengersCount = adults + children + infants;

  // 5. Direct only preference
  const directOnly = /(?:без\s+пересадок|прямой|прямые|direct|nonstop)/i.test(text);

  // 6. Advanced Semantic Travel Filters
  // STPC hotel
  const stpcHotelOnly = /(?:с\s+отелем|stpc|бесплатн\w*\s+отел|с\s+гостиниц|hotel)/i.test(text);

  // Visa-Free transit (TWOV)
  const visaFreeOnly = /(?:без\s+виз|без\s+транзитн\w*\s+виз|безвизов|twov|visa\s*free)/i.test(text);

  // Baggage included
  const baggageIncluded = /(?:с\s+багаж|багаж\w*|23\s*кг|чемодан|baggage)/i.test(text);

  // Cabin Class
  let cabinClass: CabinClass = 'Economy';
  if (/бизнес|бизнес-класс|business/i.test(text)) {
    cabinClass = 'Business';
  } else if (/премиум|комфорт|premium\s*economy/i.test(text)) {
    cabinClass = 'Premium Economy';
  }

  // Time preference
  let timePreference: TimePreference | undefined = undefined;
  if (/утром|утренн/i.test(text)) {
    timePreference = 'morning';
  } else if (/вечером|вечерн/i.test(text)) {
    timePreference = 'evening';
  } else if (/ночью|ночн/i.test(text)) {
    timePreference = 'night';
  } else if (/днем|дневн/i.test(text)) {
    timePreference = 'day';
  }

  if (stpcHotelOnly || visaFreeOnly || baggageIncluded || cabinClass !== 'Economy') {
    confidenceScore += 0.15;
  }

  const needsClarification = !isDestinationSpecified;
  const clarificationMessage = needsClarification
    ? 'Пожалуйста, уточните город или страну назначения.'
    : undefined;

  return {
    query: rawText,
    originCity: finalOrigin.nameRu,
    originIata: finalOrigin.iata,
    destinationCity: finalDest.nameRu,
    destinationIata: finalDest.iata,
    departureMonth,
    departureDate,
    returnDate,
    durationDays,
    isWeekend,
    isTomorrow,
    passengersCount,
    adults,
    children,
    infants,
    passengerDescription,
    maxBudget,
    currency,
    directOnly,
    isOriginDefaulted,
    needsClarification,
    clarificationMessage,
    confidenceScore: Math.min(1, Math.max(0.3, confidenceScore)),
    stpcHotelOnly,
    visaFreeOnly,
    baggageIncluded,
    cabinClass,
    timePreference,
  };
}
