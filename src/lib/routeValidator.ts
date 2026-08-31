/**
 * Route Feasibility Validator & Route Network Graph
 * Проверяет физическую и логистическую реализуемость маршрутов,
 * исключает вымышленные прямые рейсы и фильтрует тестовые авиакомпании.
 */

export interface DomesticLeg {
  airline: string;
  airlineCode: string;
  flightNumber: string;
  fromIata: string;
  fromCity: string;
  toIata: string;
  toCity: string;
  duration: string;
  durationMinutes: number;
  aircraft: string;
  departureTime: string;
  arrivalTime: string;
  priceRub: number;
}

export interface HubConnection {
  hubIata: string;
  hubCity: string;
  hubName: string;
  domesticLeg: DomesticLeg;
}

// Реестр реальных стыковок из региональных аэропортов РФ к международным хабам
const REGIONAL_HUB_ROUTES: Record<string, HubConnection[]> = {
  // Чебоксары
  CSY: [
    {
      hubIata: 'SVO',
      hubCity: 'Москва',
      hubName: 'Шереметьево',
      domesticLeg: {
        airline: 'Аэрофлот',
        airlineCode: 'SU',
        flightNumber: 'SU 1587',
        fromIata: 'CSY',
        fromCity: 'Чебоксары',
        toIata: 'SVO',
        toCity: 'Москва',
        duration: '1ч 35м',
        durationMinutes: 95,
        aircraft: 'Sukhoi Superjet 100',
        departureTime: '06:10',
        arrivalTime: '07:45',
        priceRub: 4850,
      },
    },
    {
      hubIata: 'VKO',
      hubCity: 'Москва',
      hubName: 'Внуково',
      domesticLeg: {
        airline: 'Победа',
        airlineCode: 'DP',
        flightNumber: 'DP 6814',
        fromIata: 'CSY',
        fromCity: 'Чебоксары',
        toIata: 'VKO',
        toCity: 'Москва',
        duration: '1ч 40м',
        durationMinutes: 100,
        aircraft: 'Boeing 737-800',
        departureTime: '08:20',
        arrivalTime: '10:00',
        priceRub: 3490,
      },
    },
  ],

  // Иркутск
  IKT: [
    {
      hubIata: 'PEK',
      hubCity: 'Пекин',
      hubName: 'Шоуду (Capital)',
      domesticLeg: {
        airline: 'S7 Airlines',
        airlineCode: 'S7',
        flightNumber: 'S7 6341',
        fromIata: 'IKT',
        fromCity: 'Иркутск',
        toIata: 'PEK',
        toCity: 'Пекин',
        duration: '3ч 10м',
        durationMinutes: 190,
        aircraft: 'Airbus A320neo',
        departureTime: '01:40',
        arrivalTime: '04:50',
        priceRub: 14200,
      },
    },
    {
      hubIata: 'SVO',
      hubCity: 'Москва',
      hubName: 'Шереметьево',
      domesticLeg: {
        airline: 'Аэрофлот',
        airlineCode: 'SU',
        flightNumber: 'SU 1443',
        fromIata: 'IKT',
        fromCity: 'Иркутск',
        toIata: 'SVO',
        toCity: 'Москва',
        duration: '6ч 05м',
        durationMinutes: 365,
        aircraft: 'Boeing 777-300ER',
        departureTime: '09:30',
        arrivalTime: '10:35',
        priceRub: 13500,
      },
    },
    {
      hubIata: 'BKK',
      hubCity: 'Бангкок',
      hubName: 'Суварнабхуми',
      domesticLeg: {
        airline: 'S7 Airlines',
        airlineCode: 'S7',
        flightNumber: 'S7 6301',
        fromIata: 'IKT',
        fromCity: 'Иркутск',
        toIata: 'BKK',
        toCity: 'Бангкок',
        duration: '6ч 20м',
        durationMinutes: 380,
        aircraft: 'Boeing 737-800',
        departureTime: '10:15',
        arrivalTime: '15:35',
        priceRub: 23800,
      },
    },
  ],

  // Красноярск
  KJA: [
    {
      hubIata: 'SVO',
      hubCity: 'Москва',
      hubName: 'Шереметьево',
      domesticLeg: {
        airline: 'Аэрофлот',
        airlineCode: 'SU',
        flightNumber: 'SU 1481',
        fromIata: 'KJA',
        fromCity: 'Красноярск',
        toIata: 'SVO',
        toCity: 'Москва',
        duration: '5ч 10м',
        durationMinutes: 310,
        aircraft: 'Boeing 737-800',
        departureTime: '07:20',
        arrivalTime: '08:30',
        priceRub: 9800,
      },
    },
    {
      hubIata: 'PEK',
      hubCity: 'Пекин',
      hubName: 'Дасин',
      domesticLeg: {
        airline: 'Россия / Аэрофлот',
        airlineCode: 'SU',
        flightNumber: 'SU 6629',
        fromIata: 'KJA',
        fromCity: 'Красноярск',
        toIata: 'PEK',
        toCity: 'Пекин',
        duration: '3ч 50м',
        durationMinutes: 230,
        aircraft: 'Boeing 737-800',
        departureTime: '21:30',
        arrivalTime: '03:20',
        priceRub: 16500,
      },
    },
  ],

  // Новосибирск
  OVB: [
    {
      hubIata: 'IST',
      hubCity: 'Стамбул',
      hubName: 'Стамбул Новый',
      domesticLeg: {
        airline: 'S7 Airlines',
        airlineCode: 'S7',
        flightNumber: 'S7 5889',
        fromIata: 'OVB',
        fromCity: 'Новосибирск',
        toIata: 'IST',
        toCity: 'Стамбул',
        duration: '6ч 30м',
        durationMinutes: 390,
        aircraft: 'Airbus A320neo',
        departureTime: '08:15',
        arrivalTime: '11:45',
        priceRub: 21500,
      },
    },
    {
      hubIata: 'DXB',
      hubCity: 'Дубай',
      hubName: 'Дубай International',
      domesticLeg: {
        airline: 'Flydubai',
        airlineCode: 'FZ',
        flightNumber: 'FZ 986',
        fromIata: 'OVB',
        fromCity: 'Новосибирск',
        toIata: 'DXB',
        toCity: 'Дубай',
        duration: '6ч 10м',
        durationMinutes: 370,
        aircraft: 'Boeing 737 MAX 8',
        departureTime: '06:40',
        arrivalTime: '09:50',
        priceRub: 24300,
      },
    },
  ],

  // Самара
  KUF: [
    {
      hubIata: 'SVO',
      hubCity: 'Москва',
      hubName: 'Шереметьево',
      domesticLeg: {
        airline: 'Аэрофлот',
        airlineCode: 'SU',
        flightNumber: 'SU 1603',
        fromIata: 'KUF',
        fromCity: 'Самара',
        toIata: 'SVO',
        toCity: 'Москва',
        duration: '1ч 50м',
        durationMinutes: 110,
        aircraft: 'Airbus A320',
        departureTime: '07:10',
        arrivalTime: '08:00',
        priceRub: 4900,
      },
    },
  ],

  // Екатеринбург
  SVX: [
    {
      hubIata: 'IST',
      hubCity: 'Стамбул',
      hubName: 'Стамбул Новый',
      domesticLeg: {
        airline: 'Red Wings / Smartavia',
        airlineCode: 'WZ',
        flightNumber: 'WZ 3061',
        fromIata: 'SVX',
        fromCity: 'Екатеринбург',
        toIata: 'IST',
        toCity: 'Стамбул',
        duration: '5ч 15м',
        durationMinutes: 315,
        aircraft: 'Sukhoi Superjet 100',
        departureTime: '08:50',
        arrivalTime: '12:05',
        priceRub: 18400,
      },
    },
    {
      hubIata: 'DXB',
      hubCity: 'Дубай',
      hubName: 'Дубай International',
      domesticLeg: {
        airline: 'Flydubai',
        airlineCode: 'FZ',
        flightNumber: 'FZ 902',
        fromIata: 'SVX',
        fromCity: 'Екатеринбург',
        toIata: 'DXB',
        toCity: 'Дубай',
        duration: '5ч 20м',
        durationMinutes: 320,
        aircraft: 'Boeing 737-800',
        departureTime: '15:10',
        arrivalTime: '19:30',
        priceRub: 22100,
      },
    },
  ],
};

