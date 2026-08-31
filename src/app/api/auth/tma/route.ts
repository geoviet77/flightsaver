import { NextRequest, NextResponse } from 'next/server';
import { TelegramAuthService } from '@/lib/tma/telegramAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { initData } = body;

    if (!initData) {
      return NextResponse.json(
        { success: false, error: 'Параметр initData обязателен' },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '5551234567:AAFakeTestBotTokenForValidation';
    const validation = TelegramAuthService.validateInitData(initData, botToken);

    if (!validation.isValid) {
      // Режим разработки: если токен не настроен и передан тестовый флаг
      if (process.env.NODE_ENV === 'development' && initData.includes('test_mode=true')) {
        return NextResponse.json({
          success: true,
          user: {
            id: 999888777,
            first_name: 'Telegram',
            last_name: 'Tester',
            username: 'tg_tester',
          },
          isMock: true,
        });
      }

      return NextResponse.json(
        { success: false, error: 'Криптографическая проверка подписи Telegram initData не пройдена' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: validation.user,
      authenticatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[TMA Auth API] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Ошибка сервера при авторизации TMA' },
      { status: 500 }
    );
  }
}
