/**
 * Geo Airport Matching Engine
 * Определяет ближайший аэропорт вылета по GPS-координатам пользователя
 * с расчетом ортодромического расстояния по формуле Haversine.
 */

export interface GeoAirport {
  iata: string;
  city: string;
  name: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

export interface NearestAirportResult {
  iata: string;
  city: string;
  name: string;
  country: string;
  countryCode: string;
  distanceKm: number;
}

export const MAJOR_AIRPORTS: GeoAirport[] = [
  // Вьетнам
  { iata: 'SGN', city: 'Хошимин', name: 'Таншоннят', country: 'Вьетнам', countryCode: 'VN', latitude: 10.8188, longitude: 106.6519 },
  { iata: 'HAN', city: 'Ханой', name: 'Нойбай', country: 'Вьетнам', countryCode: 'VN', latitude: 21.2212, longitude: 105.8072 },
  { iata: 'CXR', city: 'Нячанг', name: 'Камрань', country: 'Вьетнам', countryCode: 'VN', latitude: 11.9981, longitude: 109.2194 },
  { iata: 'DAD', city: 'Дананг', name: 'Дананг', country: 'Вьетнам', countryCode: 'VN', latitude: 16.0439, longitude: 108.1994 },
  { iata: 'PQC', city: 'Фукуок', name: 'Фукуок', country: 'Вьетнам', countryCode: 'VN', latitude: 10.1699, longitude: 103.9986 },
  { iata: 'HPH', city: 'Хайфон', name: 'Катби', country: 'Вьетнам', countryCode: 'VN', latitude: 20.8192, longitude: 106.7247 },

  // Россия
  { iata: 'SVO', city: 'Москва', name: 'Шереметьево', country: 'Россия', countryCode: 'RU', latitude: 55.9726, longitude: 37.4146 },
  { iata: 'DME', city: 'Москва', name: 'Домодедово', country: 'Россия', countryCode: 'RU', latitude: 55.4088, longitude: 37.9063 },
  { iata: 'VKO', city: 'Москва', name: 'Внуково', country: 'Россия', countryCode: 'RU', latitude: 55.5915, longitude: 37.2615 },
  { iata: 'LED', city: 'Санкт-Петербург', name: 'Пулково', country: 'Россия', countryCode: 'RU', latitude: 59.8003, longitude: 30.2625 },
  { iata: 'AER', city: 'Сочи', name: 'Адлер', country: 'Россия', countryCode: 'RU', latitude: 43.4499, longitude: 39.9566 },
  { iata: 'KZN', city: 'Казань', name: 'Казань', country: 'Россия', countryCode: 'RU', latitude: 55.6062, longitude: 49.2787 },
  { iata: 'SVX', city: 'Екатеринбург', name: 'Кольцово', country: 'Россия', countryCode: 'RU', latitude: 56.7431, longitude: 60.8027 },
  { iata: 'OVB', city: 'Новосибирск', name: 'Толмачево', country: 'Россия', countryCode: 'RU', latitude: 55.0126, longitude: 82.6507 },
  { iata: 'UFA', city: 'Уфа', name: 'Уфа', country: 'Россия', countryCode: 'RU', latitude: 54.5578, longitude: 55.8744 },
  { iata: 'KUF', city: 'Самара', name: 'Курумоч', country: 'Россия', countryCode: 'RU', latitude: 53.5049, longitude: 50.1643 },
  { iata: 'ROV', city: 'Ростов-на-Дону', name: 'Платов', country: 'Россия', countryCode: 'RU', latitude: 47.4939, longitude: 39.9247 },
  { iata: 'MRV', city: 'Минеральные Воды', name: 'Минеральные Воды', country: 'Россия', countryCode: 'RU', latitude: 44.2251, longitude: 43.0819 },
  { iata: 'GOJ', city: 'Нижний Новгород', name: 'Чкалов', country: 'Россия', countryCode: 'RU', latitude: 56.2300, longitude: 43.7842 },
  { iata: 'CSY', city: 'Чебоксары', name: 'Чебоксары', country: 'Россия', countryCode: 'RU', latitude: 56.0903, longitude: 47.3486 },
  { iata: 'VVO', city: 'Владивосток', name: 'Кневичи', country: 'Россия', countryCode: 'RU', latitude: 43.3990, longitude: 132.1480 },
  { iata: 'IKT', city: 'Иркутск', name: 'Иркутск', country: 'Россия', countryCode: 'RU', latitude: 52.2680, longitude: 104.3890 },

  // Таиланд
  { iata: 'BKK', city: 'Бангкок', name: 'Суварнабхуми', country: 'Таиланд', countryCode: 'TH', latitude: 13.6900, longitude: 100.7501 },
  { iata: 'DMK', city: 'Бангкок', name: 'Донмыанг', country: 'Таиланд', countryCode: 'TH', latitude: 13.9126, longitude: 100.6067 },
  { iata: 'HKT', city: 'Пхукет', name: 'Пхукет', country: 'Таиланд', countryCode: 'TH', latitude: 8.1132, longitude: 98.3169 },
  { iata: 'CNX', city: 'Чиангмай', name: 'Чиангмай', country: 'Таиланд', countryCode: 'TH', latitude: 18.7668, longitude: 98.9626 },
  { iata: 'USM', city: 'Самуи', name: 'Самуи', country: 'Таиланд', countryCode: 'TH', latitude: 9.5478, longitude: 100.0623 },

  // ОАЭ
  { iata: 'DXB', city: 'Дубай', name: 'Дубай', country: 'ОАЭ', countryCode: 'AE', latitude: 25.2532, longitude: 55.3657 },
  { iata: 'DWC', city: 'Дубай', name: 'Аль-Мактум', country: 'ОАЭ', countryCode: 'AE', latitude: 24.8960, longitude: 55.1747 },
  { iata: 'AUH', city: 'Абу-Даби', name: 'Заед', country: 'ОАЭ', countryCode: 'AE', latitude: 24.4330, longitude: 54.6511 },
  { iata: 'SHJ', city: 'Шарджа', name: 'Шарджа', country: 'ОАЭ', countryCode: 'AE', latitude: 25.3286, longitude: 55.5172 },

  // Турция
  { iata: 'IST', city: 'Стамбул', name: 'Стамбул', country: 'Турция', countryCode: 'TR', latitude: 41.2753, longitude: 28.7519 },
  { iata: 'SAW', city: 'Стамбул', name: 'Сабиха Гёкчен', country: 'Турция', countryCode: 'TR', latitude: 40.8986, longitude: 29.3092 },
  { iata: 'AYT', city: 'Анталья', name: 'Анталья', country: 'Турция', countryCode: 'TR', latitude: 36.8987, longitude: 30.8005 },
  { iata: 'DLM', city: 'Даламан', name: 'Даламан', country: 'Турция', countryCode: 'TR', latitude: 36.7133, longitude: 28.7925 },
  { iata: 'BJV', city: 'Бодрум', name: 'Милас-Бодрум', country: 'Турция', countryCode: 'TR', latitude: 37.2506, longitude: 27.6644 },

  // Индонезия
  { iata: 'DPS', city: 'Бали', name: 'Нгурах-Рай', country: 'Индонезия', countryCode: 'ID', latitude: -8.7482, longitude: 115.1672 },
  { iata: 'CGK', city: 'Джакарта', name: 'Сукарно-Хатта', country: 'Индонезия', countryCode: 'ID', latitude: -6.1275, longitude: 106.6559 },

  // СНГ и Закавказье
  { iata: 'ALA', city: 'Алматы', name: 'Алматы', country: 'Казахстан', countryCode: 'KZ', latitude: 43.3521, longitude: 77.0405 },
  { iata: 'NQZ', city: 'Астана', name: 'Нурсултан Назарбаев', country: 'Казахстан', countryCode: 'KZ', latitude: 51.0222, longitude: 71.4669 },
  { iata: 'TAS', city: 'Ташкент', name: 'Ислам Каримов', country: 'Узбекистан', countryCode: 'UZ', latitude: 41.2579, longitude: 69.2812 },
  { iata: 'TBS', city: 'Тбилиси', name: 'Шота Руставели', country: 'Грузия', countryCode: 'GE', latitude: 41.6692, longitude: 44.9547 },
  { iata: 'EVN', city: 'Ереван', name: 'Звартноц', country: 'Армения', countryCode: 'AM', latitude: 40.1473, longitude: 44.3959 },
  { iata: 'GYD', city: 'Баку', name: 'Гейдар Алиев', country: 'Азербайджан', countryCode: 'AZ', latitude: 40.4675, longitude: 50.0467 },
  { iata: 'FRU', city: 'Бишкек', name: 'Манас', country: 'Кыргызстан', countryCode: 'KG', latitude: 43.0613, longitude: 74.4776 },
  { iata: 'MSQ', city: 'Минск', name: 'Минск-2', country: 'Беларусь', countryCode: 'BY', latitude: 53.8825, longitude: 28.0307 },

  // Европа и Хабы
  { iata: 'CDG', city: 'Париж', name: 'Шарль-де-Голль', country: 'Франция', countryCode: 'FR', latitude: 49.0097, longitude: 2.5479 },
  { iata: 'FRA', city: 'Франкфурт', name: 'Франкфурт-на-Майне', country: 'Германия', countryCode: 'DE', latitude: 50.0379, longitude: 8.5622 },
  { iata: 'FCO', city: 'Рим', name: 'Фьюмичино', country: 'Италия', countryCode: 'IT', latitude: 41.8003, longitude: 12.2389 },
  { iata: 'BCN', city: 'Барселона', name: 'Эль-Прат', country: 'Испания', countryCode: 'ES', latitude: 41.2974, longitude: 2.0833 },
  { iata: 'SIN', city: 'Сингапур', name: 'Чанги', country: 'Сингапур', countryCode: 'SG', latitude: 1.3644, longitude: 103.9915 },
  { iata: 'KUL', city: 'Куала-Лумпур', name: 'КЛИА', country: 'Малайзия', countryCode: 'MY', latitude: 2.7456, longitude: 101.7099 },
];

/**
 * Расчет расстояния между двумя точками на сфере по формуле Haversine (в километрах)
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Радиус Земли в км
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Поиск ближайшего аэропорта по заданным координатам
 */
export function findNearestAirport(
  latitude: number,
  longitude: number
): NearestAirportResult {
  let closestAirport = MAJOR_AIRPORTS[0];
  let minDistance = calculateDistanceKm(
    latitude,
    longitude,
    closestAirport.latitude,
    closestAirport.longitude
  );

  for (let i = 1; i < MAJOR_AIRPORTS.length; i++) {
    const airport = MAJOR_AIRPORTS[i];
    const dist = calculateDistanceKm(
      latitude,
      longitude,
      airport.latitude,
      airport.longitude
    );
    if (dist < minDistance) {
      minDistance = dist;
      closestAirport = airport;
    }
  }

  return {
    iata: closestAirport.iata,
    city: closestAirport.city,
    name: closestAirport.name,
    country: closestAirport.country,
    countryCode: closestAirport.countryCode,
    distanceKm: minDistance,
  };
}
