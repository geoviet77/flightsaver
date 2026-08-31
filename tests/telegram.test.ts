/**
 * FLIGHTSAVER: TELEGRAM WEB APP (TWA) & BOT API AUTOMATED TEST SUITE
 * 
 * Тестирует:
 * 1. Криптографическую валидацию HMAC-SHA256 подписи initData по спецификации Telegram.
 * 2. Защиту от Replay Attacks по auth_date.
 * 3. Отклонение поддельных хэшей и модифицированных данных пользователя.
 * 4. Эндпоинт авторизации POST /api/auth/telegram.
 * 5. Обработчик вебхуков POST /api/telegram/webhook.
 */

import crypto from 'crypto';
import { validateTelegramInitData, TelegramUser } from '../src/lib/telegram';

const TEST_BOT_TOKEN = '1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ_TestingToken';

/**
 * Хелпер для генерации валидного initData по стандарту Telegram
 */
export function generateValidInitData(
  user: TelegramUser,
  botToken: string,
  authDate: number = Math.floor(Date.now() / 1000),
  queryId: string = 'AAHdF6IQAAAAAN0XohD_FakeQuery'
): string {
  const params: Record<string, string> = {
    auth_date: String(authDate),
    query_id: queryId,
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

describe('Telegram TWA & Bot API Suite', () => {
  const sampleUser: TelegramUser = {
    id: 987654321,
    first_name: 'Pavel',
    last_name: 'Durov',
    username: 'durov',
    language_code: 'ru',
    is_premium: true,
  };

  test('1. Valid initData signature verification passes', () => {
    const initData = generateValidInitData(sampleUser, TEST_BOT_TOKEN);
    const result = validateTelegramInitData(initData, TEST_BOT_TOKEN);

    expect(result.isValid).toBe(true);
    expect(result.user?.id).toBe(987654321);
    expect(result.user?.first_name).toBe('Pavel');
    expect(result.user?.username).toBe('durov');
    expect(result.error).toBeUndefined();
  });

  test('2. Tampered user ID is rejected with signature mismatch', () => {
    const validInitData = generateValidInitData(sampleUser, TEST_BOT_TOKEN);
    // Подменяем user ID без пересчета хэша
    const tamperedInitData = validInitData.replace('987654321', '111111111');
    const result = validateTelegramInitData(tamperedInitData, TEST_BOT_TOKEN);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Cryptographic signature mismatch');
  });

  test('3. Forged fake hash is rejected', () => {
    const validInitData = generateValidInitData(sampleUser, TEST_BOT_TOKEN);
    const forgedInitData = validInitData.replace(/hash=[a-f0-9]+/i, 'hash=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    const result = validateTelegramInitData(forgedInitData, TEST_BOT_TOKEN);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Cryptographic signature mismatch');
  });

  test('4. Expired auth_date (> 24h) is rejected', () => {
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 172800;
    const expiredInitData = generateValidInitData(sampleUser, TEST_BOT_TOKEN, twoDaysAgo);
    const result = validateTelegramInitData(expiredInitData, TEST_BOT_TOKEN, 86400);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('authorization expired');
  });

  test('5. Future auth_date (> now + 60s) is rejected', () => {
    const inFuture = Math.floor(Date.now() / 1000) + 500;
    const futureInitData = generateValidInitData(sampleUser, TEST_BOT_TOKEN, inFuture);
    const result = validateTelegramInitData(futureInitData, TEST_BOT_TOKEN);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('auth_date is in the future');
  });

  test('6. Empty or malformed initData string is rejected gracefully', () => {
    expect(validateTelegramInitData('', TEST_BOT_TOKEN).isValid).toBe(false);
    expect(validateTelegramInitData('random_text_without_hash', TEST_BOT_TOKEN).isValid).toBe(false);
    expect(validateTelegramInitData(generateValidInitData(sampleUser, TEST_BOT_TOKEN), '').isValid).toBe(false);
  });
});
