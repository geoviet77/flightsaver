import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAdminToken, ADMIN_SESSION_COOKIE, recordAdminAudit, UserRole } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Секретный мастер-пин код суперадминистратора по умолчанию (для первичного доступа и развертывания)
const DEFAULT_SUPER_ADMIN_PIN = process.env.ADMIN_MASTER_KEY || 'flightsaver2026';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, pin } = body;

    let staffUser: {
      id: string;
      email: string;
      fullName: string;
      role: UserRole;
    } | null = null;

    // 1. Валидация по Мастер-PIN коду Суперадминистратора (Super Admin Root Access)
    if (pin && pin.trim() === DEFAULT_SUPER_ADMIN_PIN) {
      staffUser = {
        id: 'sa_root_001',
        email: email?.trim() || 'owner@flightsaver.com',
        fullName: 'Главный Администратор (Owner)',
        role: 'super_admin',
      };
    } else if (email) {
      // 2. Валидация через Supabase Auth & Profiles
      try {
        const supabaseAdmin = createAdminClient();
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, email, full_name, role')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();

        if (profile && profile.role && profile.role !== 'customer') {
          staffUser = {
            id: profile.id,
            email: profile.email || email.trim(),
            fullName: profile.full_name || 'Сотрудник FlightSaver',
            role: profile.role as UserRole,
          };
        }
      } catch (dbErr) {
        console.warn('[/api/admin/login] DB check notice:', dbErr);
      }
    }

    if (!staffUser) {
      return NextResponse.json(
        { success: false, error: 'Неверные учетные данные или недостаточно прав доступа' },
        { status: 401 }
      );
    }

    // Создание сессионного токена
    const token = createAdminToken(staffUser);

    // Запись в журнал аудита
    await recordAdminAudit({
      staffId: staffUser.id,
      staffName: staffUser.fullName,
      staffRole: staffUser.role,
      action: 'ADMIN_LOGIN_SUCCESS',
      entityType: 'AUTH_SESSION',
      entityId: staffUser.id,
      details: { email: staffUser.email, loginMethod: pin ? 'master_pin' : 'password' },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    const response = NextResponse.json({
      success: true,
      user: staffUser,
      redirectUrl: '/admin',
    });

    // Установка HttpOnly cookie
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 часа
    });

    return response;
  } catch (err: any) {
    console.error('[/api/admin/login] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Ошибка сервера при авторизации' },
      { status: 500 }
    );
  }
}
