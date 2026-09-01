/**
 * FLIGHTSAVER: DISTRIBUTED TELEGRAM AUTH SESSION STORE & ONBOARDING ENGINE
 * 
 * Обеспечивает согласованность между инстансами Vercel Serverless и Telegram Webhook:
 * 1. Создание сессии с генерацией уникального ID и QR-кода.
 * 2. Двухшаговый опрос клиента (Телефон -> Геолокация -> Финальная авторизация).
 * 3. Подтверждение сессии на сайте только после прохождения обоих шагов (или отказа).
 * 4. Автоматическая очистка по истечении TTL.
 */

import { createAdminClient } from './supabase/admin';

export interface TelegramAuthSession {
  sessionId: string;
  status: 'pending' | 'confirmed' | 'expired';
  createdAt: number;
  expiresAt: number;
  deepLink: string;
  qrCodeUrl: string;
  user?: {
    id: string;
    telegramId: number;
    email: string;
    fullName: string;
    username?: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
    location?: { latitude: number; longitude: number } | null;
    originIata?: string | null;
    originCity?: string | null;
    authProvider: 'telegram';
  };
}

export interface UserOnboardingState {
  step: 'awaiting_phone' | 'awaiting_location' | 'completed';
  phone?: string | null;
  location?: { latitude: number; longitude: number } | null;
  updatedAt: number;
}

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'FlightSaver_AIBot';
const SESSION_TTL_MS = 5 * 60 * 1000; // 5 минут

// Локальный L1-кэш для ультрабыстрых повторных проверок
const memoryCache = new Map<string, TelegramAuthSession>();
const userToSessionMap = new Map<number, string>();
const userOnboardingMap = new Map<number, UserOnboardingState>();

const STORE_URL = 'https://crudcrud.com/api/cdb0443698a5455788ce641a7721dae0/sessions';

/**
 * 1. Создание сессии авторизации (распределенный объект + L1 кэш)
 */
export async function createTelegramAuthSession(): Promise<TelegramAuthSession> {
  const now = Date.now();
  const sessionId = 'fs_' + Math.random().toString(36).substring(2, 12);
  const deepLink = `https://t.me/${BOT_USERNAME}?start=auth_${sessionId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(deepLink)}`;

  const session: TelegramAuthSession = {
    sessionId,
    status: 'pending',
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    deepLink,
    qrCodeUrl,
  };

  memoryCache.set(sessionId, session);

  try {
    await fetch(STORE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordType: 'session',
        sessionId,
        status: 'pending',
        createdAt: now,
        expiresAt: now + SESSION_TTL_MS,
      }),
    });
  } catch (err) {
    console.warn('[TelegramSession] Remote session save error:', err);
  }

  return session;
}

/**
 * 2. Получение текущего состояния сессии (L1 кэш -> Распределенное хранилище)
 */
