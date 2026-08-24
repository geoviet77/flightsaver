import { Flight, Currency, Language } from './types';

export interface StoredSearch {
  id: string;
  query: string;
  inputMode: 'text' | 'voice';
  timestamp: string;
  savingsRub: number;
  discountPercent: number;
}

export interface StoredOrder {
  id: string;
  pnr: string;
  route: string;
  airline: string;
  departureDate: string;
  totalPriceRub: number;
  originalPriceRub: number;
  savedAmountRub: number;
  stpcHotelIncluded: boolean;
  stpcHotelName?: string;
  status: 'confirmed' | 'completed' | 'pending';
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  preferredCurrency: Currency;
  isAccessibilityMode: boolean;
}

export const DEFAULT_USER: UserProfile = {
  id: 'usr-1',
  email: 'igor.traveler@flightsaver.ai',
  fullName: 'Игорь Путешественник',
  avatarUrl: '',
  preferredCurrency: 'RUB',
  isAccessibilityMode: false,
};

export const DEFAULT_ORDERS: StoredOrder[] = [
  {
    id: 'ord-101',
    pnr: 'FS-984210',
    route: 'Москва (SVO) ➔ Дубай (DXB) ➔ Бангкок (BKK)',
    airline: 'Emirates + Bangkok Airways',
    departureDate: '15 ноября 2026',
    totalPriceRub: 78400,
    originalPriceRub: 128000,
    savedAmountRub: 49600,
    stpcHotelIncluded: true,
    stpcHotelName: 'Millennium Airport Hotel Dubai 4★',
    status: 'confirmed',
  },
  {
    id: 'ord-102',
    pnr: 'FS-451290',
    route: 'Москва (DME) ➔ Доха (DOH) ➔ Пхукет (HKT)',
    airline: 'Qatar Airways',
    departureDate: '10 января 2027',
    totalPriceRub: 84200,
    originalPriceRub: 142000,
    savedAmountRub: 57800,
    stpcHotelIncluded: true,
    stpcHotelName: 'Oryx Airport Hotel Doha 4★',
    status: 'confirmed',
  },
];

export const DEFAULT_SEARCHES: StoredSearch[] = [
  {
    id: 's-1',
    query: 'В Бангкок из Москвы с отелем STPC на 2 недели',
    inputMode: 'text',
    timestamp: 'Сегодня, 14:20',
    savingsRub: 49600,
    discountPercent: 39,
  },
  {
    id: 's-2',
    query: 'На Пхукет с багажом на двоих до 120 000 ₽',
    inputMode: 'voice',
    timestamp: 'Вчера, 18:45',
    savingsRub: 35200,
    discountPercent: 41,
  },
];

// Helper functions for localStorage Mock Provider
export function getStoredUser(): UserProfile | null {
  if (typeof window === 'undefined') return DEFAULT_USER;
  try {
    const raw = localStorage.getItem('flightsaver_user');
    return raw ? JSON.parse(raw) : DEFAULT_USER;
  } catch {
    return DEFAULT_USER;
  }
}

export function setStoredUser(user: UserProfile | null) {
  if (typeof window === 'undefined') return;
  if (!user) {
    localStorage.removeItem('flightsaver_user');
  } else {
    localStorage.setItem('flightsaver_user', JSON.stringify(user));
  }
}

export function getStoredOrders(): StoredOrder[] {
  if (typeof window === 'undefined') return DEFAULT_ORDERS;
  try {
    const raw = localStorage.getItem('flightsaver_orders');
    return raw ? JSON.parse(raw) : DEFAULT_ORDERS;
  } catch {
    return DEFAULT_ORDERS;
  }
}

export function addStoredOrder(order: StoredOrder) {
  if (typeof window === 'undefined') return;
  const current = getStoredOrders();
  const updated = [order, ...current];
  localStorage.setItem('flightsaver_orders', JSON.stringify(updated));
}

export function getStoredSearches(): StoredSearch[] {
  if (typeof window === 'undefined') return DEFAULT_SEARCHES;
  try {
    const raw = localStorage.getItem('flightsaver_searches');
    return raw ? JSON.parse(raw) : DEFAULT_SEARCHES;
  } catch {
    return DEFAULT_SEARCHES;
  }
}

export function addStoredSearch(query: string, inputMode: 'text' | 'voice' = 'text') {
  if (typeof window === 'undefined' || !query.trim()) return;
  const current = getStoredSearches();
  
  // Prevent immediate duplicates
  if (current[0]?.query.toLowerCase() === query.trim().toLowerCase()) return;

  const newSearch: StoredSearch = {
    id: `s-${Date.now()}`,
    query: query.trim(),
    inputMode,
    timestamp: 'Только что',
    savingsRub: Math.floor(Math.random() * 25000) + 25000,
    discountPercent: Math.floor(Math.random() * 15) + 30,
  };

  const updated = [newSearch, ...current].slice(0, 10);
  localStorage.setItem('flightsaver_searches', JSON.stringify(updated));
}

export function calculateStats(orders: StoredOrder[]) {
  const totalSpentRub = orders.reduce((sum, o) => sum + o.totalPriceRub, 0);
  const totalSavedRub = orders.reduce((sum, o) => sum + o.savedAmountRub, 0);
  const tripsCount = orders.length;
  const originalSum = orders.reduce((sum, o) => sum + o.originalPriceRub, 0);
  const avgSavingsPercent = originalSum > 0 ? Math.round((totalSavedRub / originalSum) * 100) : 39;

  return {
    totalSpentRub,
    totalSavedRub,
    tripsCount,
    avgSavingsPercent,
  };
}
