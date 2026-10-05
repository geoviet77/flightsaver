import { Flight, ParsedSearchParams, CabinClass, Currency, PricingBreakdown, SegmentPriceDetail } from './types';

interface AirportMeta {
  fullName: string;
  city: string;
  country: string;
}

const AIRPORT_DIRECTORY: Record<string, AirportMeta> = {
  // Russia & CIS
  MOW: { fullName: 'Москва (Шереметьево)', city: 'Москва', country: 'Россия' },
  SVO: { fullName: 'Москва (Шереметьево)', city: 'Москва', country: 'Россия' },
  DME: { fullName: 'Москва (Домодедово)', city: 'Москва', country: 'Россия' },
  VKO: { fullName: 'Москва (Внуково)', city: 'Москва', country: 'Россия' },
  LED: { fullName: 'Санкт-Петербург (Пулково)', city: 'Санкт-Петербург', country: 'Россия' },
  UUS: { fullName: 'Южно-Сахалинск (Хомутово)', city: 'Южно-Сахалинск', country: 'Россия' },
  VVO: { fullName: 'Владивосток (Кневичи)', city: 'Владивосток', country: 'Россия' },
  OVB: { fullName: 'Новосибирск (Толмачево)', city: 'Новосибирск', country: 'Россия' },
  KHV: { fullName: 'Хабаровск (Новый)', city: 'Хабаровск', country: 'Россия' },
  IKT: { fullName: 'Иркутск (Байкал)', city: 'Иркутск', country: 'Россия' },
  KJA: { fullName: 'Красноярск (Емельяново)', city: 'Красноярск', country: 'Россия' },
  KUF: { fullName: 'Самара (Курумоч)', city: 'Самара', country: 'Россия' },
  UFA: { fullName: 'Уфа (Мустай Карим)', city: 'Уфа', country: 'Россия' },
  KZN: { fullName: 'Казань (Габдулла Тукай)', city: 'Казань', country: 'Россия' },
  AER: { fullName: 'Сочи (Адлер)', city: 'Сочи', country: 'Россия' },
  SVX: { fullName: 'Екатеринбург (Кольцово)', city: 'Екатеринбург', country: 'Россия' },
  KGD: { fullName: 'Калининград (Храброво)', city: 'Калининград', country: 'Россия' },
  MRV: { fullName: 'Минеральные Воды (КМВ)', city: 'Минеральные Воды', country: 'Россия' },
  TAS: { fullName: 'Ташкент (Ислам Каримов)', city: 'Ташкент', country: 'Узбекистан' },
  ALA: { fullName: 'Алматы (ALA Intl)', city: 'Алматы', country: 'Казахстан' },
  NQZ: { fullName: 'Астана (Нурсултан Назарбаев)', city: 'Астана', country: 'Казахстан' },
  MSQ: { fullName: 'Минск (MSQ-2)', city: 'Минск', country: 'Беларусь' },
  GYD: { fullName: 'Баку (Гейдар Алиев)', city: 'Баку', country: 'Азербайджан' },

  // Asia & Pacific
  DAD: { fullName: 'Дананг (DAD International)', city: 'Дананг', country: 'Вьетнам' },
  CXR: { fullName: 'Нячанг (Камрань)', city: 'Нячанг', country: 'Вьетнам' },
  HAN: { fullName: 'Ханой (Нойбай)', city: 'Ханой', country: 'Вьетнам' },
  SGN: { fullName: 'Хошимин (Таншоннят)', city: 'Хошимин', country: 'Вьетнам' },
  BKK: { fullName: 'Бангкок (Суварнабхуми)', city: 'Бангкок', country: 'Таиланд' },
  DMK: { fullName: 'Бангкок (Донмыанг)', city: 'Бангкок', country: 'Таиланд' },
  HKT: { fullName: 'Пхукет (Международный)', city: 'Пхукет', country: 'Таиланд' },
  DPS: { fullName: 'Бали (Нгурах-Рай)', city: 'Бали', country: 'Индонезия' },
  SIN: { fullName: 'Сингапур (Чанги)', city: 'Сингапур', country: 'Сингапур' },
  KUL: { fullName: 'Куала-Лумпур (KLIA)', city: 'Куала-Лумпур', country: 'Малайзия' },
  PEK: { fullName: 'Пекин (Шоуду)', city: 'Пекин', country: 'Китай' },
  PKX: { fullName: 'Пекин (Дасин)', city: 'Пекин', country: 'Китай' },
  ICN: { fullName: 'Сеул (Инчхон)', city: 'Сеул', country: 'Южная Корея' },
  TYO: { fullName: 'Токио (Нарита/Ханеда)', city: 'Токио', country: 'Япония' },
  NRT: { fullName: 'Токио (Нарита)', city: 'Токио', country: 'Япония' },
  HND: { fullName: 'Токио (Ханеда)', city: 'Токио', country: 'Япония' },

  // Middle East & Europe
  DXB: { fullName: 'Дубай (DXB International)', city: 'Дубай', country: 'ОАЭ' },
  AUH: { fullName: 'Абу-Даби (Зайед Intl)', city: 'Абу-Даби', country: 'ОАЭ' },
  DOH: { fullName: 'Доха (Хамад)', city: 'Доха', country: 'Катар' },
  IST: { fullName: 'Стамбул (Новый аэропорт)', city: 'Стамбул', country: 'Турция' },
  SAW: { fullName: 'Стамбул (Сабиха Гёкчен)', city: 'Стамбул', country: 'Турция' },
  AYT: { fullName: 'Анталья (AYT Intl)', city: 'Анталья', country: 'Турция' },
  PAR: { fullName: 'Париж (Шарль де Голль)', city: 'Париж', country: 'Франция' },
  CDG: { fullName: 'Париж (Шарль де Голль)', city: 'Париж', country: 'Франция' },
  ROM: { fullName: 'Рим (Фьюмичино)', city: 'Рим', country: 'Италия' },
  FCO: { fullName: 'Рим (Фьюмичино)', city: 'Рим', country: 'Италия' },
  LON: { fullName: 'Лондон (Хитроу/Гатвик)', city: 'Лондон', country: 'Великобритания' },
  LHR: { fullName: 'Лондон (Хитроу)', city: 'Лондон', country: 'Великобритания' },
  LGW: { fullName: 'Лондон (Гатвик)', city: 'Лондон', country: 'Великобритания' },
  BER: { fullName: 'Берлин (Бранденбург)', city: 'Берлин', country: 'Германия' },
  MUC: { fullName: 'Мюнхен (Франц Йозеф Штраус)', city: 'Мюнхен', country: 'Германия' },
  FRA: { fullName: 'Франкфурт (Рейн-Майн)', city: 'Франкфурт', country: 'Германия' },
  VIE: { fullName: 'Вена (Швехат)', city: 'Вена', country: 'Австрия' },
  AMS: { fullName: 'Амстердам (Схипхол)', city: 'Амстердам', country: 'Нидерланды' },
  PRG: { fullName: 'Прага (Вацлав Гавел)', city: 'Прага', country: 'Чехия' },
  MAD: { fullName: 'Мадрид (Барахас)', city: 'Мадрид', country: 'Испания' },
  BCN: { fullName: 'Барселона (Эль-Прат)', city: 'Барселона', country: 'Испания' },
  MXP: { fullName: 'Милан (Мальпенса)', city: 'Милан', country: 'Италия' },
  ZRH: { fullName: 'Цюрих (Клотен)', city: 'Цюрих', country: 'Швейцария' },
  EVN: { fullName: 'Ереван (Звартноц)', city: 'Ереван', country: 'Армения' },
  BEG: { fullName: 'Белград (Никола Тесла)', city: 'Белград', country: 'Сербия' },
  BZV: { fullName: 'Браззавиль (Майя-Майя)', city: 'Браззавиль', country: 'Республика Конго' },
  FIH: { fullName: 'Киншаса (Нджили)', city: 'Киншаса', country: 'ДР Конго' },
  ADD: { fullName: 'Аддис-Абеба (Боле)', city: 'Аддис-Абеба', country: 'Эфиопия' },
  PMF: { fullName: 'Парма (Джузеппе Верди)', city: 'Парма', country: 'Италия' },
  CAI: { fullName: 'Каир (Международный)', city: 'Каир', country: 'Египет' },
};

