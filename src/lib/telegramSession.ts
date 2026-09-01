/**
 * FLIGHTSAVER: TELEGRAM AUTH SESSION STORE & QR CODE ENGINE
 * 
 * Сервис управления сессиями авторизации через Telegram Bot Deep Link & QR Code:
 * 1. Генерация временных сессий авторизации (TTL 5 минут).
 * 2. Формирование Deep Link (https://t.me/FlightSaver_AIBot?start=auth_<sessionId>).
 * 3. Формирование QR-кода для мгновенного сканирования камерой.
 * 4. Подтверждение сессии при нажатии кнопки START в боте и сохранение контакта (телефона).
 */

import crypto from 'crypto';
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
    authProvider: 'telegram';
  };
}

// In-Memory кэш активных сессий авторизации
const activeSessions = new Map<string, TelegramAuthSession>();

// Индекс для быстрого поиска сессии по telegramId при отправке номера телефона
const userSessionIndex = new Map<number, string>();

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 минут

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'FlightSaver_AIBot';

/**
 * 1. Создание новой сессии авторизации для отображения QR-кода и ссылки
 */
export function createTelegramAuthSession(): TelegramAuthSession {
  // Очистка устаревших сессий
  const now = Date.now();
  Array.from(activeSessions.entries()).forEach(([id, s]) => {
    if (s.expiresAt < now) {
      activeSessions.delete(id);
    }
  });


  const sessionId = crypto.randomBytes(12).toString('hex');
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

  activeSessions.set(sessionId, session);
  return session;
}

/**
 * 2. Получение текущего состояния сессии
 */
export function getTelegramAuthSession(sessionId: string): TelegramAuthSession | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  if (session.expiresAt < Date.now() && session.status === 'pending') {
    session.status = 'expired';
  }

  return session;
}

/**
 * 3. Подтверждение сессии через Telegram Webhook при старте бота
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
  phone?: string
): Promise<TelegramAuthSession | null> {
  const session = activeSessions.get(sessionId);
  if (!session || session.status === 'expired') return null;

  const fullName = [telegramUser.first_name, telegramUser.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || telegramUser.first_name || 'Telegram User';

  const syntheticEmail = `tg_${telegramUser.id}@telegram.flightsaver.internal`;
  let supabaseUserId = `tg_${telegramUser.id}`;

  // Синхронизация с Supabase DB (profiles & auth)
  try {
    const supabaseAdmin = createAdminClient();

    // Проверяем существующий профиль
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, username, phone, avatar_url, telegram_id')
      .eq('telegram_id', telegramUser.id)
      .maybeSingle();

    if (existingProfile?.id) {
      supabaseUserId = existingProfile.id;
    } else {
      // Создаем системного пользователя
      const { data: newAuthData } = await supabaseAdmin.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          telegram_id: telegramUser.id,
          username: telegramUser.username || null,
          avatar_url: telegramUser.photo_url || null,
          phone: phone || null,
          provider: 'telegram',
        },
      });

      if (newAuthData?.user?.id) {
        supabaseUserId = newAuthData.user.id;
      }
    }

    // Upsert в profiles
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
    console.warn('[TelegramSession] Notice syncing Supabase profile:', err);
  }

  session.status = 'confirmed';
  session.user = {
    id: supabaseUserId,
    telegramId: telegramUser.id,
    email: syntheticEmail,
    fullName,
    username: telegramUser.username || null,
    avatarUrl: telegramUser.photo_url || null,
    phone: phone || null,
    authProvider: 'telegram',
  };

  userSessionIndex.set(telegramUser.id, sessionId);
  return session;
}

/**
 * 4. Обновление телефона пользователя при отправке контакта в Telegram
 */
export async function updateTelegramUserPhone(telegramId: number, phone: string) {
  try {
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin
      .from('profiles')
      .update({
        phone: phone,
        updated_at: new Date().toISOString(),
      })
      .eq('telegram_id', telegramId);

    // Если есть активная сессия — обновляем и в ней
    const activeSessionId = userSessionIndex.get(telegramId);
    if (activeSessionId) {
      const session = activeSessions.get(activeSessionId);
      if (session && session.user) {
        session.user.phone = phone;
      }
    }
  } catch (err) {
    console.warn('[TelegramSession] Notice updating user phone:', err);
  }
}
