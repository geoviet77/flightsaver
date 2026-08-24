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

export function getStoredSearches(): StoredSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('flightsaver_searches');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
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
    savingsRub: 0,
    discountPercent: 0,
  };
  const updated = [newSearch, ...current.slice(0, 19)];
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
