/**
 * FLIGHTSAVER: TELEGRAM BOT WEBHOOK ENDPOINT
 * POST /api/telegram/webhook
 * 
 * Обработчик событий Telegram Bot API:
 * 1. /start auth_<sessionId>: Приветствие и запрос номера телефона (с правом пропуска).
 * 2. message.contact: Запись номера телефона, подтверждение сессии на компьютере и открытие TWA на телефоне.
 * 3. Текст "Пропустить": Подтверждение сессии на компьютере без телефона и открытие TWA на телефоне.
 * 4. /start (обычный) и /help: Запуск Mini App и справка.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import {
  associateTelegramUser,
  confirmTelegramAuthSession,
  getSessionIdByTelegramId,
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

    const webAppUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://flightsaver-pi.vercel.app';
    const tmaUrl = `${webAppUrl}/tma`;

    const telegramUser = {
      id: fromUser?.id || chatId,
      first_name: fromUser?.first_name || 'User',
      last_name: fromUser?.last_name || '',
      username: fromUser?.username || '',
      photo_url: '',
    };

    // =========================================================================
    // 1. ПОЛЬЗОВАТЕЛЬ ПОДЕЛИЛСЯ НОМЕРОМ ТЕЛЕФОНА (КНОПКА "Поделиться номером")
    // =========================================================================
    if (message.contact && message.contact.phone_number) {
      const phone = message.contact.phone_number;
      const telegramId = fromUser?.id || chatId;
      const sessionId = getSessionIdByTelegramId(telegramId);

      // Подтверждаем сессию авторизации на сайте
      if (sessionId) {
        await confirmTelegramAuthSession(sessionId, telegramUser, phone);
      }

      // Снимаем reply-клавиатуру и отправляем TWA-кнопку
      await sendTelegramMessage(
        chatId,
        `✅ <b>Номер телефона ${phone} успешно привязан!</b>\n\n🎉 <b>Авторизация завершена!</b> Если вы входили с компьютера — на сайте уже открылся ваш личный кабинет.\n\nА на телефоне вы можете сразу перейти к поиску умных билетов и отелей STPC:`,
        {
          parseMode: 'HTML',
          replyMarkup: {
            inline_keyboard: [
              [
                {
                  text: '✈️ Найти билеты (Открыть Mini App)',
                  web_app: { url: tmaUrl },
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
        }
      );

      return NextResponse.json({ ok: true });
    }

    // =========================================================================
    // 2. ПОЛЬЗОВАТЕЛЬ НАЖАЛ "ПРОПУСТИТЬ"
    // =========================================================================
    if (text.includes('Пропустить')) {
      const telegramId = fromUser?.id || chatId;
      const sessionId = getSessionIdByTelegramId(telegramId);

      // Подтверждаем сессию на сайте без телефона
      if (sessionId) {
        await confirmTelegramAuthSession(sessionId, telegramUser, null);
      }

      await sendTelegramMessage(
        chatId,
        `👍 <b>Принято! Вы сможете указать номер позже при покупке билета.</b>\n\n🎉 <b>Авторизация успешно завершена!</b> На компьютере страница обновилась.\n\nНажмите кнопку ниже, чтобы начать поиск билетов прямо в Telegram:`,
        {
          parseMode: 'HTML',
          replyMarkup: {
            inline_keyboard: [
              [
                {
                  text: '✈️ Найти билеты (Открыть Mini App)',
                  web_app: { url: tmaUrl },
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
        }
      );

      return NextResponse.json({ ok: true });
    }

    // =========================================================================
    // 3. КОМАНДА /start (С ПАРАМЕТРОМ АВТОРИЗАЦИИ ИЛИ БЕЗ)
    // =========================================================================
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startParam = parts[1]; // Параметр Deep Link: auth_<sessionId>

      // 3.1. Переход по ссылке / QR-коду с сайта: /start auth_<sessionId>
      if (startParam && startParam.startsWith('auth_')) {
        const sessionId = startParam.replace('auth_', '');
        await associateTelegramUser(sessionId, telegramUser);

        const promptHtml = `👋 <b>Здравствуйте, ${firstName}!</b>\n\nВы выполняете вход в <b>FlightSaver AI Concierge</b>.\n\n📱 <b>Хотите привязать ваш номер телефона для мгновенной выписки билетов и ваучеров STPC?</b>\nНажмите <b>«Поделиться номером»</b>, либо нажмите <b>«Пропустить»</b>:`;

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
                text: '⏩ Пропустить (введу при бронировании)',
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

      // 3.2. Стандартный запуск бота пользователем (без токена авторизации)
      const welcomeHtml = `👋 <b>Здравствуйте, ${firstName}!</b>\n\nДобро пожаловать в <b>FlightSaver AI</b> — интеллектуальный сервис умных авиабилетов!\n\n✈️ <b>Split-Ticketing</b> со скидкой до <b>40%</b>\n🏨 <b>Бесплатные отели STPC 4★/5★</b> при пересадках от 8 часов\n\nНажмите кнопку ниже, чтобы запустить поиск:`;

      const replyMarkup = {
        inline_keyboard: [
          [
            {
              text: '🚀 Открыть FlightSaver (Mini App)',
              web_app: { url: tmaUrl },
            },
          ],
          [
            {
              text: '🌐 Открыть веб-сайт',
              url: webAppUrl,
            },
          ],
        ],
      };

      await sendTelegramMessage(chatId, welcomeHtml, {
        parseMode: 'HTML',
        replyMarkup,
      });

      return NextResponse.json({ ok: true });
    }

    // =========================================================================
    // 4. КОМАНДА /help
    // =========================================================================
    if (text.startsWith('/help')) {
      const helpHtml = `ℹ️ <b>Справка FlightSaver:</b>\n\n1. Откройте приложение кнопкой ниже.\n2. Введите маршрут (например: <i>«Москва - Бангкок 15 сентября»</i>).\n3. ИИ подберет составной маршрут с отелем STPC.\n\nПоддержка: @FlightSaverSupport`;

      await sendTelegramMessage(chatId, helpHtml, {
        parseMode: 'HTML',
        replyMarkup: {
          inline_keyboard: [
            [
              {
                text: '✈️ Найти билеты в Mini App',
                web_app: { url: tmaUrl },
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
