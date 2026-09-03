import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, recordAdminAudit, UserRole } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Мок-список сотрудников для демонстрации и разработки (fallback)
const INITIAL_STAFF = [
  {
    id: 'sa_root_001',
    email: 'owner@flightsaver.com',
    fullName: 'Главный Администратор',
    role: 'super_admin' as UserRole,
    status: 'active',
    lastLogin: 'Только что',
    createdAt: '2026-08-15T10:00:00Z',
  },
  {
    id: 'staff_concierge_01',
    email: 'concierge.alex@flightsaver.com',
    fullName: 'Алексей Смирнов (L2 Ops)',
    role: 'concierge' as UserRole,
    status: 'active',
    lastLogin: '2 часа назад',
    createdAt: '2026-08-20T14:30:00Z',
  },
  {
    id: 'staff_support_01',
    email: 'support.olga@flightsaver.com',
    fullName: 'Ольга Кузнецова (L1 Care)',
    role: 'support' as UserRole,
    status: 'active',
    lastLogin: 'Вчера в 18:40',
    createdAt: '2026-08-22T09:15:00Z',
  },
  {
    id: 'staff_auditor_01',
    email: 'security.auditor@flightsaver.com',
    fullName: 'Дмитрий Волков (Compliance & QA)',
    role: 'auditor' as UserRole,
    status: 'active',
    lastLogin: '3 дня назад',
    createdAt: '2026-08-25T11:00:00Z',
  },
];

let inMemoryStaff = [...INITIAL_STAFF];

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const supabaseAdmin = createAdminClient();
      const { data: dbStaff } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, role, updated_at, created_at')
        .neq('role', 'customer')
        .order('created_at', { ascending: false });

      if (dbStaff && dbStaff.length > 0) {
        const merged = [
          ...inMemoryStaff.filter((s) => !dbStaff.some((d) => d.id === s.id)),
          ...dbStaff.map((d) => ({
            id: d.id,
            email: d.email || 'staff@flightsaver.com',
            fullName: d.full_name || 'Сотрудник',
            role: d.role as UserRole,
            status: 'active',
            lastLogin: 'Недавно',
            createdAt: d.created_at || new Date().toISOString(),
          })),
        ];
        return NextResponse.json({ success: true, staff: merged });
      }
    } catch {}

    return NextResponse.json({ success: true, staff: inMemoryStaff });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Только Super Admin может управлять ролями персонала' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, fullName, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { success: false, error: 'Email и роль обязательны для заполнения' },
        { status: 400 }
      );
    }

    const newStaff = {
      id: 'staff_' + Math.random().toString(36).substring(2, 9),
      email: email.trim().toLowerCase(),
      fullName: fullName?.trim() || email.split('@')[0],
      role: role as UserRole,
      status: 'active',
      lastLogin: 'Ожидает первого входа',
      createdAt: new Date().toISOString(),
    };

    inMemoryStaff.unshift(newStaff);

    // Попытка сохранения в Supabase
    try {
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin.from('profiles').upsert(
        {
          id: newStaff.id,
          email: newStaff.email,
          full_name: newStaff.fullName,
          role: newStaff.role,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      );
    } catch {}

    // Фиксация в аудит-лог
    await recordAdminAudit({
      staffId: session.id,
      staffName: session.fullName,
      staffRole: session.role,
      action: 'STAFF_ROLE_ASSIGNED',
      entityType: 'STAFF_PROFILE',
      entityId: newStaff.id,
      details: { email: newStaff.email, assignedRole: newStaff.role },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, staff: newStaff });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, role } = body;

    const target = inMemoryStaff.find((s) => s.id === id);
    if (target) {
      if (status) target.status = status;
      if (role) target.role = role;
    }

    await recordAdminAudit({
      staffId: session.id,
      staffName: session.fullName,
      staffRole: session.role,
      action: 'STAFF_STATUS_UPDATED',
      entityType: 'STAFF_PROFILE',
      entityId: id,
      details: { status, role },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
