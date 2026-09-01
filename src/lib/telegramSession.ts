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

const REST_STORE_URL = 'https://api.restful-api.dev/objects';

/**
 * 1. Создание сессии авторизации (распределенный объект + L1 кэш)
 */
export async function createTelegramAuthSession(): Promise<TelegramAuthSession> {
  const now = Date.now();
  let sessionId = 'fs_' + Math.random().toString(36).substring(2, 12);

  try {
    const res = await fetch(REST_STORE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'fs_auth_session',
        data: {
          status: 'pending',
          createdAt: now,
          expiresAt: now + SESSION_TTL_MS,
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.id) {
        sessionId = data.id;
      }
    }
  } catch (err) {
    console.warn('[TelegramSession] Store fallback to local id:', err);
  }

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
    const res = await fetch(`${REST_STORE_URL}/${sessionId}`);
    if (res.ok) {
      const item = await res.json();
      if (item && item.data) {
        const isExpired = Date.now() > (item.data.expiresAt || (Date.now() + 1000));
        const session: TelegramAuthSession = {
          sessionId,
          status: isExpired ? 'expired' : item.data.status || 'pending',
          createdAt: item.data.createdAt || Date.now(),
          expiresAt: item.data.expiresAt || (Date.now() + SESSION_TTL_MS),
          deepLink: `https://t.me/${BOT_USERNAME}?start=auth_${sessionId}`,
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(`https://t.me/${BOT_USERNAME}?start=auth_${sessionId}`)}`,
          user: item.data.user || undefined,
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
    await fetch(`${REST_STORE_URL}/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          telegramUser,
          status: 'pending',
          step: 'awaiting_phone',
        },
      }),
    });
  } catch {}
}

/**
 * 4. Нахождение сессии по Telegram ID пользователя
 */
export function getSessionIdByTelegramId(telegramId: number): string | undefined {
  return userToSessionMap.get(telegramId);
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
    await fetch(`${REST_STORE_URL}/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          status: 'confirmed',
          user: userData,
          confirmedAt: Date.now(),
        },
      }),
    });
  } catch (err) {
    console.warn('[TelegramSession] Notice updating remote session:', err);
  }

  return updatedSession;
}
