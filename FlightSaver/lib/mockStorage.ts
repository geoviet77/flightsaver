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

export const DEFAULT_USER: UserProfile | null = null;

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
    route: 'Москва (VKO) ➔ Манама (BAH) ➔ Пхукет (HKT)',
    airline: 'Gulf Air',
    departureDate: '22 декабря 2026',
    totalPriceRub: 64200,
    originalPriceRub: 98000,
    savedAmountRub: 33800,
    stpcHotelIncluded: true,
    stpcHotelName: 'The Art Hotel & Resort Bahrain 5★',
    status: 'completed',
  },
];

export const DEFAULT_SEARCHES: StoredSearch[] = [
  {
    id: 'sch-1',
    query: 'В Бангкок из Москвы с отелем STPC на 2 недели',
    inputMode: 'voice',
    timestamp: 'Сегодня, 14:20',
    savingsRub: 49600,
    discountPercent: 39,
  },
  {
    id: 'sch-2',
    query: 'На Пхукет с багажом на двоих до 120 000 ₽',
    inputMode: 'text',
    timestamp: 'Вчера, 19:45',
    savingsRub: 33800,
    discountPercent: 41,
  },
  {
    id: 'sch-3',
    query: 'В Стамбул на выходные прямой рейс',
    inputMode: 'text',
    timestamp: '20 авг, 11:10',
    savingsRub: 18500,
    discountPercent: 28,
  },
];

// Helper functions for localStorage Mock Provider
export function getStoredUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('flightsaver_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
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
  const newSearch: StoredSearch = {
    id: `sch-${Date.now()}`,
    query: query.trim(),
    inputMode,
    timestamp: 'Только что',
    savingsRub: Math.floor(Math.random() * 25000) + 15000,
    discountPercent: Math.floor(Math.random() * 20) + 25,
  };
  const updated = [newSearch, ...current.slice(0, 19)];
  localStorage.setItem('flightsaver_searches', JSON.stringify(updated));
}

// Auto-calculate savings stats for dashboard
export function calculateStats(orders: StoredOrder[]) {
  const totalSpentRub = orders.reduce((sum, o) => sum + o.totalPriceRub, 0);
  const totalSavedRub = orders.reduce((sum, o) => sum + o.savedAmountRub, 0);
  const stpcNights = orders.filter((o) => o.stpcHotelIncluded).length;
  const totalOrders = orders.length;
  const tripsCount = orders.length;
  const originalTotal = totalSpentRub + totalSavedRub;
  const avgSavingsPercent = originalTotal > 0 ? Math.round((totalSavedRub / originalTotal) * 100) : 38;

  return {
    totalSpentRub,
    totalSavedRub,
    stpcNights,
    totalOrders,
    tripsCount,
    avgSavingsPercent,
  };
}
