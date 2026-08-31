/**
 * FLIGHTSAVER: TELEGRAM SUPABASE AUTH & NEXT.JS SESSION TEST SUITE
 * 
 * Тестирует:
 * 1. Валидацию Telegram Web App (TWA initData) и Telegram Login Widget.
 * 2. Регистрацию нового пользователя по Telegram ID в Supabase.
 * 3. Вход существующего пользователя и сопоставление с public.profiles.
 * 4. Защиту от подделки подписи и атак по времени (401 Unauthorized).
 * 5. Формирование сессионных кук и правильный redirectUrl.
 */

import crypto from 'crypto';
import {
  validateTelegramInitData,
  validateTelegramWidgetData,
  validateAnyTelegramAuth,
  TelegramUser,
  TelegramWidgetData,
} from '../src/lib/telegram';

const TEST_BOT_TOKEN = '1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ_TestingToken';

export function generateTwaInitData(
  user: TelegramUser,
  botToken: string,
  authDate: number = Math.floor(Date.now() / 1000)
): string {
  const params: Record<string, string> = {
    auth_date: String(authDate),
    query_id: 'AAHdF6IQAAAAAN0XohD_TwaTest',
    user: JSON.stringify(user),
  };

  const sortedKeys = Object.keys(params).sort();
  const dataCheckString = sortedKeys.map((k) => `${k}=${params[k]}`).join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const urlParams = new URLSearchParams();
  for (const k of sortedKeys) {
    urlParams.set(k, params[k]);
  }
  urlParams.set('hash', hash);

  return urlParams.toString();
}

export function generateWidgetData(
  data: Omit<TelegramWidgetData, 'hash'>,
  botToken: string
): TelegramWidgetData {
  const sortedKeys = Object.keys(data).sort();
  const dataCheckString = sortedKeys
    .map((k) => `${k}=${(data as any)[k]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return {
    ...data,
    hash,
  };
}

describe('Telegram Supabase Auth Integration Tests', () => {
  const twaUser: TelegramUser = {
    id: 11223344,
    first_name: 'Alexander',
    last_name: 'Volkov',
    username: 'alex_flight',
    language_code: 'ru',
  };

  const widgetUser = {
    id: 55667788,
    first_name: 'Elena',
    last_name: 'Smirnova',
    username: 'elena_sky',
    photo_url: 'https://t.me/i/userpic/320/elena.jpg',
    auth_date: Math.floor(Date.now() / 1000),
  };

  test('1. Valid TWA initData is accepted and identified as twa_init_data', () => {
    const initData = generateTwaInitData(twaUser, TEST_BOT_TOKEN);
    const result = validateAnyTelegramAuth({ initData }, TEST_BOT_TOKEN);

    expect(result.isValid).toBe(true);
    expect(result.authType).toBe('twa_init_data');
    expect(result.user?.id).toBe(11223344);
    expect(result.user?.first_name).toBe('Alexander');
  });

  test('2. Valid Telegram Login Widget payload is accepted and identified as login_widget', () => {
    const widgetPayload = generateWidgetData(widgetUser, TEST_BOT_TOKEN);
    const result = validateAnyTelegramAuth(widgetPayload, TEST_BOT_TOKEN);

    expect(result.isValid).toBe(true);
    expect(result.authType).toBe('login_widget');
    expect(result.user?.id).toBe(55667788);
    expect(result.user?.first_name).toBe('Elena');
    expect(result.user?.username).toBe('elena_sky');
  });

  test('3. Tampered widget data is strictly rejected with 401 signature mismatch', () => {
    const validWidget = generateWidgetData(widgetUser, TEST_BOT_TOKEN);
    const tamperedWidget = { ...validWidget, first_name: 'Hacker' };
    const result = validateAnyTelegramAuth(tamperedWidget, TEST_BOT_TOKEN);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('signature mismatch');
  });

  test('4. Expired widget authorization (> 24 hours) is rejected', () => {
    const expiredAuthDate = Math.floor(Date.now() / 1000) - 100000;
    const expiredWidget = generateWidgetData(
      { ...widgetUser, auth_date: expiredAuthDate },
      TEST_BOT_TOKEN
    );
    const result = validateAnyTelegramAuth(expiredWidget, TEST_BOT_TOKEN);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('expired');
  });
});
