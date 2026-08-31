import { NextRequest, NextResponse } from 'next/server';
import { PlaceSuggestion, AirportSuggestionsResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface CityMapping {
  ru: string;
  aliases: string[];
  en: string;
  iata?: string;
}

const CITY_MAPPINGS: CityMapping[] = [
  { ru: 'Южно-Сахалинск', aliases: ['южно-сахалинск', 'южно сахалинск', 'сахалинск', 'сахалин', 'южно', 'южн', 'хомутово'], en: 'Yuzhno-Sakhalinsk', iata: 'UUS' },
  { ru: 'Москва', aliases: ['москва', 'москву', 'москве', 'мск', 'моск', 'шереметьево', 'домодедово', 'внуково', 'жуковский', 'сво', 'дме', 'вко'], en: 'Moscow', iata: 'MOW' },
  { ru: 'Санкт-Петербург', aliases: ['санкт-петербург', 'санкт петербург', 'петербург', 'питер', 'спб', 'пулково', 'санкт', 'петер'], en: 'St Petersburg', iata: 'LED' },
  { ru: 'Бангкок', aliases: ['бангкок', 'бангкоке', 'бангкока', 'суварнабхуми', 'донмыанг', 'бангк', 'бкк'], en: 'Bangkok', iata: 'BKK' },
  { ru: 'Пхукет', aliases: ['пхукет', 'пхукете', 'пхукета', 'пхук'], en: 'Phuket', iata: 'HKT' },
  { ru: 'Дубай', aliases: ['дубай', 'дубае', 'дубая', 'дубаи', 'дуб', 'оаэ', 'аль-мактум'], en: 'Dubai', iata: 'DXB' },
  { ru: 'Нячанг', aliases: ['нячанг', 'ня чанг', 'камрань', 'няч'], en: 'Nha Trang', iata: 'CXR' },
  { ru: 'Стамбул', aliases: ['стамбул', 'стамбуле', 'стамбула', 'сабиха', 'стамб', 'новый аэропорт стамбула'], en: 'Istanbul', iata: 'IST' },
  { ru: 'Анталья', aliases: ['анталья', 'анталия', 'анталию', 'анталье', 'антал'], en: 'Antalya', iata: 'AYT' },
  { ru: 'Сочи', aliases: ['сочи', 'адлер', 'соч', 'черное море'], en: 'Sochi', iata: 'AER' },
  { ru: 'Бали', aliases: ['бали', 'денпасар', 'индонезия', 'кута', 'убуд'], en: 'Bali', iata: 'DPS' },
  { ru: 'Ереван', aliases: ['ереван', 'ереване', 'звартноц', 'ерев'], en: 'Yerevan', iata: 'EVN' },
  { ru: 'Тбилиси', aliases: ['тбилиси', 'тбилис', 'грузия'], en: 'Tbilisi', iata: 'TBS' },
  { ru: 'Баку', aliases: ['баку', 'гейдар алиев', 'азербайджан'], en: 'Baku', iata: 'GYD' },
  { ru: 'Ташкент', aliases: ['ташкент', 'ташкенте', 'узбекистан'], en: 'Tashkent', iata: 'TAS' },
  { ru: 'Алматы', aliases: ['алматы', 'алма-ата', 'алмаата', 'казахстан'], en: 'Almaty', iata: 'ALA' },
  { ru: 'Астана', aliases: ['астана', 'нур-султан', 'нурсултан'], en: 'Astana', iata: 'NQZ' },
  { ru: 'Минск', aliases: ['минск', 'минске', 'беларусь'], en: 'Minsk', iata: 'MSQ' },
  { ru: 'Казань', aliases: ['казань', 'казани', 'казан'], en: 'Kazan', iata: 'KZN' },
  { ru: 'Екатеринбург', aliases: ['екатеринбург', 'екатеринбурге', 'екат', 'екб', 'кольцово'], en: 'Yekaterinburg', iata: 'SVX' },
  { ru: 'Новосибирск', aliases: ['новосибирск', 'новосибирске', 'новосиб', 'нск', 'толмачево'], en: 'Novosibirsk', iata: 'OVB' },
  { ru: 'Владивосток', aliases: ['владивосток', 'владивостоке', 'владик', 'вво', 'кневичи'], en: 'Vladivostok', iata: 'VVO' },
  { ru: 'Калининград', aliases: ['калининград', 'калининграде', 'храброво', 'клд'], en: 'Kaliningrad', iata: 'KGD' },
  { ru: 'Самара', aliases: ['самара', 'самаре', 'курумоч'], en: 'Samara', iata: 'KUF' },
  { ru: 'Уфа', aliases: ['уфа', 'уфе', 'башкортостан'], en: 'Ufa', iata: 'UFA' },
  { ru: 'Красноярск', aliases: ['красноярск', 'красноярске', 'емельяново'], en: 'Krasnoyarsk', iata: 'KJA' },
  { ru: 'Иркутск', aliases: ['иркутск', 'иркутске', 'байкал'], en: 'Irkutsk', iata: 'IKT' },
  { ru: 'Хабаровск', aliases: ['хабаровск', 'хабаровске', 'новый'], en: 'Khabarovsk', iata: 'KHV' },
  { ru: 'Петропавловск-Камчатский', aliases: ['петропавловск-камчатский', 'петропавловск', 'камчатка', 'елизово'], en: 'Petropavlovsk-Kamchatsky', iata: 'PKC' },
  { ru: 'Минеральные Воды', aliases: ['минеральные воды', 'минводы', 'мин воды', 'кмв'], en: 'Mineralnye Vody', iata: 'MRV' },
  { ru: 'Махачкала', aliases: ['махачкала', 'уйташ', 'дагестан'], en: 'Makhachkala', iata: 'MCX' },
  { ru: 'Сургут', aliases: ['сургут', 'сургуте'], en: 'Surgut', iata: 'SGC' },
  { ru: 'Тюмень', aliases: ['тюмень', 'тюмени', 'рощино'], en: 'Tyumen', iata: 'TJM' },
  { ru: 'Пермь', aliases: ['пермь', 'перми', 'большое савино'], en: 'Perm', iata: 'PEE' },
  { ru: 'Челябинск', aliases: ['челябинск', 'челябинске', 'баландино'], en: 'Chelyabinsk', iata: 'CEK' },
  { ru: 'Омск', aliases: ['омск', 'омске', 'центральный'], en: 'Omsk', iata: 'OMS' },
  { ru: 'Волгоград', aliases: ['волгоград', 'волгограде', 'гумрак'], en: 'Volgograd', iata: 'VOG' },
  { ru: 'Нижний Новгород', aliases: ['нижний новгород', 'нижний', 'стригино'], en: 'Nizhny Novgorod', iata: 'GOJ' },
  { ru: 'Париж', aliases: ['париж', 'париже', 'де голль', 'орли', 'бове'], en: 'Paris', iata: 'PAR' },
  { ru: 'Лондон', aliases: ['лондон', 'лондоне', 'хитроу', 'гатвик', 'станстед', 'лутон'], en: 'London', iata: 'LON' },
  { ru: 'Рим', aliases: ['рим', 'риме', 'фьюмичино', 'чампино'], en: 'Rome', iata: 'ROM' },
  { ru: 'Милан', aliases: ['милан', 'милане', 'мальпенса', 'линате', 'бергамо'], en: 'Milan', iata: 'MIL' },
  { ru: 'Барселона', aliases: ['барселона', 'барселоне', 'эль прат'], en: 'Barcelona', iata: 'BCN' },
  { ru: 'Мадрид', aliases: ['мадрид', 'мадриде', 'барахас'], en: 'Madrid', iata: 'MAD' },
  { ru: 'Берлин', aliases: ['берлин', 'берлине', 'бранденбург'], en: 'Berlin', iata: 'BER' },
  { ru: 'Вена', aliases: ['вена', 'вене', 'швехат'], en: 'Vienna', iata: 'VIE' },
  { ru: 'Прага', aliases: ['прага', 'праге', 'вацлав гавел'], en: 'Prague', iata: 'PRG' },
  { ru: 'Амстердам', aliases: ['амстердам', 'амстердаме', 'схипхол'], en: 'Amsterdam', iata: 'AMS' },
  { ru: 'Токио', aliases: ['токио', 'ханеда', 'нарита'], en: 'Tokyo', iata: 'TYO' },
  { ru: 'Сеул', aliases: ['сеул', 'сеуле', 'инчхон', 'гимпо'], en: 'Seoul', iata: 'SEL' },
  { ru: 'Пекин', aliases: ['пекин', 'пекине', 'шоуду', 'дасин'], en: 'Beijing', iata: 'BJS' },
  { ru: 'Шанхай', aliases: ['шанхай', 'шанхае', 'пудун', 'хунцяо'], en: 'Shanghai', iata: 'SHA' },
  { ru: 'Гонконг', aliases: ['гонконг', 'гонконге', 'чеклапкок'], en: 'Hong Kong', iata: 'HKG' },
  { ru: 'Сингапур', aliases: ['сингапур', 'сингапуре', 'чанги'], en: 'Singapore', iata: 'SIN' },
  { ru: 'Куала-Лумпур', aliases: ['куала-лумпур', 'куала лумпур', 'малайзия'], en: 'Kuala Lumpur', iata: 'KUL' },
  { ru: 'Хошимин', aliases: ['хошимин', 'сайгон', 'таншоннят'], en: 'Ho Chi Minh City', iata: 'SGN' },
  { ru: 'Ханой', aliases: ['ханой', 'нойбай'], en: 'Hanoi', iata: 'HAN' },
  { ru: 'Доха', aliases: ['доха', 'дохе', 'хамад', 'катар'], en: 'Doha', iata: 'DOH' },
  { ru: 'Абу-Даби', aliases: ['абу-даби', 'абу даби', 'эмираты'], en: 'Abu Dhabi', iata: 'AUH' },
  { ru: 'Тель-Авив', aliases: ['тель-авив', 'тель авив', 'бен гурион', 'израиль'], en: 'Tel Aviv', iata: 'TLV' },
  { ru: 'Нью-Йорк', aliases: ['нью-йорк', 'нью йорк', 'jfk', 'ньюарк', 'лагвардия'], en: 'New York', iata: 'NYC' },
  { ru: 'Лос-Анджелес', aliases: ['лос-анджелес', 'лос анджелес', 'lax'], en: 'Los Angeles', iata: 'LAX' },
  { ru: 'Майами', aliases: ['майами', 'флорида'], en: 'Miami', iata: 'MIA' }
];

const CYRILLIC_TO_LATIN: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
  'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
  'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
};