export async function getTelegramAuthSession(sessionId: string): Promise<TelegramAuthSession | null> {
  // 1. Проверяем локальный кэш
  const cached = memoryCache.get(sessionId);
  if (cached && cached.status === 'confirmed') {
    return cached;
  }

  // 2. Опрашиваем распределенное хранилище
  try {
    const res = await fetch(STORE_URL);
    if (res.ok) {
      const items = await res.json();
      const item = items.find((it: any) => it.recordType === 'session' && it.sessionId === sessionId);
      if (item) {
        const isExpired = Date.now() > (item.expiresAt || (Date.now() + 1000));
        const session: TelegramAuthSession = {
          sessionId,
          status: isExpired ? 'expired' : item.status || 'pending',
          createdAt: item.createdAt || Date.now(),
          expiresAt: item.expiresAt || (Date.now() + SESSION_TTL_MS),
          deepLink: `https://t.me/${BOT_USERNAME}?start=auth_${sessionId}`,
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(`https://t.me/${BOT_USERNAME}?start=auth_${sessionId}`)}`,
          user: item.user || undefined,
        };
        memoryCache.set(sessionId, session);
        return session;
      }
    }
  } catch (err) {
    console.warn('[TelegramSession] Error reading remote session:', err);
  }

  return cached || null;
}

/**
 * 3. Предварительная привязка пользователя Telegram к сессии (при первом /start)
 */
export async function associateTelegramUser(
  sessionId: string,
  telegramUser: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  }
) {
  userToSessionMap.set(telegramUser.id, sessionId);
  userOnboardingMap.set(telegramUser.id, {
    step: 'awaiting_phone',
    phone: null,
    location: null,
    updatedAt: Date.now(),
  });

  try {
    await fetch(STORE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordType: 'user_map',
        telegramId: telegramUser.id,
        sessionId,
        updatedAt: Date.now(),
      }),
    });
  } catch (err) {
    console.warn('[TelegramSession] Error saving user map:', err);
  }
}

/**
 * 4. Нахождение сессии по Telegram ID пользователя
 */
export async function getSessionIdByTelegramId(telegramId: number): Promise<string | undefined> {
  const local = userToSessionMap.get(telegramId);
  if (local) return local;

  try {
    const res = await fetch(STORE_URL);
    if (res.ok) {
      const items = await res.json();
      const maps = items
        .filter((it: any) => it.recordType === 'user_map' && it.telegramId === telegramId)
        .sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));
      if (maps[0]?.sessionId) {
        userToSessionMap.set(telegramId, maps[0].sessionId);
        return maps[0].sessionId;
      }
    }
  } catch {}

  return undefined;
}


/**
 * 5. Управление шагами онбординга пользователя
 */
export function getUserOnboarding(telegramId: number): UserOnboardingState {
  return (
    userOnboardingMap.get(telegramId) || {
      step: 'awaiting_phone',
      phone: null,
      location: null,
      updatedAt: Date.now(),
    }
  );
}

export function setUserOnboarding(
  telegramId: number,
  state: Partial<UserOnboardingState>
) {
  const current = getUserOnboarding(telegramId);
  const updated: UserOnboardingState = {
    ...current,
    ...state,
    updatedAt: Date.now(),
  };
  userOnboardingMap.set(telegramId, updated);
  return updated;
}

/**
 * 6. Финальное подтверждение сессии (после завершения шага геолокации или отказа)
 */
export async function confirmTelegramAuthSession(
  sessionId: string,
  telegramUser: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  },
  phone?: string | null,
  location?: { latitude: number; longitude: number } | null
): Promise<TelegramAuthSession | null> {
  const fullName = [telegramUser.first_name, telegramUser.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || telegramUser.first_name || 'Telegram User';

  const syntheticEmail = `tg_${telegramUser.id}@telegram.flightsaver.internal`;
  let supabaseUserId = `tg_${telegramUser.id}`;

  let originIata: string | null = null;
  let originCity: string | null = null;
  if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
    const { findNearestAirport } = require('./geoAirports');
    const nearest = findNearestAirport(location.latitude, location.longitude);
    originIata = nearest.iata;
    originCity = nearest.city;
  }

  // Синхронизация с Supabase (если настроен)
  try {
    const supabaseAdmin = createAdminClient();
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, phone')
      .eq('telegram_id', telegramUser.id)
      .maybeSingle();

    if (existingProfile?.id) {
      supabaseUserId = existingProfile.id;
    }

    await supabaseAdmin.from('profiles').upsert(
      {
        id: supabaseUserId,
        email: syntheticEmail,
        full_name: fullName,
        username: telegramUser.username || null,
        phone: phone || existingProfile?.phone || null,
        avatar_url: telegramUser.photo_url || null,
        telegram_id: telegramUser.id,
        auth_provider: 'telegram',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('[TelegramSession] Supabase sync notice:', err);
  }

  const userData = {
    id: supabaseUserId,
    telegramId: telegramUser.id,
    email: syntheticEmail,
    fullName,
    username: telegramUser.username || null,
    avatarUrl: telegramUser.photo_url || null,
    phone: phone || null,
    location: location || null,
    originIata,
    originCity,
    authProvider: 'telegram' as const,
  };

  const updatedSession: TelegramAuthSession = {
    sessionId,
    status: 'confirmed',
    createdAt: Date.now() - 5000,
    expiresAt: Date.now() + SESSION_TTL_MS,
    deepLink: `https://t.me/${BOT_USERNAME}?start=auth_${sessionId}`,
    qrCodeUrl: '',
    user: userData,
  };

  // Обновляем L1 кэш
  memoryCache.set(sessionId, updatedSession);
  userToSessionMap.set(telegramUser.id, sessionId);
  userOnboardingMap.set(telegramUser.id, {
    step: 'completed',
    phone: phone || null,
    location: location || null,
    updatedAt: Date.now(),
  });

  // Обновляем распределенное хранилище
  try {
    const res = await fetch(STORE_URL);
    if (res.ok) {
      const items = await res.json();
      const doc = items.find((it: any) => it.recordType === 'session' && it.sessionId === sessionId);
      if (doc && doc._id) {
        await fetch(`${STORE_URL}/${doc._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordType: 'session',
            sessionId,
            status: 'confirmed',
            user: userData,
            confirmedAt: Date.now(),
          }),
        });
      } else {
        await fetch(STORE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordType: 'session',
            sessionId,
            status: 'confirmed',
            user: userData,
            confirmedAt: Date.now(),
          }),
        });
      }
    }
  } catch (err) {
    console.warn('[TelegramSession] Remote session confirm error:', err);
  }

  return updatedSession;
}
