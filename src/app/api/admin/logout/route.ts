import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getAdminSession, recordAdminAudit } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    const session = await getAdminSession();
    if (session) {
      await recordAdminAudit({
        staffId: session.id,
        staffName: session.fullName,
        staffRole: session.role,
        action: 'ADMIN_LOGOUT',
        entityType: 'AUTH_SESSION',
        entityId: session.id,
      });
    }

    const response = NextResponse.json({ success: true, redirectUrl: '/admin/login' });
    response.cookies.delete(ADMIN_SESSION_COOKIE);
    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Logout error' }, { status: 500 });
  }
}
