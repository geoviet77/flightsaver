/**
 * FLIGHTSAVER: AUTH LOGOUT ENDPOINT
 * POST /api/auth/logout
 * 
 * Очищает серверные сессионные cookies (fs_tg_session) для безопасного выхода из аккаунта.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

  // Сбрасываем cookie fs_tg_session
  response.cookies.set({
    name: 'fs_tg_session',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
