import { Flight, Currency, Language } from './types';

export interface StoredSearch {
  id: string;
  query: string;
  inputMode: 'text' | 'voice';
  timestamp: string;
  createdAtTimestamp?: number;
  savingsRub: number;
  discountPercent: number;
  routeTitle?: string;
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
export const DEFAULT_ORDERS: StoredOrder[] = [];
export const DEFAULT_SEARCHES: StoredSearch[] = [];

// Helper functions for localStorage fallback Provider
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
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('flightsaver_orders');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addStoredOrder(order: StoredOrder) {
  if (typeof window === 'undefined') return;
  const current = getStoredOrders();
  const updated = [order, ...current];
  localStorage.setItem('flightsaver_orders', JSON.stringify(updated));
}

// 90 days filter (3 months) and strictly 10 items display limit
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_CLIENT_SEARCHES_LIMIT = 10;

export function getStoredSearches(): StoredSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('flightsaver_searches');
    if (!raw) return [];
    const allSearches: StoredSearch[] = JSON.parse(raw);
    const now = Date.now();

    // 1. Filter only searches created within the last 90 days
    const recentSearches = allSearches.filter((item) => {
      const created = item.createdAtTimestamp || now;
      return now - created <= NINETY_DAYS_MS;
    });

    // 2. Client limit: return exactly 10 most recent active chats
    return recentSearches.slice(0, MAX_CLIENT_SEARCHES_LIMIT);
  } catch {
    return [];
  }
}

export function getAllRawStoredSearches(): StoredSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('flightsaver_searches');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addStoredSearch(
  query: string,
  inputMode: 'text' | 'voice' = 'text',
  routeTitle?: string
) {
  if (typeof window === 'undefined' || !query.trim()) return;
  const allCurrent = getAllRawStoredSearches();
  const now = Date.now();

  const newSearch: StoredSearch = {
    id: `sch-${now}`,
    query: query.trim(),
    inputMode,
    timestamp: 'Только что',
    createdAtTimestamp: now,
    savingsRub: 0,
    discountPercent: 0,
    routeTitle,
  };

  // Physically persist all searches in storage, keeping up to 100 entries for long-term database history
  const updated = [newSearch, ...allCurrent.filter(s => s.query !== query.trim()).slice(0, 99)];
  localStorage.setItem('flightsaver_searches', JSON.stringify(updated));
}

// Auto-calculate savings stats for dashboard
export function calculateStats(orders: StoredOrder[]) {
  const totalSpentRub = orders.reduce((sum, o) => sum + (o.totalPriceRub || 0), 0);
  const totalSavedRub = orders.reduce((sum, o) => sum + (o.savedAmountRub || 0), 0);
  const stpcNights = orders.filter((o) => o.stpcHotelIncluded).length;
  const totalOrders = orders.length;
  const tripsCount = orders.length;
  const originalTotal = totalSpentRub + totalSavedRub;
  const avgSavingsPercent = originalTotal > 0 ? Math.round((totalSavedRub / originalTotal) * 100) : 0;

  return {
    totalSpentRub,
    totalSavedRub,
    stpcNights,
    totalOrders,
    tripsCount,
    avgSavingsPercent,
  };
}