// Запрещенные тестовые авиакомпании из Sandbox
export const FORBIDDEN_TEST_AIRLINES = ['ZZ', 'DF', 'DUFFEL AIRWAYS', 'MOCK AIRLINE'];

/**
 * Проверяет, является ли предложение тестовой галлюцинацией песочницы Duffel
 */
export function isTestSandboxCarrier(carrierName?: string, carrierCode?: string): boolean {
  if (!carrierName && !carrierCode) return false;
  const nameNorm = String(carrierName || '').toUpperCase();
  const codeNorm = String(carrierCode || '').toUpperCase();

  return FORBIDDEN_TEST_AIRLINES.some(
    (forbidden) => nameNorm.includes(forbidden) || codeNorm === forbidden
  );
}

/**
 * Получает реальное первое плечо из региона РФ до хаба
 */
export function getRegionalHubConnection(originIata: string, preferredDestinationIata?: string): HubConnection | null {
  const routes = REGIONAL_HUB_ROUTES[originIata.toUpperCase()];
  if (!routes || routes.length === 0) return null;

  // Если направление в Азию, отдаем предпочтение Пекину или Бангкоку, если в Европу — Стамбулу или Москве
  if (preferredDestinationIata) {
    const isAsia = ['PEK', 'CAN', 'PVG', 'BKK', 'HKT', 'DAD', 'HAN', 'SGN', 'TYO', 'ICN', 'DPS', 'DAC', 'CGP'].includes(
      preferredDestinationIata.toUpperCase()
    );
    if (isAsia) {
      const asiaHub = routes.find((r) => ['PEK', 'BKK', 'DXB', 'TAS', 'ALA'].includes(r.hubIata));
      if (asiaHub) return asiaHub;
    }
  }

  return routes[0];
}

/**
 * Проверяет физическую возможность прямого рейса между точками
 */
export function isDirectRouteFeasible(originIata: string, destinationIata: string, airlineCode: string): boolean {
  const origin = originIata.toUpperCase();
  const dest = destinationIata.toUpperCase();
  const code = airlineCode.toUpperCase();

  // Зарубежные перевозчики не летают напрямую из регионов РФ (кроме хабов вроде IST, DXB, DOH)
  const isRussianRegional = ['CSY', 'IKT', 'KJA', 'OVB', 'KUF', 'UUS', 'KHV'].includes(origin);
  const isInternationalCarrier = ['TK', 'EK', 'QR', 'LH', 'BA', 'AF', 'KL', 'EY'].includes(code);

  if (isRussianRegional && isInternationalCarrier) {
    return false;
  }

  return true;
}
