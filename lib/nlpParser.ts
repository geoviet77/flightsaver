import { ParsedSearchParams, Currency, CabinClass, TimePreference, QuickReplyOption } from './types';

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
    variations: ['питер', 'питера', 'питере', 'питеру', 'питером', 'санкт-петербург', 'санкт-петербурга', 'санкт-петербурге', 'санктпетербург', 'санктпетербурга', 'спб', 'петербург', 'петербурга', 'петербурге', 'пулково', 'led', 'spb', 'st petersburg', 'saint petersburg']
  },
  {
    nameRu: 'Мюнхен',
    nameEn: 'Munich',
    iata: 'MUC',
    variations: ['мюнхен', 'мюнхена', 'мюнхене', 'мюнхену', 'мюнхеном', 'мунхен', 'мунхена', 'muc', 'munich', 'münchen']
  },
  {
    nameRu: 'Екатеринбург',
    nameEn: 'Yekaterinburg',
    iata: 'SVX',
    variations: ['екатеринбург', 'екатеринбурга', 'екатеринбурге', 'екатиринбург', 'екатиринбурга', 'екб', 'кольцово', 'svx', 'yekaterinburg', 'ekaterinburg']
  },
  {
    nameRu: 'Самара',
    nameEn: 'Samara',
    iata: 'KUF',
    variations: ['самара', 'самары', 'самаре', 'самару', 'самарой', 'kuf', 'samara', 'курумоч']
  },
  {
    nameRu: 'Люксембург',
    nameEn: 'Luxembourg',
    iata: 'LUX',
    variations: ['люксембург', 'люксембурга', 'люксенбург', 'люксенбурга', 'люксенбурге', 'lux', 'luxembourg']
  },
  {
    nameRu: 'Иркутск',
    nameEn: 'Irkutsk',
    iata: 'IKT',
    variations: ['иркутск', 'иркутска', 'иркутске', 'иркутску', 'иркутском', 'байкал', 'ikt', 'irkutsk']
  },
  {
    nameRu: 'Красноярск',
    nameEn: 'Krasnoyarsk',
    iata: 'KJA',
    variations: ['красноярск', 'красноярска', 'красноярске', 'красноярску', 'красноярском', 'емельяново', 'kja', 'krasnoyarsk']
  },
  {
    nameRu: 'Дюссельдорф',
    nameEn: 'Dusseldorf',
    iata: 'DUS',
    variations: ['дюссельдорф', 'дюссельдорфа', 'дюссельдорфе', 'дюссельдорфу', 'дюссельдорфом', 'дуссельдорф', 'dus', 'dusseldorf', 'düsseldorf']
  },
  {
    nameRu: 'Пекин',
    nameEn: 'Beijing',
    iata: 'PEK',
    variations: ['пекин', 'пекина', 'пекине', 'пекину', 'пекином', 'дасин', 'шоуду', 'pek', 'pkx', 'bjs', 'beijing']
  },
  {
    nameRu: 'Гуанчжоу',
    nameEn: 'Guangzhou',
    iata: 'CAN',
    variations: ['гуанчжоу', 'байюнь', 'can', 'guangzhou']
  },
  {
    nameRu: 'Чебоксары',
    nameEn: 'Cheboksary',
    iata: 'CSY',
    variations: ['чебоксары', 'чебоксар', 'чебоксарах', 'чебоксарам', 'csy', 'cheboksary']
  },
  {
    nameRu: 'Владивосток',
    nameEn: 'Vladivostok',
    iata: 'VVO',
    variations: ['владивосток', 'владивостока', 'владивостоке', 'владивостоку', 'кневичи', 'vvo', 'vladivostok']
  },
  {
    nameRu: 'Хабаровск',
    nameEn: 'Khabarovsk',
    iata: 'KHV',
    variations: ['хабаровск', 'хабаровска', 'хабаровске', 'хабаровску', 'новый', 'khv', 'khabarovsk']
  },
  {
    nameRu: 'Новосибирск',
    nameEn: 'Novosibirsk',
    iata: 'OVB',
    variations: ['новосибирск', 'новосибирска', 'новосибирске', 'новосибирску', 'толмачево', 'ovb', 'novosibirsk']
  },
  {
    nameRu: 'Минск',
    nameEn: 'Minsk',
    iata: 'MSQ',
    variations: ['минск', 'минска', 'минске', 'минску', 'msq', 'minsk']
  },
  {
    nameRu: 'Астана',
    nameEn: 'Astana',
    iata: 'NQZ',
    variations: ['астана', 'астаны', 'астане', 'нурсултан', 'nqz', 'tse', 'astana']
  },
  {
    nameRu: 'Ташкент',
    nameEn: 'Tashkent',
    iata: 'TAS',
    variations: ['ташкент', 'ташкента', 'ташкенте', 'tas', 'tashkent']
  },
  {
    nameRu: 'Алматы',
    nameEn: 'Almaty',
    iata: 'ALA',
    variations: ['алматы', 'алма-ата', 'ala', 'almaty']
  },
  {
    nameRu: 'Уфа',
    nameEn: 'Ufa',
    iata: 'UFA',
    variations: ['уфа', 'уфы', 'уфе', 'уфу', 'ufa']
  },
  {
    nameRu: 'Калининград',
    nameEn: 'Kaliningrad',
    iata: 'KGD',
    variations: ['калининград', 'калининграда', 'калининграде', 'храброво', 'kgd', 'kaliningrad']
  },
  {
    nameRu: 'Минеральные Воды',
    nameEn: 'Mineralnye Vody',
    iata: 'MRV',
    variations: ['минеральные воды', 'минводы', 'минвод', 'минводах', 'кмв', 'mrv']
  },
  {
    nameRu: 'Абу-Даби',
    nameEn: 'Abu Dhabi',
    iata: 'AUH',
    variations: ['абу-даби', 'абу даби', 'абудаби', 'auh', 'abu dhabi']
  },
  {
    nameRu: 'Сеул',
    nameEn: 'Seoul',
    iata: 'ICN',
    variations: ['сеул', 'сеула', 'сеуле', 'инчхон', 'icn', 'gmp', 'seoul']
  },
  {
    nameRu: 'Сингапур',
    nameEn: 'Singapore',
    iata: 'SIN',
    variations: ['сингапур', 'сингапура', 'сингапуре', 'чанги', 'sin', 'singapore']
  },
  {
    nameRu: 'Куала-Лумпур',
    nameEn: 'Kuala Lumpur',
    iata: 'KUL',
    variations: ['куала-лумпур', 'куала лумпур', 'куалалумпур', 'kul', 'kuala lumpur']
  },
  {
    nameRu: 'Ханой',
    nameEn: 'Hanoi',
    iata: 'HAN',
    variations: ['ханой', 'ханоя', 'ханое', 'нойбай', 'han', 'hanoi']
  },
  {
    nameRu: 'Хошимин',
    nameEn: 'Ho Chi Minh',
    iata: 'SGN',
    variations: ['хошимин', 'хошимина', 'хошимине', 'сайгон', 'таншоннят', 'sgn', 'saigon']
  },
  {
    nameRu: 'Анталья',
    nameEn: 'Antalya',
    iata: 'AYT',
    variations: ['анталья', 'антальи', 'анталье', 'ayt', 'antalya']
  },
  {
    nameRu: 'Париж',
    nameEn: 'Paris',
    iata: 'CDG',
    variations: ['париж', 'парижа', 'париже', 'парижу', 'cdg', 'paris']
  },
  {
    nameRu: 'Рим',
    nameEn: 'Rome',
    iata: 'FCO',
    variations: ['рим', 'рима', 'риме', 'риму', 'fco', 'rome', 'roma']
  },
  {
    nameRu: 'Берлин',
    nameEn: 'Berlin',
    iata: 'BER',
    variations: ['берлин', 'берлина', 'берлине', 'берлину', 'ber', 'berlin']
  },
  {
    nameRu: 'Франкфурт',
    nameEn: 'Frankfurt',
    iata: 'FRA',
    variations: ['франкфурт', 'франкфурта', 'франкфурте', 'франкфурту', 'fra', 'frankfurt']
  },
  {
    nameRu: 'Вена',
    nameEn: 'Vienna',
    iata: 'VIE',
    variations: ['вена', 'вены', 'вене', 'вену', 'vie', 'vienna', 'wien']
  },
  {
    nameRu: 'Цюрих',
    nameEn: 'Zurich',
    iata: 'ZRH',
    variations: ['цюрих', 'цюриха', 'цюрихе', 'цюриху', 'zrh', 'zurich', 'zürich']
  },
  {
    nameRu: 'Милан',
    nameEn: 'Milan',
    iata: 'MXP',
    variations: ['милан', 'милана', 'милане', 'милану', 'mxp', 'milan', 'milano']
  },
  {
    nameRu: 'Парма',
    nameEn: 'Parma',
    iata: 'PMF',
    variations: ['парма', 'пармы', 'парме', 'парму', 'pmf', 'parma']
  },
  {
    nameRu: 'Мадрид',
    nameEn: 'Madrid',
    iata: 'MAD',
    variations: ['мадрид', 'мадрида', 'мадриде', 'мадриду', 'mad', 'madrid']
  },
  {
    nameRu: 'Барселона',
    nameEn: 'Barcelona',
    iata: 'BCN',
    variations: ['барселона', 'барселоны', 'барселоне', 'барселону', 'bcn', 'barcelona']
  },
  {
    nameRu: 'Амстердам',
    nameEn: 'Amsterdam',
    iata: 'AMS',
    variations: ['амстердам', 'амстердама', 'амстердаме', 'ams', 'amsterdam']
  },
  {
    nameRu: 'Прага',
    nameEn: 'Prague',
    iata: 'PRG',
    variations: ['прага', 'праги', 'праге', 'прагу', 'prg', 'prague', 'praha']
  },
  {
    nameRu: 'Ереван',
    nameEn: 'Yerevan',
    iata: 'EVN',
    variations: ['ереван', 'еревана', 'ереване', 'еревану', 'звартноц', 'evn', 'yerevan']
  },
  {
    nameRu: 'Баку',
    nameEn: 'Baku',
    iata: 'GYD',
    variations: ['баку', 'баку', 'gyd', 'baku']
  },
  {
    nameRu: 'Белград',
    nameEn: 'Belgrade',
    iata: 'BEG',
    variations: ['белград', 'белграда', 'белграде', 'beg', 'belgrade']
  },
  {
    nameRu: 'Браззавиль (Конго)',
    nameEn: 'Brazzaville',
    iata: 'BZV',
    variations: ['конго', 'браззавиль', 'браззавиля', 'браззавиле', 'bzv', 'brazzaville', 'congo', 'maya-maya']
  },
  {
    nameRu: 'Киншаса (Конго)',
    nameEn: 'Kinshasa',
    iata: 'FIH',
    variations: ['киншаса', 'киншасы', 'киншасе', 'fih', 'kinshasa']
  },
  {
    nameRu: 'Аддис-Абеба',
    nameEn: 'Addis Ababa',
    iata: 'ADD',
    variations: ['аддис-абеба', 'аддис абеба', 'аддисабеба', 'add', 'addis ababa']
  },
  {
    nameRu: 'Доха',
    nameEn: 'Doha',
    iata: 'DOH',
    variations: ['доха', 'дохи', 'дохе', 'doh', 'doha', 'хамад']
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
    nameRu: 'Дананг',
    nameEn: 'Da Nang',
    iata: 'DAD',
    variations: ['дананг', 'дананга', 'дананге', 'данангу', 'да нанг', 'да-нанг', 'dad', 'danang', 'da nang']
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
    nameRu: 'Лондон',
    nameEn: 'London',
    iata: 'LON',
    variations: ['лондон', 'лондона', 'лондоне', 'лондону', 'хитроу', 'гатвик', 'lhr', 'lgw', 'lon', 'london']
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
    nameRu: 'Южно-Сахалинск',
    nameEn: 'Yuzhno-Sakhalinsk',
    iata: 'UUS',
    variations: ['южно-сахалинск', 'южно-сахалинска', 'южно-сахалинске', 'южно-сахалинску', 'южносахалинск', 'южносахалинска', 'южносахалинске', 'южносахалинску', 'южно сахалинск', 'южно сахалинска', 'южно сахалинске', 'сахалинск', 'сахалинска', 'сахалинске', 'сахалин', 'сахалина', 'хомутово', 'uus', 'yuzhno-sakhalinsk']
  },
  {
    nameRu: 'Владивосток',
    nameEn: 'Vladivostok',
    iata: 'VVO',
    variations: ['владивосток', 'владивостока', 'владивостоке', 'владивостоку', 'владик', 'вво', 'кневичи', 'vvo', 'vladivostok']
  },
  {
    nameRu: 'Новосибирск',
    nameEn: 'Novosibirsk',
    iata: 'OVB',
    variations: ['новосибирск', 'новосибирска', 'новосибирске', 'новосибирску', 'новосиб', 'нск', 'толмачево', 'ovb', 'novosibirsk']
  },
  {
    nameRu: 'Хабаровск',
    nameEn: 'Khabarovsk',
    iata: 'KHV',
    variations: ['хабаровск', 'хабаровска', 'хабаровске', 'хабаровску', 'хаб', 'новый', 'khv', 'khabarovsk']
  },
  {
    nameRu: 'Иркутск',
    nameEn: 'Irkutsk',
    iata: 'IKT',
    variations: ['иркутск', 'иркутска', 'иркутске', 'иркутску', 'байкал', 'ikt', 'irkutsk']
  },
  {
    nameRu: 'Красноярск',
    nameEn: 'Krasnoyarsk',
    iata: 'KJA',
    variations: ['красноярск', 'красноярска', 'красноярске', 'красноярску', 'емельяново', 'kja', 'krasnoyarsk']
  },
  {
    nameRu: 'Самара',
    nameEn: 'Samara',
    iata: 'KUF',
    variations: ['самара', 'самары', 'самаре', 'самару', 'самарой', 'курумоч', 'kuf', 'samara']
  },
  {
    nameRu: 'Уфа',
    nameEn: 'Ufa',
    iata: 'UFA',
    variations: ['уфа', 'уфы', 'уфе', 'уфу', 'уфой', 'ufa']
  },
  {
    nameRu: 'Калининград',
    nameEn: 'Kaliningrad',
    iata: 'KGD',
    variations: ['калининград', 'калининграда', 'калининграде', 'калининграду', 'храброво', 'клд', 'kgd', 'kaliningrad']
  },
  {
    nameRu: 'Минеральные Воды',
    nameEn: 'Mineralnye Vody',
    iata: 'MRV',
    variations: ['минеральные воды', 'минеральных вод', 'минеральным водам', 'минводы', 'минвод', 'минводам', 'мин воды', 'кмв', 'mrv', 'mineralnye vody']
  },
  {
    nameRu: 'Ташкент',
    nameEn: 'Tashkent',
    iata: 'TAS',
    variations: ['ташкент', 'ташкента', 'ташкенте', 'ташкенту', 'tas', 'tashkent']
  },
  {
    nameRu: 'Алматы',
    nameEn: 'Almaty',
    iata: 'ALA',
    variations: ['алматы', 'алма-ата', 'алма-аты', 'алмаата', 'алмааты', 'ala', 'almaty']
  },
  {
    nameRu: 'Астана',
    nameEn: 'Astana',
    iata: 'NQZ',
    variations: ['астана', 'астаны', 'астане', 'астану', 'нур-султан', 'нурсултан', 'nqz', 'astana']
  },
  {
    nameRu: 'Минск',
    nameEn: 'Minsk',
    iata: 'MSQ',
    variations: ['минск', 'минска', 'минске', 'минску', 'msq', 'minsk']
  },
  {
    nameRu: 'Баку',
    nameEn: 'Baku',
    iata: 'GYD',
    variations: ['баку', 'gyd', 'baku']
  },
  {
    nameRu: 'Хошимин',
    nameEn: 'Ho Chi Minh City',
    iata: 'SGN',
    variations: ['хошимин', 'хошимина', 'хошимине', 'хошимину', 'сайгон', 'сайгона', 'таншоннят', 'sgn', 'ho chi minh']
  },
  {
    nameRu: 'Ханой',
    nameEn: 'Hanoi',
    iata: 'HAN',
    variations: ['ханой', 'ханоя', 'ханое', 'ханою', 'нойбай', 'han', 'hanoi']
  },
  {
    nameRu: 'Доха',
    nameEn: 'Doha',
    iata: 'DOH',
    variations: ['доха', 'дохи', 'дохе', 'доху', 'хамад', 'doh', 'doha']
  },
  {
    nameRu: 'Абу-Даби',
    nameEn: 'Abu Dhabi',
    iata: 'AUH',
    variations: ['абу-даби', 'абу даби', 'абудаби', 'auh', 'abu dhabi']
  },
  {
    nameRu: 'Сингапур',
    nameEn: 'Singapore',
    iata: 'SIN',
    variations: ['сингапур', 'сингапура', 'сингапуре', 'сингапуру', 'чанги', 'sin', 'singapore']
  },
  {
    nameRu: 'Куала-Лумпур',
    nameEn: 'Kuala Lumpur',
    iata: 'KUL',
    variations: ['куала-лумпур', 'куала лумпур', 'куалалумпур', 'куала-лумпура', 'куала-лумпуре', 'kul', 'kuala lumpur']
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
    .replace(/[,?!;]/g, ' ')
    .replace(/\.(?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findCityInText(text: string, prepositionRegex?: RegExp): CityEntity | null {
  // Sort by longest matching variation first
  const sortedCities = [...CITY_DATABASE].sort((a, b) => {
    const maxA = Math.max(...a.variations.map(v => v.length));
    const maxB = Math.max(...b.variations.map(v => v.length));
    return maxB - maxA;
  });

  for (const city of sortedCities) {
    for (const variation of city.variations) {
      if (prepositionRegex) {
        const match = text.match(new RegExp(`(?:^|\\s)${prepositionRegex.source}\\s+${variation.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?:\\s|$)`, 'i'));
        if (match) return city;
      } else {
        const regex = new RegExp(`(?:^|\\s)${variation.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?:\\s|$)`, 'i');
        if (regex.test(text)) return city;
      }
    }
  }
  return null;
}

export function parseTravelQuery(rawText: string, previousParams?: ParsedSearchParams | null): ParsedSearchParams {
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

  // If preposition-based matching did not find both cities, scan by occurrence index in query
  if (!originCityEntity || !destinationCityEntity) {
    const foundCities: { city: CityEntity; index: number; length: number }[] = [];
    const sortedCities = [...CITY_DATABASE].sort((a, b) => {
      const maxA = Math.max(...a.variations.map(v => v.length));
      const maxB = Math.max(...b.variations.map(v => v.length));
      return maxB - maxA;
    });

    for (const city of sortedCities) {
      for (const variation of city.variations) {
        const regex = new RegExp(`(?:^|\\s)${variation.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?:\\s|$)`, 'i');
        const match = text.match(regex);
        if (match && match.index !== undefined) {
          if (!foundCities.some(fc => fc.city.iata === city.iata)) {
            foundCities.push({ city, index: match.index, length: variation.length });
          }
        }
      }
    }

    foundCities.sort((a, b) => a.index - b.index);

    if (!originCityEntity && !destinationCityEntity) {
      if (foundCities.length >= 2) {
        originCityEntity = foundCities[0].city;
        destinationCityEntity = foundCities[1].city;
      } else if (foundCities.length === 1) {
        destinationCityEntity = foundCities[0].city;
      }
    } else if (originCityEntity && !destinationCityEntity) {
      const other = foundCities.find(fc => fc.city.iata !== originCityEntity!.iata);
      if (other) destinationCityEntity = other.city;
    } else if (!originCityEntity && destinationCityEntity) {
      const other = foundCities.find(fc => fc.city.iata !== destinationCityEntity!.iata);
      if (other) originCityEntity = other.city;
    }
  }

  const isDestinationSpecified = Boolean(destinationCityEntity);
  const finalDest = destinationCityEntity || (previousParams?.destinationCity && previousParams?.destinationIata ? {
    nameRu: previousParams.destinationCity,
    nameEn: previousParams.destinationCity,
    iata: previousParams.destinationIata,
    variations: [String(previousParams.destinationCity).toLowerCase()]
  } : null);

  const isOriginDefaulted = !originCityEntity && !previousParams?.originCity;
  const finalOrigin = originCityEntity || (previousParams?.originCity && previousParams?.originIata ? {
    nameRu: previousParams.originCity,
    nameEn: previousParams.originCity,
    iata: previousParams.originIata,
    variations: [String(previousParams.originCity).toLowerCase()]
  } : null);

  if (finalOrigin && finalDest) {
    confidenceScore += 0.25;
  }

  // 2. Dates, Months, Duration & Relative time
  let departureMonth: string | undefined = previousParams?.departureMonth;
  let departureDate: string | undefined = previousParams?.departureDate;
  let returnDate: string | undefined = previousParams?.returnDate;
  let durationDays: number | undefined = previousParams?.durationDays;
  let isWeekend = false;
  let isTomorrow = false;

  // Date Range (e.g. "10-30 сентября", "12-25 сентября", "с 10 по 30 сентября 2026")
  const dateRangeMatch = text.match(/(?:с\s+)?(\d{1,2})\s*(?:-|–|—|по|до|\s+по\s+)\s*(\d{1,2})\s+(январ[яе]?|феврал[яе]?|март[ае]?|апрел[яе]?|ма[яе]?|июн[яе]?|июл[яе]?|август[ае]?|сентябр[яе]?|октябр[яе]?|ноябр[яе]?|декабр[яе]?)(?:\s+(\d{4}))?/i);
  if (dateRangeMatch) {
    const dayFrom = parseInt(dateRangeMatch[1], 10);
    const dayTo = parseInt(dateRangeMatch[2], 10);
    const mStr = dateRangeMatch[3].toLowerCase();
    const year = dateRangeMatch[4] ? parseInt(dateRangeMatch[4], 10) : 2026;
    let mIndex = 8;
    for (const [key, val] of Object.entries(MONTH_MAP)) {
      if (mStr.startsWith(key) || key.startsWith(mStr.slice(0, 3))) {
        mIndex = val.index;
        departureMonth = val.nameRu;
        break;
      }
    }
    const monthFormatted = String(mIndex + 1).padStart(2, '0');
    departureDate = `${year}-${monthFormatted}-${String(dayFrom).padStart(2, '0')}`;
    returnDate = `${year}-${monthFormatted}-${String(dayTo).padStart(2, '0')}`;
    durationDays = Math.max(1, dayTo - dayFrom);
    confidenceScore += 0.3;
  } else {
    // Exact Day + Month (e.g. "12 сентября", "15 октября 2026")
    const exactDateMatch = text.match(/(\d{1,2})\s+(январ[яе]?|феврал[яе]?|март[ае]?|апрел[яе]?|ма[яе]?|июн[яе]?|июл[яе]?|август[ае]?|сентябр[яе]?|октябр[яе]?|ноябр[яе]?|декабр[яе]?)(?:\s+(\d{4}))?/i);
    if (exactDateMatch) {
      const day = parseInt(exactDateMatch[1], 10);
      const mStr = exactDateMatch[2].toLowerCase();
      const year = exactDateMatch[3] ? parseInt(exactDateMatch[3], 10) : 2026;
      let mIndex = 8; // default September
      for (const [key, val] of Object.entries(MONTH_MAP)) {
        if (mStr.startsWith(key) || key.startsWith(mStr.slice(0, 3))) {
          mIndex = val.index;
          departureMonth = val.nameRu;
          break;
        }
      }
      const dayFormatted = String(day).padStart(2, '0');
      const monthFormatted = String(mIndex + 1).padStart(2, '0');
      const parsedIso = `${year}-${monthFormatted}-${dayFormatted}`;
      if (previousParams?.departureDate && parsedIso >= previousParams.departureDate && !text.includes('вылет')) {
        returnDate = parsedIso;
      } else {
        departureDate = parsedIso;
      }
      confidenceScore += 0.2;
    } else {
      for (const [key, val] of Object.entries(MONTH_MAP)) {
        if (text.includes(key)) {
          departureMonth = val.nameRu;
          confidenceScore += 0.1;
          break;
        }
      }
    }
  }

  // Numeric Date (e.g. "14.09", "14.09.2026", "14/09", "14-09", "29.10")
  const numericDateMatch = text.match(/(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{4}))?/);
  if (numericDateMatch) {
    const day = parseInt(numericDateMatch[1], 10);
    const m = parseInt(numericDateMatch[2], 10);
    const year = numericDateMatch[3] ? parseInt(numericDateMatch[3], 10) : 2026;
    if (m >= 1 && m <= 12 && day >= 1 && day <= 31) {
      const parsedIso = `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (previousParams?.departureDate && parsedIso >= previousParams.departureDate && !text.includes('вылет')) {
        returnDate = parsedIso;
      } else if (!departureDate) {
        departureDate = parsedIso;
      }
      for (const [_, val] of Object.entries(MONTH_MAP)) {
        if (val.index === m - 1) {
          departureMonth = val.nameRu;
          break;
        }
      }
      confidenceScore += 0.25;
    }
  }

  // Relative return: "обратно через 7 дней", "обратно через 14 дней", "обратно 29 сентября"
  const relativeReturnDaysMatch = text.match(/обратно\s+через\s+(\d+)\s*(?:дн|дней|дня|days?)/i);
  if (relativeReturnDaysMatch && departureDate) {
    const daysToAdd = parseInt(relativeReturnDaysMatch[1], 10);
    const depTime = new Date(departureDate).getTime();
    const retTime = depTime + daysToAdd * 86400000;
    returnDate = new Date(retTime).toISOString().split('T')[0];
    durationDays = daysToAdd;
  }

  const relativeReturnDateMatch = text.match(/обратно\s+(\d{1,2})\s+(январ[яе]?|феврал[яе]?|март[ае]?|апрел[яе]?|ма[яе]?|июн[яе]?|июл[яе]?|август[ае]?|сентябр[яе]?|октябр[яе]?|ноябр[яе]?|декабр[яе]?)(?:\s+(\d{4}))?/i);
  if (relativeReturnDateMatch) {
    const rDay = parseInt(relativeReturnDateMatch[1], 10);
    const rMStr = relativeReturnDateMatch[2].toLowerCase();
    const rYear = relativeReturnDateMatch[3] ? parseInt(relativeReturnDateMatch[3], 10) : 2026;
    let rMIndex = 8;
    for (const [key, val] of Object.entries(MONTH_MAP)) {
      if (rMStr.startsWith(key) || key.startsWith(rMStr.slice(0, 3))) {
        rMIndex = val.index;
        break;
      }
    }
    const rMonthFormatted = String(rMIndex + 1).padStart(2, '0');
    returnDate = `${rYear}-${rMonthFormatted}-${String(rDay).padStart(2, '0')}`;
    if (departureDate) {
      const depTime = new Date(departureDate).getTime();
      const retTime = new Date(returnDate).getTime();
      durationDays = Math.max(1, Math.round((retTime - depTime) / 86400000));
    }
  }

  if (/в\s+одну\s+сторону|one\s*way|только\s+туда|без\s+обратн/i.test(text)) {
    returnDate = undefined;
    durationDays = undefined;
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
  let adults = previousParams?.adults || 1;
  let children = previousParams?.children || 0;
  let infants = previousParams?.infants || 0;
  let passengerDescription = previousParams?.passengerDescription || '1 взрослый';

  const explicitPassengerMatch = text.match(/(\d+)\s*(?:пасс|пассажир|взросл|эконом|билет|человек|мест)/i);
  if (explicitPassengerMatch) {
    adults = parseInt(explicitPassengerMatch[1], 10);
    passengerDescription = `${adults} ${adults === 1 ? 'взрослый' : adults >= 2 && adults <= 4 ? 'взрослых' : 'пассажиров'}`;
  } else if (/на\s+двоих|на\s+2\s+человек|2\s+пассажир/i.test(text)) {
    adults = 2;
    passengerDescription = '2 взрослых';
  } else if (/на\s+троих|на\s+3\s+человек|3\s+пассажир/i.test(text)) {
    adults = 3;
    passengerDescription = '3 взрослых';
  } else if (/на\s+четверых|на\s+4\s+человек|4\s+пассажир/i.test(text)) {
    adults = 4;
    passengerDescription = '4 взрослых';
  } else if (/на\s+пятерых|на\s+5\s+человек|5\s+пассажир/i.test(text)) {
    adults = 5;
    passengerDescription = '5 пассажиров';
  } else if (/на\s+шестерых|на\s+6\s+человек|6\s+пассажир/i.test(text)) {
    adults = 6;
    passengerDescription = '6 пассажиров';
  } else if (/на\s+семерых|на\s+7\s+человек|7\s+пассажир/i.test(text)) {
    adults = 7;
    passengerDescription = '7 пассажиров';
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
  const directOnly = /(?:без\s+пересадок|прямой|прямые|direct|nonstop)/i.test(text) || Boolean(previousParams?.directOnly);

  // 6. Advanced Semantic Travel Filters
  // STPC hotel
  const stpcHotelOnly = /(?:с\s+отелем|stpc|бесплатн\w*\s+отел|с\s+гостиниц|hotel)/i.test(text) || Boolean(previousParams?.stpcHotelOnly);

  // Visa-Free transit (TWOV)
  const visaFreeOnly = /(?:без\s+виз|без\s+транзитн\w*\s+виз|безвизов|twov|visa\s*free)/i.test(text) || Boolean(previousParams?.visaFreeOnly);

  // Luggage & Cabin class filters
  let hasLuggage: boolean | undefined = previousParams?.hasLuggage !== undefined ? previousParams.hasLuggage : undefined;
  let baggageIncluded: boolean = previousParams?.baggageIncluded !== undefined ? previousParams.baggageIncluded : false;
  if (/только\s*ручная\s*кладь|без\s*багажа|только\s*ручной|ручная\s*кладь/i.test(text)) {
    baggageIncluded = false;
    hasLuggage = false;
  } else if (/2\s*места\s*багажа|два\s*багажа|2\s*чемодана|2\s*места/i.test(text)) {
    baggageIncluded = true;
    hasLuggage = true;
  } else if (/с\s*багажом|багаж\s*23|багаж\s*включен|\+1\s*багаж|чемодан/i.test(text)) {
    baggageIncluded = true;
    hasLuggage = true;
  }

  let cabinClass: CabinClass = previousParams?.cabinClass || 'Economy';
  if (/первый\s*класс|first\s*class|first/i.test(text)) {
    cabinClass = 'First';
  } else if (/бизнес|бизнес-класс|business/i.test(text)) {
    cabinClass = 'Business';
  } else if (/премиум|комфорт|комфорт\s*\(премиум|premium\s*economy/i.test(text)) {
    cabinClass = 'Premium Economy';
  } else if (/эконом|эконом-класс|economy/i.test(text)) {
    cabinClass = 'Economy';
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

  // 7. Group Bookings (6+ passengers) & Corporate Account detection
  const isDestKnown = Boolean(destinationCityEntity || previousParams?.destinationCity);
  const isGroupBooking = passengersCount >= 6;
  const isCorporateRequested = /(?:юрлиц|корпорат|счет|по счету|компан)/i.test(text);
  const isIndividualConfirmed = /(?:физлиц|как физлицо)/i.test(text);

  let isCorporateAccount = Boolean(previousParams?.isCorporateAccount);
  if (isCorporateRequested) {
    isCorporateAccount = true;
  } else if (isIndividualConfirmed) {
    isCorporateAccount = false;
  }

  let needsClarification = !isDestKnown;
  let clarificationMessage: string | undefined = undefined;

  if (!isDestKnown) {
    needsClarification = true;
    clarificationMessage = 'Пожалуйста, уточните город или страну назначения.';
  } else if (isGroupBooking && !isCorporateRequested && !isIndividualConfirmed && previousParams?.isCorporateAccount === undefined) {
    needsClarification = true;
    clarificationMessage = 'Для групп от 6 человек доступны специальные корпоративные тарифы для юрлиц (с оплатой по счету и закрывающими документами) и стандартные билеты для физлиц. Как вы планируете оформлять поездку?';
  }

  // 8. Proactive Quick Replies & Missing Fields Generation
  const isOneWayExplicit = /(?:в\s+одну\s+сторону|one\s*way|только\s+туда|без\s+обратн)/i.test(text) || (previousParams?.isOneWay === true);
  const isRoundTripExplicit = Boolean(returnDate) || /(?:туда-обратно|обратно|round\s*trip|с\s+возвратом)/i.test(text) || (previousParams?.isRoundTrip === true && Boolean(previousParams?.returnDate));
  const isPassengersExplicit = Boolean(explicitPassengerMatch) || /(?:на\s+двоих|на\s+троих|на\s+четверых|пассажир|билет|человек)/i.test(text) || (previousParams?.passengersCount !== undefined && previousParams.passengersCount > 1) || (previousParams?.passengerDescription !== undefined && previousParams.passengerDescription !== '1 пассажир');
  const isLuggageExplicit = /(?:багаж|чемодан|ручная\s+кладь|ручной\s+кладью|\+1\s*багаж|без\s+багажа)/i.test(text) || (previousParams?.hasLuggage !== undefined);
  const isCabinExplicit = /(?:первый\s*класс|эконом|бизнес|премиум|комфорт)/i.test(text) || (previousParams?.cabinClass !== undefined && previousParams.cabinClass !== 'Economy');

  const missingFields: ('tripType' | 'passengers' | 'cabinClass' | 'luggage')[] = [];
  const quickReplies: QuickReplyOption[] = [];

  if (isGroupBooking && !isCorporateRequested && !isIndividualConfirmed && previousParams?.isCorporateAccount === undefined) {
    quickReplies.push(
      { id: 'corp-indiv', label: '👤 Как физлицо', queryText: 'как физлицо', category: 'corporate' },
      { id: 'corp-b2b', label: '🏢 Как юрлицо (Корпоративный счет)', queryText: 'как юрлицо (корпоративный счет)', category: 'corporate' }
    );
  } else {
    // 1. Trip type (Non-blocking instant search: default to one-way, but provide quick options)
    if (!isOneWayExplicit && !isRoundTripExplicit && departureDate && !returnDate) {
      quickReplies.push(
        { id: 'ret-7d', label: '🔄 Обратно через 7 дней', queryText: 'обратно через 7 дней', category: 'tripType' },
        { id: 'ret-14d', label: '🔄 Обратно через 14 дней', queryText: 'обратно через 14 дней', category: 'tripType' },
        { id: 'custom-dates', label: '✏️ Свой вариант', queryText: 'свой вариант дат', category: 'tripType', isCustomInputPrompt: true, promptText: 'Укажите ваши даты или число дней (например: на 18 дней или обратно 25 октября)' }
      );
    }

    // 2. Passengers (if not explicit)
    if (!isPassengersExplicit) {
      missingFields.push('passengers');
      quickReplies.push(
        { id: 'pass-1', label: '👤 1 пассажир', queryText: '1 пассажир', category: 'passengers' },
        { id: 'pass-2', label: '👥 2 пассажира', queryText: 'на двоих', category: 'passengers' },
        { id: 'pass-fam', label: '👨‍👩‍👧 Семья с ребенком (2+1)', queryText: '2 взрослых и 1 ребенок', category: 'passengers' },
        { id: 'custom-pass', label: '✏️ Свой вариант', queryText: 'свой вариант пассажиров', category: 'passengers', isCustomInputPrompt: true, promptText: 'Укажите количество пассажиров (например: 5 пассажиров или 3 взрослых + 2 детей)' }
      );
    }

    // 3. Cabin Class (4 separate options)
    if (!isCabinExplicit) {
      missingFields.push('cabinClass');
      quickReplies.push(
        { id: 'cab-eco', label: '🎫 Эконом', queryText: 'эконом-класс', category: 'cabinClass' },
        { id: 'cab-prem', label: '✨ Комфорт (Премиум-эконом)', queryText: 'премиум-эконом', category: 'cabinClass' },
        { id: 'cab-biz', label: '💎 Бизнес-класс', queryText: 'бизнес-класс', category: 'cabinClass' },
        { id: 'cab-first', label: '👑 Первый класс', queryText: 'первый класс', category: 'cabinClass' }
      );
    }

    // 4. Luggage (3 separate options)
    if (!isLuggageExplicit) {
      missingFields.push('luggage');
      quickReplies.push(
        { id: 'lug-hand', label: '🎒 Только ручная кладь', queryText: 'только ручная кладь', category: 'luggage' },
        { id: 'lug-23kg', label: '🧳 С багажом (23 кг)', queryText: 'с багажом 23 кг', category: 'luggage' },
        { id: 'lug-2bags', label: '🧳🧳 2 места багажа', queryText: '2 места багажа', category: 'luggage' }
      );
    }
  }

  if (stpcHotelOnly || visaFreeOnly || baggageIncluded || cabinClass !== 'Economy' || isGroupBooking) {
    confidenceScore += 0.15;
  }

  return {
    query: rawText,
    originCity: finalOrigin ? finalOrigin.nameRu : '',
    originIata: finalOrigin ? finalOrigin.iata : '',
    destinationCity: finalDest ? finalDest.nameRu : '',
    destinationIata: finalDest ? finalDest.iata : '',
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
    hasLuggage,
    baggageIncluded,
    cabinClass,
    timePreference,
    isGroupBooking,
    isCorporateAccount,
    isOneWay: isOneWayExplicit,
    isRoundTrip: isRoundTripExplicit,
    missingFields,
    quickReplies,
  };
}
