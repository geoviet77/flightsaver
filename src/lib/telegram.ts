/**
 * FLIGHTSAVER: TELEGRAM BOT API & TELEGRAM WEB APP (TWA) CORE SERVICE
 * 
 * Серверный модуль интеграции с Telegram Bot API:
 * 1. Криптографическая валидация initData (TWA) через HMAC-SHA256("WebAppData", botToken).
 * 2. Криптографическая валидация Telegram Login Widget через HMAC-SHA256(SHA256(botToken), dataCheckString).
 * 3. Проверка срока жизни auth_date для защиты от Replay Attacks.
 * 4. Отправка сообщений (sendMessage) с разметкой HTML/Markdown и Inline-кнопками.
 * 5. Отправка документов и PDF-маршрутных квитанций (sendDocument).
 */

import crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
  allows_write_to_pm?: boolean;
}

export interface TelegramValidationResult {
  isValid: boolean;
  user?: TelegramUser;
  authDate?: number;
  queryId?: string;
  authType?: 'twa_init_data' | 'login_widget';
  error?: string;
}

export interface TelegramWidgetData {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
  [key: string]: any;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: {
    url: string;
  };
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramSendMessageOptions {
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  replyMarkup?: TelegramInlineKeyboardMarkup | { inline_keyboard: any[][] };
  disableWebPagePreview?: boolean;
}

export interface TelegramApiResponse<T = any> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

/**
 * 1. Криптографическая валидация строки initData от Telegram Web App (TMA / TWA)
 * 
 * @param initData Сырая строка query параметров от Telegram.WebApp.initData
 * @param botToken Токен Telegram бота (process.env.TELEGRAM_BOT_TOKEN)
 * @param maxAgeSeconds Максимальный срок действия подписи в секундах (по умолчанию 86400 с / 24ч)
 */
export function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400
): TelegramValidationResult {
  if (!initData || typeof initData !== 'string') {
    return { isValid: false, error: 'Empty or invalid initData string' };
  }

  if (!botToken || typeof botToken !== 'string') {
    return { isValid: false, error: 'Missing Telegram bot token' };
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) {
      return { isValid: false, error: 'Missing hash parameter in initData' };
    }

    urlParams.delete('hash');

    // Сортировка ключей в алфавитном порядке и формирование data_check_string
    const sortedKeys = Array.from(urlParams.keys()).sort();
    const dataCheckString = sortedKeys
      .map((key) => `${key}=${urlParams.get(key)}`)
      .join('\n');

    // 1. secret_key = HMAC_SHA256("WebAppData", botToken)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // 2. calculated_hash = HMAC_SHA256(secretKey, dataCheckString)
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Timing-safe сравнение строк для предотвращения атак по времени
    const calculatedHashBuf = Buffer.from(calculatedHash, 'hex');
    const receivedHashBuf = Buffer.from(hash, 'hex');

    if (
      calculatedHashBuf.length !== receivedHashBuf.length ||
      !crypto.timingSafeEqual(calculatedHashBuf, receivedHashBuf)
    ) {
      return { isValid: false, error: 'Cryptographic signature mismatch (invalid hash)' };
    }

    // Проверка срока жизни auth_date
    const authDateStr = urlParams.get('auth_date');
    const authDate = authDateStr ? parseInt(authDateStr, 10) : undefined;

    if (!authDate || isNaN(authDate)) {
      return { isValid: false, error: 'Missing or invalid auth_date' };
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    // Допускаем небольшую рассинхронизацию часов вперед (до 60 секунд)
    if (authDate > currentTimestamp + 60) {
      return { isValid: false, error: 'auth_date is in the future' };
    }

    if (currentTimestamp - authDate > maxAgeSeconds) {
      return { isValid: false, error: 'Telegram initData authorization expired' };
    }

    // Парсинг объекта user
    const userJson = urlParams.get('user');
    let user: TelegramUser | undefined = undefined;

    if (userJson) {
      try {
        user = JSON.parse(userJson);
      } catch {
        return { isValid: false, error: 'Failed to parse user JSON payload' };
      }
    }

    const queryId = urlParams.get('query_id') || undefined;

    return {
      isValid: true,
      user,
      authDate,
      queryId,
      authType: 'twa_init_data',
    };
  } catch (err: any) {
    return { isValid: false, error: `Validation exception: ${err?.message || err}` };
  }
}

/**
 * 2. Криптографическая валидация данных от браузерного Telegram Login Widget
 * 
 * @param widgetData Объект данных от виджета: { id, first_name, last_name, username, photo_url, auth_date, hash }
 * @param botToken Токен Telegram бота (process.env.TELEGRAM_BOT_TOKEN)
 * @param maxAgeSeconds Максимальный срок действия в секундах (по умолчанию 86400 с / 24ч)
 */
