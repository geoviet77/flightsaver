/**
 * FLIGHTSAVER: TELEGRAM BOT WEBHOOK ENDPOINT
 * POST /api/telegram/webhook
 * 
 * Обработчик двухшагового онбординга:
 * Шаг 1: Запрос номера телефона (кнопка контакта или пропуск).
 * Шаг 2: Запрос геолокации (кнопка геолокации или пропуск).
 * Финал: Авторизация на компьютере и синхронизация сессии.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import {
  associateTelegramUser,
  saveUserPhone,
  confirmSessionByTelegramUser,
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

    if (!update || !update.message) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat?.id;
    const fromUser = message.from;
    const text = (message.text || '').trim();
    const telegramId = fromUser?.id;

    if (!chatId || !telegramId) {
      return NextResponse.json({ ok: true });
    }

    const firstName = fromUser?.first_name || 'Путешественник';
    const rawWebAppUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'https://flightsaver-pi.vercel.app';
    const webAppUrl = rawWebAppUrl.endsWith('/') ? rawWebAppUrl : `${rawWebAppUrl}/`;

    const telegramUser = {
      id: telegramId,
      first_name: fromUser?.first_name || 'User',
      last_name: fromUser?.last_name || '',
      username: fromUser?.username || '',
      photo_url: '',
    };

    // =========================================================================
    // 1. ШАГ 1: ПОЛУЧЕНИЕ НОМЕРА ТЕЛЕФОНА (message.contact)
    // =========================================================================
    if (message.contact && message.contact.phone_number) {
      const phone = message.contact.phone_number;
      await saveUserPhone(telegramId, phone);

      // Переходим к шагу 2: Запрос геолокации без кнопки пропуска
      const step2Html = `✅ <b>Номер телефона принят!</b>\n\n📍 <b>Шаг 2 из 2: Поделитесь вашей геопозицией</b>, чтобы определить ваш город и ближайший аэропорт вылета со спецтарифами:`;

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

      // Завершаем авторизацию и синхронизируем с десктопом
      const confirmResult = await confirmSessionByTelegramUser(telegramUser, location);

      const airportInfo = confirmResult?.originCity
        ? `\n\n🛫 Ближайший аэропорт вылета: <b>${confirmResult.originCity} (${confirmResult.originIata})</b>.`
        : '';

      const finishHtml = `🎉 <b>Вход на компьютере успешно выполнен!</b>${airportInfo}\n\nВсе данные синхронизированы с вашим личным кабинетом. Можете вернуться к экрану компьютера. Этот чат можно закрыть.`;

      await sendTelegramMessage(chatId, finishHtml, {
        parseMode: 'HTML',
        replyMarkup: {
          remove_keyboard: true,
        },
      });

      return NextResponse.json({ ok: true });
    }

    // =========================================================================
    // 3. КОМАНДА /start (ВХОД ЧЕРЕЗ QR ИЛИ ДИПЛИНК)
    // =========================================================================
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startParam = parts[1]; // auth_<sessionId>

      if (startParam && startParam.startsWith('auth_')) {
        const sessionId = startParam.replace('auth_', '');
        await associateTelegramUser(sessionId, telegramUser);

        const promptHtml = `💻 <b>Вход во FlightSaver на компьютере</b>\n\n👋 Здравствуйте, ${firstName}!\n\n📱 <b>Шаг 1 из 2:</b> Подтвердите ваш номер телефона для завершения входа и синхронизации с личным кабинетом:`;

        const replyMarkup = {
          keyboard: [
            [
              {
                text: '📱 Подтвердить номер телефона',
                request_contact: true,
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
