/**
 * FLIGHTSAVER: TELEGRAM BOT WEBHOOK ENDPOINT
 * POST /api/telegram/webhook
 * 
 * Обработчик входящих событий и команд от Telegram Bot API:
 * 1. /start auth_<sessionId>: Мгновенное подтверждение входа на сайте по QR / Deep Link.
 * 2. Запрос номера телефона (request_contact) с правом отказа (кнопка "Пропустить").
 * 3. /start: Стандартное приветствие с выгодами Split-Ticketing/STPC и кнопка запуска Web App.
 * 4. /help: Справка и поддержка.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { confirmTelegramAuthSession, updateTelegramUserPhone } from '@/lib/telegramSession';

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
    const firstName = message.from?.first_name || 'Путешественник';

    const webAppUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://flightsaver-pi.vercel.app';

    // 1. Пользователь поделился номером телефона (нативная кнопка request_contact)
    if (message.contact && message.contact.phone_number) {
      const phone = message.contact.phone_number;
      const telegramId = message.from?.id || chatId;
      await updateTelegramUserPhone(telegramId, phone);

      await sendTelegramMessage(
        chatId,
        `✅ <b>Номер телефона ${phone} успешно привязан к вашему аккаунту FlightSaver!</b>\n\nТеперь при оформлении билетов со скидками Split-Ticketing и ваучеров STPC данные будут подставляться автоматически.`,
        {
          parseMode: 'HTML',
          replyMarkup: {
            remove_keyboard: true,
          },
        }
      );

      return NextResponse.json({ ok: true });
    }

    // 2. Пользователь нажал "Пропустить"
    if (text.includes('Пропустить')) {
      await sendTelegramMessage(
        chatId,
        `👍 <b>Договорились!</b> Вы сможете ввести контактные данные позже, на этапе покупки билета.\n\nПриятных и выгодных полетов вместе с FlightSaver! ✈️`,
        {
          parseMode: 'HTML',
          replyMarkup: {
            remove_keyboard: true,
          },
        }
      );

      return NextResponse.json({ ok: true });
    }

    // 3. Команда /start
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startParam = parts[1]; // Параметр Deep Link: auth_<sessionId>

      // 3.1. Если это авторизация по QR-коду или Deep Link
      if (startParam && startParam.startsWith('auth_')) {
        const sessionId = startParam.replace('auth_', '');
        const telegramUser = {
          id: message.from.id,
          first_name: message.from.first_name,
          last_name: message.from.last_name,
          username: message.from.username,
        };

        // Мгновенно подтверждаем сессию на сайте!
        await confirmTelegramAuthSession(sessionId, telegramUser);

        const authSuccessHtml = `🎉 <b>Вход на сайт успешно подтвержден!</b>\n\nЗдравствуйте, <b>${firstName}</b>! Страница FlightSaver в вашем браузере уже авторизована.\n\n📱 <b>Хотите привязать номер телефона для мгновенной выписки авиабилетов?</b>\nНажмите кнопку ниже, чтобы поделиться номером, либо нажмите «Пропустить»:`;

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

        await sendTelegramMessage(chatId, authSuccessHtml, {
          parseMode: 'HTML',
          replyMarkup,
        });

        return NextResponse.json({ ok: true });
      }

      // 3.2. Обычный старт бота без параметров авторизации
      const welcomeHtml = `👋 <b>Здравствуйте, ${firstName}!</b>\n\nДобро пожаловать в <b>FlightSaver AI</b> — интеллектуальный сервис умных авиабилетов нового поколения!\n\n<b>Наши ключевые преимущества:</b>\n✈️ <b>Split-Ticketing</b> — раздельная выписка билетов по разным плечам со скидкой до <b>40%</b>.\n🏨 <b>Бесплатные отели STPC 4★/5★</b> — автоматический подбор программ транзитного размещения ($0) при стыковках от 8 часов.\n🤖 <b>ИИ-консьерж</b> — подбор составных маршрутов на естественном языке.\n\nНажмите кнопку ниже, чтобы запустить приложение прямо в Telegram:`;

      const replyMarkup = {
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
      };

      await sendTelegramMessage(chatId, welcomeHtml, {
        parseMode: 'HTML',
        replyMarkup,
      });

      return NextResponse.json({ ok: true });
    }

    // 4. Команда /help
    if (text.startsWith('/help')) {
      const helpHtml = `ℹ️ <b>Справка по использованию FlightSaver:</b>\n\n1. <b>Как найти билет?</b>\nОткройте Mini App по кнопке ниже и введите запрос на естественном языке, например:\n<i>«Москва Бангкок 15 сентября эконом»</i> или <i>«Иркутск Дюссельдорф с отелем STPC»</i>.\n\n2. <b>Что такое Split-Ticketing?</b>\nЭто умная комбинация двух раздельных билетов от независимых перевозчиков, экономящая до половины стоимости.\n\n3. <b>Поддержка:</b>\nПо всем вопросам пишите в нашу службу заботы: @FlightSaverSupport.`;

      const replyMarkup = {
        inline_keyboard: [
          [
            {
              text: '✈️ Найти билеты в Mini App',
              web_app: { url: webAppUrl },
            },
          ],
        ],
      };

      await sendTelegramMessage(chatId, helpHtml, {
        parseMode: 'HTML',
        replyMarkup,
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
