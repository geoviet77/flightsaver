import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, UserRole } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Мок-реестр событий аудита (богатая история действий для демонстрации соответствия стандартам безопасности)
const SEED_AUDIT_LOGS = [
  {
    id: 'aud_log_001',
    staffId: 'sa_root_001',
    staffName: 'Главный Администратор (Owner)',
    staffRole: 'super_admin' as UserRole,
    action: 'BUSINESS_SETTINGS_UPDATED',
    entityType: 'GLOBAL_CONFIG',
    entityId: 'global_config',
    details: {
      fxBufferPercent: 1.5,
      splitTicketingFeeRub: 1500,
      stpcEnabled: true,
      duffelLiveEnabled: true,
    },
    ipAddress: '185.220.101.5',
    createdAt: '2026-09-03T11:55:00Z',
  },
  {
    id: 'aud_log_002',
    staffId: 'staff_concierge_01',
    staffName: 'Алексей Смирнов (L2 Ops)',
    staffRole: 'concierge' as UserRole,
    action: 'ORDER_UPDATED_BY_CONCIERGE',
    entityType: 'ORDER',
    entityId: 'ORD-FS9948',
    details: {
      leg1Pnr: 'EK8894K',
      leg2Pnr: 'QR7712M',
      stpcStatus: 'voucher_issued',
      stpcHotelName: 'Le Méridien Dubai Hotel & Conference Centre 5★',
    },
    ipAddress: '95.173.136.22',
    createdAt: '2026-09-03T11:40:00Z',
  },
  {
    id: 'aud_log_003',
    staffId: 'sa_root_001',
    staffName: 'Главный Администратор (Owner)',
    staffRole: 'super_admin' as UserRole,
    action: 'STAFF_ROLE_ASSIGNED',
    entityType: 'STAFF_PROFILE',
    entityId: 'staff_auditor_01',
    details: {
      email: 'security.auditor@flightsaver.com',
      assignedRole: 'auditor',
    },
    ipAddress: '185.220.101.5',
    createdAt: '2026-09-03T11:30:00Z',
  },
  {
    id: 'aud_log_004',
    staffId: 'staff_concierge_01',
    staffName: 'Алексей Смирнов (L2 Ops)',
    staffRole: 'concierge' as UserRole,
    action: 'REISSUE_PDF_RECEIPT',
    entityType: 'ORDER',
    entityId: 'ORD-FS9948',
    details: {
      action: 'cache_invalidated_and_recompiled',
    },
    ipAddress: '95.173.136.22',
    createdAt: '2026-09-03T11:15:00Z',
  },
  {
    id: 'aud_log_005',
    staffId: 'sa_root_001',
    staffName: 'Главный Администратор (Owner)',
    staffRole: 'super_admin' as UserRole,
    action: 'STRIPE_REFUND_EXECUTED',
    entityType: 'ORDER',
    entityId: 'ORD-FS9950',
    details: {
      amountRub: 42150,
      reason: 'Запрос вынужденного возврата по медицинским показаниям',
      paymentIntentId: 'pi_3N9XkK2eZvKYlo2C0abcde03',
    },
    ipAddress: '185.220.101.5',
    createdAt: '2026-09-02T16:30:00Z',
  },
  {
    id: 'aud_log_006',
    staffId: 'sa_root_001',
    staffName: 'Главный Администратор (Owner)',
    staffRole: 'super_admin' as UserRole,
    action: 'ADMIN_LOGIN_SUCCESS',
    entityType: 'AUTH_SESSION',
    entityId: 'sa_root_001',
    details: { loginMethod: 'master_pin' },
    ipAddress: '185.220.101.5',
    createdAt: '2026-09-02T14:00:00Z',
  },
];

let inMemoryAuditLogs: any[] = [...SEED_AUDIT_LOGS];

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get('role') || 'all';
    const entityFilter = searchParams.get('entity') || 'all';
    const query = (searchParams.get('q') || '').trim().toLowerCase();

    // 1. Попытка чтения из Supabase
    try {
      const supabaseAdmin = createAdminClient();
      const { data: dbLogs } = await supabaseAdmin
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (dbLogs && dbLogs.length > 0) {
        const formatted = dbLogs.map((d: any) => ({
          id: d.id,
          staffId: d.staff_id,
          staffName: d.staff_name,
          staffRole: d.staff_role,
          action: d.action,
          entityType: d.entity_type,
          entityId: d.entity_id,
          details: d.details || {},
          ipAddress: d.ip_address || '127.0.0.1',
          createdAt: d.created_at,
        }));

        inMemoryAuditLogs = [
          ...inMemoryAuditLogs.filter((s) => !formatted.some((f: any) => f.id === s.id)),
          ...formatted,
        ];
      }
    } catch {}

    let logs = [...inMemoryAuditLogs];

    // Фильтры
    if (roleFilter !== 'all') {
      logs = logs.filter((l) => l.staffRole === roleFilter);
    }

    if (entityFilter !== 'all') {
      logs = logs.filter((l) => l.entityType === entityFilter);
    }

    if (query) {
      logs = logs.filter(
        (l) =>
          l.staffName.toLowerCase().includes(query) ||
          l.action.toLowerCase().includes(query) ||
          (l.entityId && l.entityId.toLowerCase().includes(query)) ||
          (l.ipAddress && l.ipAddress.includes(query))
      );
    }

    const stats = {
      total: inMemoryAuditLogs.length,
      superAdminActions: inMemoryAuditLogs.filter((l) => l.staffRole === 'super_admin').length,
      conciergeActions: inMemoryAuditLogs.filter((l) => l.staffRole === 'concierge').length,
      supportActions: inMemoryAuditLogs.filter((l) => l.staffRole === 'support').length,
      refundActions: inMemoryAuditLogs.filter((l) => l.action.includes('REFUND')).length,
    };

    return NextResponse.json({
      success: true,
      logs,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
