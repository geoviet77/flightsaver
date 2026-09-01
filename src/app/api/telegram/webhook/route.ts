/**
 * FLIGHTSAVER: TELEGRAM BOT WEBHOOK ENDPOINT
 * POST /api/telegram/webhook
 * 
 * Обработчик двухшагового онбординга:
 * Шаг 1: Запрос номера телефона (кнопка контакта или пропуск).
 * Шаг 2: Запрос геолокации (кнопка геолокации или пропуск).
 * Финал: Авторизация на компьютере и выдача кнопки Mini App на телефоне.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import {
  associateTelegramUser,
  confirmTelegramAuthSession,
  getSessionIdByTelegramId,
  getUserOnboarding,
  setUserOnboarding,
} from '@/lib/telegramSession';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    let update: any = null;
    try {
      update = await req.json();
    } catch {
      return NextResponse.json({ ok: true });
    }

    if (!update) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message || update.edited_message;
    if (!message || !message.chat || !message.chat.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = (message.text || '').trim();
    const fromUser = message.from;
    const firstName = fromUser?.first_name || 'Путешественник';
    const telegramId = fromUser?.id || chatId;

    const rawWebAppUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://flightsaver-pi.vercel.app';
    const webAppUrl = rawWebAppUrl.endsWith('/') ? rawWebAppUrl : `${rawWebAppUrl}/`;

    const telegramUser = {
      id: telegramId,
      first_name: fromUser?.first_name || 'User',
      last_name: fromUser?.last_name || '',
      username: fromUser?.username || '',
      photo_url: '',
    };

    const onboarding = getUserOnboarding(telegramId);
    let sessionId = getSessionIdByTelegramId(telegramId);

    // =========================================================================
    // 1. ШАГ 1: ПОЛУЧЕНИЕ НОМЕРА ТЕЛЕФОНА (message.contact)
    // =========================================================================
    if (message.contact && message.contact.phone_number) {
      const phone = message.contact.phone_number;
      setUserOnboarding(telegramId, { phone, step: 'awaiting_location' });

      // Переходим к шагу 2: Запрос геолокации
      const step2Html = `✅ <b>Номер телефона успешно сохранен!</b>\n\n📍 <b>Шаг 2 из 2: Поделитесь вашей геопозицией</b>, чтобы ИИ определил ближайший к вам аэропорт вылета со специальными тарифами Split-Ticketing и бесплатными отелями STPC:\n\n<i>Нажмите «Поделиться геопозицией» или «Пропустить шаг»:</i>`;

      await sendTelegramMessage(chatId, step2Html, {
        parseMode: 'HTML',
        replyMarkup: {
          keyboard: [
            [
              {
                text: '📍 Поделиться геопозицией',
                request_location: true,
              },
            ],
            [
              {
                text: '⏩ Пропустить шаг с геопозицией',
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });

      return NextResponse.json({ ok: true });
    }

    // =========================================================================
    // 2. ШАГ 2: ПОЛУЧЕНИЕ ГЕОЛОКАЦИИ (message.location) -> ФИНАЛ АВТОРИЗАЦИИ
    // =========================================================================
    if (message.location && typeof message.location.latitude === 'number') {
      const location = {
        latitude: message.location.latitude,
        longitude: message.location.longitude,
      };

      setUserOnboarding(telegramId, { location, step: 'completed' });

      // Завершаем авторизацию на компьютере
      if (sessionId) {
        await confirmTelegramAuthSession(sessionId, telegramUser, onboarding.phone, location);
      }

      // Отправляем финальное сообщение строго без inline-кнопок
      const finishHtml = `🎉 <b>Все данные успешно приняты! Авторизация завершена.</b>\n\nВы можете вернуться в открытое приложение FlightSaver или запустить его кнопкой меню «Найти билеты».`;

      await sendTelegramMessage(chatId, finishHtml, {
        parseMode: 'HTML',
        replyMarkup: {
          remove_keyboard: true,
        },
      });

      return NextResponse.json({ ok: true });
    }

    // =========================================================================
    // 3. ОБРАБОТКА КНОПОК "ПРОПУСТИТЬ"
    // =========================================================================
    if (text.includes('Пропустить')) {
      // Если пропущен шаг с номером телефона -> переходим к шагу 2 (геолокация)
      if (onboarding.step === 'awaiting_phone') {
        setUserOnboarding(telegramId, { phone: null, step: 'awaiting_location' });

        const step2Html = `👍 <b>Номер телефона можно будет указать при оформлении билета.</b>\n\n📍 <b>Шаг 2 из 2: Поделитесь вашей геопозицией</b>, чтобы ИИ определил ближайший к вам аэропорт вылета со специальными тарифами:\n\n<i>Нажмите «Поделиться геопозицией» или «Пропустить шаг»:</i>`;

        await sendTelegramMessage(chatId, step2Html, {
          parseMode: 'HTML',
          replyMarkup: {
            keyboard: [
              [
                {
                  text: '📍 Поделиться геопозицией',
                  request_location: true,
                },
              ],
              [
                {
                  text: '⏩ Пропустить шаг с геопозицией',
                },
              ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });

        return NextResponse.json({ ok: true });
      }

      // Если пропущен шаг с геолокацией -> ФИНАЛ АВТОРИЗАЦИИ
      setUserOnboarding(telegramId, { location: null, step: 'completed' });

      if (sessionId) {
        await confirmTelegramAuthSession(sessionId, telegramUser, onboarding.phone, null);
      }

      const finishHtml = `🎉 <b>Все данные успешно приняты! Авторизация завершена.</b>\n\nВы можете вернуться в открытое приложение FlightSaver или запустить его кнопкой меню «Найти билеты».`;

      await sendTelegramMessage(chatId, finishHtml, {
        parseMode: 'HTML',
        replyMarkup: {
          remove_keyboard: true,
        },
      });

      return NextResponse.json({ ok: true });
    }


    // =========================================================================
    // 4. КОМАНДА /start (ВХОД ЧЕРЕЗ QR ИЛИ ДИПЛИНК)
    // =========================================================================
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startParam = parts[1]; // auth_<sessionId>

      if (startParam && startParam.startsWith('auth_')) {
        sessionId = startParam.replace('auth_', '');
        await associateTelegramUser(sessionId, telegramUser);
        setUserOnboarding(telegramId, { step: 'awaiting_phone' });

        const promptHtml = `👋 <b>Здравствуйте, ${firstName}!</b>\n\nВы выполняете вход во <b>FlightSaver AI Concierge</b>.\n\n📱 <b>Шаг 1 из 2: Поделитесь номером телефона</b> для мгновенного оформления билетов и ваучеров STPC:\n\n<i>Нажмите «Поделиться номером» либо «Пропустить»:</i>`;

        const replyMarkup = {
          keyboard: [
            [
              {
                text: '📱 Поделиться номером для билетов',
                request_contact: true,
              },
            ],
            [
              {
                text: '⏩ Пропустить шаг с номером',
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        };

        await sendTelegramMessage(chatId, promptHtml, {
          parseMode: 'HTML',
          replyMarkup,
        });

        return NextResponse.json({ ok: true });
      }

      // Стандартный запуск без ссылки авторизации
      const welcomeHtml = `👋 <b>Здравствуйте, ${firstName}!</b>\n\nДобро пожаловать в <b>FlightSaver AI</b> — интеллектуальный сервис умных авиабилетов!\n\n✈️ <b>Split-Ticketing</b> со скидкой до <b>40%</b>\n🏨 <b>Бесплатные отели STPC 4★/5★</b> при пересадках от 8 часов\n\nНажмите кнопку ниже, чтобы запустить поиск:`;

      await sendTelegramMessage(chatId, welcomeHtml, {
        parseMode: 'HTML',
        replyMarkup: {
          inline_keyboard: [
            [
              {
                text: '🚀 Открыть FlightSaver (Mini App)',
                web_app: { url: webAppUrl },
              },
            ],
            [
              {
                text: '🌐 Открыть веб-сайт',
                url: webAppUrl,
              },
            ],
          ],
        },
      });

      return NextResponse.json({ ok: true });
    }

    // =========================================================================
    // 5. КОМАНДА /help
    // =========================================================================
    if (text.startsWith('/help')) {
      const helpHtml = `ℹ️ <b>Справка FlightSaver:</b>\n\n1. Откройте приложение кнопкой меню «Найти билеты».\n2. Введите маршрут (например: <i>«Москва - Бангкок 15 сентября»</i>).\n3. ИИ подберет составной маршрут с отелем STPC.\n\nПоддержка: @FlightSaverSupport`;

      await sendTelegramMessage(chatId, helpHtml, {
        parseMode: 'HTML',
        replyMarkup: {
          inline_keyboard: [
            [
              {
                text: '✈️ Найти билеты в Mini App',
                web_app: { url: webAppUrl },
              },
            ],
          ],
        },
      });

      return NextResponse.json({ ok: true });
    }


    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[/api/telegram/webhook] Webhook Processing Error:', err);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'FlightSaver Telegram Bot Webhook',
    timestamp: new Date().toISOString(),
  });
}
