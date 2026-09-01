/**
 * FLIGHTSAVER: TELEGRAM QR & DEEP LINK AUTH SESSION ENDPOINT
 * 
 * POST /api/auth/telegram/session — Создание новой сессии авторизации (QR-код и Deep Link).
 * GET  /api/auth/telegram/session?id=<sessionId> — Опрос статуса подтверждения сессии.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTelegramAuthSession, getTelegramAuthSession } from '@/lib/telegramSession';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 1. Создание сессии (возвращает ссылку для бота и QR-код)
export async function POST() {
  try {
    const session = await createTelegramAuthSession();
    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      deepLink: session.deepLink,
      qrCodeUrl: session.qrCodeUrl,
      expiresAt: session.expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create auth session' },
      { status: 500 }
    );
  }
}

// 2. Проверка статуса сессии клиентом
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = await getTelegramAuthSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, status: 'expired', error: 'Session not found or expired' },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      status: session.status,
      user: session.user || null,
      redirectUrl: session.status === 'confirmed' ? '/dashboard' : undefined,
    });

    // Если сессия подтверждена, устанавливаем безопасный HttpOnly cookie
    if (session.status === 'confirmed' && session.user) {
      const sessionToken = Buffer.from(
        JSON.stringify({
          userId: session.user.id,
          telegramId: session.user.telegramId,
          fullName: session.user.fullName,
          username: session.user.username,
          phone: session.user.phone,
          issuedAt: Date.now(),
        })
      ).toString('base64');

      response.cookies.set({
        name: 'fs_tg_session',
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 дней
      });
    }

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Error checking session' },
      { status: 500 }
    );
  }
}