function transliterateCyrillic(str: string): string {
  return str.split('').map(char => CYRILLIC_TO_LATIN[char] || char).join('');
}

function resolveSearchTerms(raw: string): string[] {
  const clean = raw.toLowerCase().trim().replace(/^(в|из|to|from)\s+/i, '').trim();
  if (!clean) return [];

  const queries: string[] = [];

  // Check matching in dictionary
  const matched = CITY_MAPPINGS.find(item => 
    item.aliases.some(alias => clean === alias || clean.startsWith(alias) || (alias.length > 2 && alias.startsWith(clean)))
  );

  if (matched) {
    if (matched.iata) queries.push(matched.iata);
    queries.push(matched.en);
  }

  // Transliterate if has Cyrillic
  if (/[а-яё]/i.test(clean)) {
    queries.push(transliterateCyrillic(clean));
  } else {
    queries.push(clean);
  }

  return Array.from(new Set(queries));
}

async function fetchDuffelPlaces(query: string, token: string): Promise<any[]> {
  const duffelUrl = `https://api.duffel.com/places/suggestions?query=${encodeURIComponent(query)}`;
  const res = await fetch(duffelUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Duffel-Version': 'v2',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export async function GET(req: NextRequest): Promise<NextResponse<AirportSuggestionsResponse>> {
  try {
    const searchParams = req.nextUrl.searchParams;
    const rawQuery = (searchParams.get('q') || '').trim();

    // If query is empty or shorter than 2 characters, return an empty places array immediately
    if (!rawQuery || rawQuery.length < 2) {
      return NextResponse.json({ places: [] });
    }

    const accessToken = process.env.DUFFEL_ACCESS_TOKEN;
    if (!accessToken) {
      console.warn('[Airports API] DUFFEL_ACCESS_TOKEN not set, returning empty places');
      return NextResponse.json({ places: [] });
    }

    const candidates = resolveSearchTerms(rawQuery);
    let rawPlaces: any[] = [];

    // Try candidates in order until suggestions are found
    for (const term of candidates) {
      const results = await fetchDuffelPlaces(term, accessToken);
      if (results.length > 0) {
        rawPlaces = results;
        break;
      }
    }

    // Deduplicate by ID
    const seenIds = new Set<string>();
    const places: PlaceSuggestion[] = [];

    for (const item of rawPlaces) {
      const id = String(item?.id || '');
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);

      places.push({
        id,
        name: String(item?.name || ''),
        iataCode: String(item?.iata_code || item?.iataCode || ''),
        cityName: String(item?.city_name || item?.city?.name || (item?.type === 'city' ? item?.name : '') || ''),
        countryCode: String(item?.iata_country_code || item?.country?.iso_country_code || item?.country_code || ''),
        type: String(item?.type || 'airport'),
      });
    }

    return NextResponse.json({ places });
  } catch (error: any) {
    console.error('[Airports API] Unexpected exception in airports route:', error);
    return NextResponse.json(
      { places: [], error: error?.message || 'Internal server error while fetching place suggestions' },
      { status: 500 }
    );
  }
}