function getAirportInfo(iata: string, cityNameFallback: string): AirportMeta {
  const code = iata.toUpperCase();
  if (AIRPORT_DIRECTORY[code]) {
    return AIRPORT_DIRECTORY[code];
  }
  return {
    fullName: `${cityNameFallback || code} (${code})`,
    city: cityNameFallback || code,
    country: 'Международный',
  };
}

interface TransitHubOption {
  city: string;
  iata: string;
  airline1: string;
  airline1Code: string;
  airline1Flight: string;
  aircraft1: string;
  airline2: string;
  airline2Code: string;
  airline2Flight: string;
  aircraft2: string;
  provider1: string;
  provider2: string;
}

function selectHubs(originIata: string, destIata: string): {
  splitHub: TransitHubOption;
  stpcHub: TransitHubOption;
  fastHub: TransitHubOption;
  directAirline?: { name: string; code: string; flight: string; aircraft: string };
} {
  const o = originIata.toUpperCase();
  const d = destIata.toUpperCase();

  const isFarEast = ['UUS', 'VVO', 'KHV', 'IKT'].includes(o);
  const isSouthEastAsia = ['DAD', 'CXR', 'HAN', 'SGN', 'BKK', 'HKT', 'DPS', 'SIN', 'KUL'].includes(d);
  const isRussia = ['MOW', 'SVO', 'DME', 'VKO', 'LED', 'OVB', 'SVX', 'KZN', 'AER', 'UUS', 'VVO', 'KUF', 'UFA', 'ROV', 'KGD', 'MRV'].includes(o);
  const isEurope = ['LON', 'LHR', 'LGW', 'PAR', 'CDG', 'ROM', 'FCO', 'BER', 'MUC', 'FRA', 'VIE', 'AMS', 'PRG', 'MAD', 'BCN', 'MXP', 'ZRH', 'BEG', 'ATH', 'LIS'].includes(d);
  const isRussiaToEurope = isRussia && isEurope;

  if (isRussiaToEurope || isEurope) {
    return {
      splitHub: {
        city: 'Стамбул',
        iata: 'IST',
        airline1: 'Turkish Airlines',
        airline1Code: 'TK',
        airline1Flight: 'TK 402',
        aircraft1: 'Airbus A330-300',
        airline2: 'Pegasus Airlines',
        airline2Code: 'PC',
        airline2Flight: 'PC 1018',
        aircraft2: 'Airbus A320neo',
        provider1: 'Turkish Airlines Direct',
        provider2: 'Pegasus GDS Direct',
      },
      stpcHub: {
        city: 'Дубай',
        iata: 'DXB',
        airline1: 'Flydubai',
        airline1Code: 'FZ',
        airline1Flight: 'FZ 918',
        aircraft1: 'Boeing 737 MAX 8',
        airline2: 'Emirates',
        airline2Code: 'EK',
        airline2Flight: 'EK 049',
        aircraft2: 'Boeing 777-300ER',
        provider1: 'Flydubai Direct',
        provider2: 'Emirates NDC Direct',
      },
      fastHub: {
        city: 'Ереван',
        iata: 'EVN',
        airline1: 'FlyOne Armenia',
        airline1Code: '3F',
        airline1Flight: '3F 536',
        aircraft1: 'Airbus A320',
        airline2: 'Lufthansa',
        airline2Code: 'LH',
        airline2Flight: 'LH 1455',
        aircraft2: 'Airbus A321neo',
        provider1: 'FlyOne NDC',
        provider2: 'Lufthansa Group Corporate',
      },
      directAirline: undefined, // Strictly NO direct flights from Russia to Europe
    };
  }

  if (isFarEast && isSouthEastAsia) {
    return {
      splitHub: {
        city: 'Ханой',
        iata: 'HAN',
        airline1: 'Vietnam Airlines',
        airline1Code: 'VN',
        airline1Flight: 'VN 534',
        aircraft1: 'Airbus A350-900',
        airline2: 'VietJet Air',
        airline2Code: 'VJ',
        airline2Flight: 'VJ 508',
        aircraft2: 'Airbus A321neo',
        provider1: 'Vietnam Airlines NDC Direct',
        provider2: 'VietJet Air Wholesale GDS',
      },
      stpcHub: {
        city: 'Бангкок',
        iata: 'BKK',
        airline1: 'Thai Airways',
        airline1Code: 'TG',
        airline1Flight: 'TG 924',
        aircraft1: 'Boeing 787-9 Dreamliner',
        airline2: 'Bangkok Airways',
        airline2Code: 'PG',
        airline2Flight: 'PG 947',
        aircraft2: 'Airbus A320',
        provider1: 'Thai Airways Direct',
        provider2: 'Bangkok Airways Fare',
      },
      fastHub: {
        city: 'Пекин',
        iata: 'PEK',
        airline1: 'Air China',
        airline1Code: 'CA',
        airline1Flight: 'CA 182',
        aircraft1: 'Boeing 777-300ER',
        airline2: 'Air China',
        airline2Code: 'CA',
        airline2Flight: 'CA 741',
        aircraft2: 'Airbus A321',
        provider1: 'Air China Global',
        provider2: 'Air China Global',
      },
    };
  }

  // European Russia / Central Russia
  return {
    splitHub: {
      city: 'Доха',
      iata: 'DOH',
      airline1: 'Qatar Airways',
      airline1Code: 'QR',
      airline1Flight: 'QR 338',
      aircraft1: 'Boeing 787-8 Dreamliner',
      airline2: 'VietJet Air',
      airline2Code: 'VJ',
      airline2Flight: 'VJ 862',
      aircraft2: 'Airbus A330-300',
      provider1: 'Qatar Airways NDC Direct',
      provider2: 'VietJet Air Wholesale',
    },
    stpcHub: {
      city: 'Дубай',
      iata: 'DXB',
      airline1: 'Emirates',
      airline1Code: 'EK',
      airline1Flight: 'EK 132',
      aircraft1: 'Airbus A380-800',
      airline2: 'Flydubai',
      airline2Code: 'FZ',
      airline2Flight: 'FZ 571',
      aircraft2: 'Boeing 737 MAX 8',
      provider1: 'Emirates Direct NDC',
      provider2: 'Flydubai Special Agreement',
    },
    fastHub: {
      city: 'Стамбул',
      iata: 'IST',
      airline1: 'Turkish Airlines',
      airline1Code: 'TK',
      airline1Flight: 'TK 414',
      aircraft1: 'Airbus A330-200',
      airline2: 'Turkish Airlines',
      airline2Code: 'TK',
      airline2Flight: 'TK 68',
      aircraft2: 'Boeing 787-9 Dreamliner',
      provider1: 'Turkish Airlines Corporate',
      provider2: 'Turkish Airlines Corporate',
    },
    directAirline: ['MOW', 'LED'].includes(o) && ['DXB', 'IST', 'BKK', 'HKT', 'AER'].includes(d) ? {
      name: 'Аэрофлот',
      code: 'SU',
      flight: 'SU 270',
      aircraft: 'Boeing 777-300ER',
    } : undefined,
  };
}

function toPrepositional(city: string): string {
  const map: Record<string, string> = {
    'Бангкок': 'Бангкоке',
    'Дубай': 'Дубае',
    'Доха': 'Дохе',
    'Ханой': 'Ханое',
    'Стамбул': 'Стамбуле',
    'Сеул': 'Сеуле',
    'Пекин': 'Пекине',
    'Ташкент': 'Ташкенте',
    'Сингапур': 'Сингапуре',
    'Куала-Лумпур': 'Куала-Лумпуре',
    'Токио': 'Токио',
  };
  return map[city] || (city.endsWith('а') ? city.slice(0, -1) + 'е' : city + 'е');
}

export function generateMockFlights(_params: ParsedSearchParams): Flight[] {
  // Генерация синтетических билетов окончательно отключена.
  // Сервис работает исключительно с реальными данными авиакомпаний.
  return [];
}
