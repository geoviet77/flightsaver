/**
 * FlightSaver Telegram Mini App (TMA) Validation & Security
 * Архитектурный фундамент Отдела 4: криптографическая валидация initData от Telegram WebApp API.
 */

import crypto from 'crypto';

export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface ParsedInitData {
  query_id?: string;
  user?: TelegramUserData;
  auth_date: number;
  hash: string;
}

export class TelegramAuthService {
  /**
   * Валидация подписи initData из Telegram WebApp
   */
  static validateInitData(initDataString: string, botToken: string): { isValid: boolean; user?: TelegramUserData } {
    if (!initDataString || !botToken) {
      return { isValid: false };
    }

    try {
      const urlParams = new URLSearchParams(initDataString);
      const hash = urlParams.get('hash');
      if (!hash) return { isValid: false };

      urlParams.delete('hash');

      // Сортировка ключей в алфавитном порядке
      const keys = Array.from(urlParams.keys()).sort();
      const dataCheckString = keys.map((key) => `${key}=${urlParams.get(key)}`).join('\n');

      // 1. Создание secret_key = HMAC-SHA256("WebAppData", botToken)
      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

      // 2. Вычисление хеша от dataCheckString
      const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      const isValid = calculatedHash === hash;
      const userRaw = urlParams.get('user');
      const user: TelegramUserData | undefined = userRaw ? JSON.parse(userRaw) : undefined;

      return { isValid, user };
    } catch {
      return { isValid: false };
    }
  }
}
