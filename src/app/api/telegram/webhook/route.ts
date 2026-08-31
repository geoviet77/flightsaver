/**
 * FLIGHTSAVER: TELEGRAM BOT WEBHOOK ENDPOINT
 * POST /api/telegram/webhook
 * 
 * Обработчик входящих событий и команд от Telegram Bot API:
 * - /start: Приветствие с выгодами Split-Ticketing/STPC и кнопка запуска Web App
 * - /help: Инструкции по использованию и поддержке
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    let update: any = null;
    try {
      update = await req.json();
    } catch {
      // Всегда возвращаем 200, даже если тело не является JSON, для Telegram
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

    if (text.startsWith('/start')) {
      const welcomeHtml = `👋 <b>Здравствуйте, ${firstName}!</b>

Добро пожаловать в <b>FlightSaver AI</b> — интеллектуальный сервис умных авиабилетов нового поколения!

<b>Наши ключевые преимущества:</b>
✈️ <b>Split-Ticketing</b> — раздельная выписка билетов по разным плечам со скидкой до <b>40%</b> относительно моно-тарифов.
🏨 <b>Бесплатные отели STPC 4★/5★</b> — автоматический подбор программ транзитного размещения ($0) при длинных пересадках от 8 часов.
🤖 <b>ИИ-консьерж</b> — подбор сложных составных маршрутов на естественном языке.

Нажмите кнопку ниже, чтобы запустить приложение прямо в Telegram:`;

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
    } else if (text.startsWith('/help')) {
      const helpHtml = `ℹ️ <b>Справка по использованию FlightSaver:</b>

1. <b>Как найти билет?</b>
Откройте Mini App по кнопке ниже и введите запрос на естественном языке, например:
<i>«Москва Бангкок 15 сентября эконом»</i> или <i>«Иркутск Дюссельдорф с отелем STPC»</i>.

2. <b>Что такое Split-Ticketing?</b>
Это умная комбинация двух раздельных билетов от независимых перевозчиков, что позволяет сэкономить до половины стоимости прямого перелета.

3. <b>Поддержка:</b>
По всем вопросам бронирования и билетов пишите в нашу службу заботы: @FlightSaverSupport.`;

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
    }

    // Всегда возвращаем { ok: true } со статусом 200
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[/api/telegram/webhook] Webhook Processing Error:', err);
    // Возвращаем 200 OK даже при внутренних ошибках, чтобы Telegram не спамил повторами
    return NextResponse.json({ ok: true });
  }
}

// Telegram иногда пингует вебхуки через GET для проверки доступности
export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'FlightSaver Telegram Bot Webhook',
    timestamp: new Date().toISOString(),
  });
}
