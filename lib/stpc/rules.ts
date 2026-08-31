import { StpcBenefit } from './types';

export interface AirlineStpcRule {
  airlineCode: string;
  airlineName: string;
  hubAirports: string[];
  minLayoverMinutes: number;
  maxLayoverMinutes: number;
  programType: StpcBenefit['type'];
  programName: string;
  hotelStars: number;
  nightsIncluded: number;
  estimatedSavingUsd: number;
  inclusions: StpcBenefit['inclusions'];
  conditions: string[];
  bookingInstructions: string;
}

export const STPC_AIRLINE_RULES: AirlineStpcRule[] = [
  {
    airlineCode: 'EK',
    airlineName: 'Emirates',
    hubAirports: ['DXB'],
    minLayoverMinutes: 480, // 8 часов (эконом) / 6 часов (бизнес)
    maxLayoverMinutes: 1440, // 24 часа
    programType: 'STPC_FREE_HOTEL',
    programName: 'Dubai Connect',
    hotelStars: 4,
    nightsIncluded: 1,
    estimatedSavingUsd: 120,
    inclusions: { hotel: true, transfer: true, meals: true, visaSupport: true },
    conditions: [
      'Единый билет Emirates (код 176)',
      'Отсутствие более короткой стыковки на маршруте в расписании',
      'Минимальная стыковка: от 8 часов для эконома (от 6 часов для бизнес/первого класса)'
    ],
    bookingInstructions: 'Бронируется через раздел «Управление бронированием» на сайте Emirates не позднее чем за 24 часа до вылета.'
  },
  {
    airlineCode: 'TK',
    airlineName: 'Turkish Airlines',
    hubAirports: ['IST', 'SAW'],
    minLayoverMinutes: 720, // 12 часов для эконома (9 для бизнеса)
    maxLayoverMinutes: 1440, // 24 часа
    programType: 'STPC_FREE_HOTEL',
    programName: 'Turkish Airlines Transit Hotel',
    hotelStars: 4,
    nightsIncluded: 1,
    estimatedSavingUsd: 95,
    inclusions: { hotel: true, transfer: true, meals: false, visaSupport: false },
    conditions: [
      'Стыковка от 12 часов для Эконом-класса (от 9 часов для Бизнес-класса)',
      'Вынужденная пересадка (нет более раннего рейса TK)'
    ],
    bookingInstructions: 'Оформляется на стойке Hotel Desk в аэропорту Стамбула после прохождения паспортного контроля.'
  },
  {
    airlineCode: 'TK',
    airlineName: 'Turkish Airlines',
    hubAirports: ['IST'],
    minLayoverMinutes: 1200, // 20+ часов
    maxLayoverMinutes: 4320, // до 72 часов
    programType: 'STOPOVER_PROGRAM',
    programName: 'Stopover in Istanbul',
    hotelStars: 4,
    nightsIncluded: 1,
    estimatedSavingUsd: 110,
    inclusions: { hotel: true, transfer: false, meals: false, visaSupport: false },
    conditions: [
      'Добровольная остановка в Стамбуле от 20 часов',
      'Билет туда-обратно (Round-trip) авиакомпании Turkish Airlines',
      '1 ночь 4★ (эконом) / 2 ночи 5★ (бизнес-класс)'
    ],
    bookingInstructions: 'Ваучер на отель заказывается на сайте Turkish Airlines минимум за 72 часа до первого рейса.'
  },
  {
    airlineCode: 'QR',
    airlineName: 'Qatar Airways',
    hubAirports: ['DOH'],
    minLayoverMinutes: 480, // 8 часов
    maxLayoverMinutes: 1440, // 24 часа
    programType: 'STPC_FREE_HOTEL',
    programName: 'Qatar Airways Transit Accommodation',
    hotelStars: 5,
    nightsIncluded: 1,
    estimatedSavingUsd: 130,
    inclusions: { hotel: true, transfer: true, meals: true, visaSupport: true },
    conditions: [
      'Стыковка 8–24 часа при отсутствии рейса с более короткой пересадкой',
      'Тарифный класс билета подтверждает право на STPC'
    ],
    bookingInstructions: 'Оформляется через сайт Qatar Airways или сервисный центр до вылета.'
  },
  {
    airlineCode: 'QR',
    airlineName: 'Qatar Airways',
    hubAirports: ['DOH'],
    minLayoverMinutes: 720, // 12 часов
    maxLayoverMinutes: 5760, // до 96 часов
    programType: 'STOPOVER_PROGRAM',
    programName: 'Discover Qatar Stopover',
    hotelStars: 4,
    nightsIncluded: 1,
    estimatedSavingUsd: 80,
    inclusions: { hotel: true, transfer: false, meals: false, visaSupport: true },
    conditions: [
      'Добровольная стыковка в Дохе от 12 до 96 часов',
      'Субсидированные отели 4–5★ от $14/ночь'
    ],
    bookingInstructions: 'Бронируется через портал Discover Qatar перед вылетом.'
  },
  {
    airlineCode: 'GF',
    airlineName: 'Gulf Air',
    hubAirports: ['BAH'],
    minLayoverMinutes: 480, // 8 часов
    maxLayoverMinutes: 1440, // 24 часа
    programType: 'STPC_FREE_HOTEL',
    programName: 'Gulf Air Bahrain Stopover',
    hotelStars: 4,
    nightsIncluded: 1,
    estimatedSavingUsd: 85,
    inclusions: { hotel: true, transfer: true, meals: true, visaSupport: true },
    conditions: [
      'Вынужденная пересадка 8–24 часа в Бахрейне',
      'Тариф билета соответствует минимальным требованиям программы'
    ],
    bookingInstructions: 'Запрос подается при покупке билета или на стойке транзита в аэропорту Бахрейна.'
  },
  {
    airlineCode: 'EY',
    airlineName: 'Etihad Airways',
    hubAirports: ['AUH'],
    minLayoverMinutes: 1440, // 24+ часа
    maxLayoverMinutes: 4320, // до 72 часов
    programType: 'STOPOVER_PROGRAM',
    programName: 'Abu Dhabi Stopover',
    hotelStars: 4,
    nightsIncluded: 1,
    estimatedSavingUsd: 115,
    inclusions: { hotel: true, transfer: false, meals: false, visaSupport: false },
    conditions: [
      'Остановка в Абу-Даби от 24 часов',
      '1–2 бесплатные ночи в партнерских отелях 3–4★'
    ],
    bookingInstructions: 'Бронируется на официальном сайте Etihad Airways через раздел Stopover в процессе бронирования билета.'
  },
  {
    airlineCode: 'SV',
    airlineName: 'Saudia',
    hubAirports: ['JED', 'RUH'],
    minLayoverMinutes: 720, // 12 часов
    maxLayoverMinutes: 5760, // до 96 часов
    programType: 'STOPOVER_PROGRAM',
    programName: 'Saudia Transit Program',
    hotelStars: 4,
    nightsIncluded: 1,
    estimatedSavingUsd: 90,
    inclusions: { hotel: true, transfer: false, meals: false, visaSupport: true },
    conditions: [
      'Бесплатная транзитная виза на 96 часов',
      '1 бесплатная ночь в отеле при бронировании через Saudia Holidays'
    ],
    bookingInstructions: 'Оформляется автоматически при покупке билета на сайте Saudia вместе с транзитной визой.'
  },
  {
    airlineCode: 'CA',
    airlineName: 'Air China',
    hubAirports: ['PEK', 'PKX', 'CTU', 'PVG'],
    minLayoverMinutes: 360, // 6 часов
    maxLayoverMinutes: 1440, // 24 часа
    programType: 'STPC_FREE_HOTEL',
    programName: 'Air China Free Transit Hotel',
    hotelStars: 4,
    nightsIncluded: 1,
    estimatedSavingUsd: 70,
    inclusions: { hotel: true, transfer: true, meals: true, visaSupport: false },
    conditions: [
      'Международный транзитный рейс Air China через хабы в Китае (PEK, PKX, CTU, PVG)',
      'Стыковка от 6 до 24 часов'
    ],
    bookingInstructions: 'Бронируется через мобильное приложение или сайт Air China после покупки билета.'
  },
  {
    airlineCode: 'CZ',
    airlineName: 'China Southern',
    hubAirports: ['CAN', 'PKX', 'CSX'],
    minLayoverMinutes: 360, // 6 часов
    maxLayoverMinutes: 1440, // 24 часа
    programType: 'STPC_FREE_HOTEL',
    programName: 'China Southern Free Transit Hotel',
    hotelStars: 4,
    nightsIncluded: 1,
    estimatedSavingUsd: 70,
    inclusions: { hotel: true, transfer: true, meals: true, visaSupport: false },
    conditions: [
      'Международный стыковочный рейс China Southern через Гуанчжоу (CAN) или Пекин (PKX)',
      'Стыковка от 6 до 24 часов'
    ],
    bookingInstructions: 'Оформляется в мобильном приложении China Southern или на транзитной стойке авиакомпании.'
  },
  {
    airlineCode: 'ET',
    airlineName: 'Ethiopian Airlines',
    hubAirports: ['ADD'],
    minLayoverMinutes: 480, // 8 часов
    maxLayoverMinutes: 1440, // 24 часа
    programType: 'STPC_FREE_HOTEL',
    programName: 'Addis Transit Hotel',
    hotelStars: 4,
    nightsIncluded: 1,
    estimatedSavingUsd: 80,
    inclusions: { hotel: true, transfer: true, meals: true, visaSupport: true },
    conditions: [
      'Международная стыковка в Аддис-Абебе (ADD) длительностью более 8 часов',
      'Вынужденная пересадка при отсутствии более раннего стыковочного рейса'
    ],
    bookingInstructions: 'Ваучер на бесплатный отель, трансфер и транзитную визу выдается на стойке Interline Desk в аэропорту ADD.'
  }
];