export function validateTelegramWidgetData(
  widgetData: TelegramWidgetData,
  botToken: string,
  maxAgeSeconds = 86400
): TelegramValidationResult {
  if (!widgetData || typeof widgetData !== 'object') {
    return { isValid: false, error: 'Empty or invalid Telegram widget data' };
  }

  if (!botToken || typeof botToken !== 'string') {
    return { isValid: false, error: 'Missing Telegram bot token' };
  }

  try {
    const { hash, ...dataToCheck } = widgetData;

    if (!hash || typeof hash !== 'string') {
      return { isValid: false, error: 'Missing hash parameter in widget data' };
    }

    // Сортировка ключей в алфавитном порядке и формирование data_check_string
    const sortedKeys = Object.keys(dataToCheck)
      .filter((key) => dataToCheck[key] !== undefined && dataToCheck[key] !== null)
      .sort();

    const dataCheckString = sortedKeys
      .map((key) => `${key}=${dataToCheck[key]}`)
      .join('\n');

    // 1. secret_key = SHA256(botToken)
    const secretKey = crypto
      .createHash('sha256')
      .update(botToken)
      .digest();

    // 2. calculated_hash = HMAC_SHA256(secretKey, dataCheckString)
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Timing-safe сравнение
    const calculatedHashBuf = Buffer.from(calculatedHash, 'hex');
    const receivedHashBuf = Buffer.from(hash, 'hex');

    if (
      calculatedHashBuf.length !== receivedHashBuf.length ||
      !crypto.timingSafeEqual(calculatedHashBuf, receivedHashBuf)
    ) {
      return { isValid: false, error: 'Cryptographic signature mismatch (invalid widget hash)' };
    }

    const authDate = parseInt(String(widgetData.auth_date), 10);
    if (!authDate || isNaN(authDate)) {
      return { isValid: false, error: 'Missing or invalid auth_date in widget data' };
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (authDate > currentTimestamp + 60) {
      return { isValid: false, error: 'auth_date is in the future' };
    }

    if (currentTimestamp - authDate > maxAgeSeconds) {
      return { isValid: false, error: 'Telegram widget authorization expired' };
    }

    const user: TelegramUser = {
      id: typeof widgetData.id === 'string' ? parseInt(widgetData.id, 10) : widgetData.id,
      first_name: widgetData.first_name,
      last_name: widgetData.last_name,
      username: widgetData.username,
      photo_url: widgetData.photo_url,
    };

    return {
      isValid: true,
      user,
      authDate,
      authType: 'login_widget',
    };
  } catch (err: any) {
    return { isValid: false, error: `Widget validation exception: ${err?.message || err}` };
  }
}

/**
 * 3. Унифицированный фасад: валидация любого формата Telegram-авторизации (TWA initData или Login Widget)
 */
export function validateAnyTelegramAuth(
  payload: any,
  botToken: string,
  maxAgeSeconds = 86400
): TelegramValidationResult {
  if (!payload) {
    return { isValid: false, error: 'Missing Telegram authorization payload' };
  }

  // Если передана строка или объект с полем initData -> TWA
  if (typeof payload === 'string') {
    return validateTelegramInitData(payload, botToken, maxAgeSeconds);
  }

  if (typeof payload.initData === 'string' && payload.initData.trim()) {
    return validateTelegramInitData(payload.initData, botToken, maxAgeSeconds);
  }

  // Если передан объект виджета с полями id и hash -> Widget
  if (payload.hash && (payload.id || payload.auth_date)) {
    return validateTelegramWidgetData(payload as TelegramWidgetData, botToken, maxAgeSeconds);
  }

  return { isValid: false, error: 'Unrecognized Telegram authorization format' };
}

/**
 * 4. Отправка текстового сообщения пользователю через Telegram Bot API
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: TelegramSendMessageOptions
): Promise<TelegramApiResponse> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN is not configured in server environment.');
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN not configured' };
  }

  const payload: Record<string, any> = {
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode || 'HTML',
    disable_web_page_preview: options?.disableWebPagePreview || false,
  };

  if (options?.replyMarkup) {
    payload.reply_markup = options.replyMarkup;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data: TelegramApiResponse = await res.json();
    return data;
  } catch (err: any) {
    console.error('[Telegram] Failed to send message:', err?.message || err);
    return { ok: false, description: err?.message || 'Network error' };
  }
}

/**
 * 5. Отправка документа / PDF квитанции в чат Telegram
 */
export async function sendTelegramDocument(
  chatId: string | number,
  documentUrl: string,
  caption?: string
): Promise<TelegramApiResponse> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN is not configured in server environment.');
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN not configured' };
  }

  const payload: Record<string, any> = {
    chat_id: chatId,
    document: documentUrl,
    parse_mode: 'HTML',
  };

  if (caption) {
    payload.caption = caption;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data: TelegramApiResponse = await res.json();
    return data;
  } catch (err: any) {
    console.error('[Telegram] Failed to send document:', err?.message || err);
    return { ok: false, description: err?.message || 'Network error' };
  }
}
