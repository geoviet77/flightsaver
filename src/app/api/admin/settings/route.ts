import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, recordAdminAudit } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface GlobalSettings {
  fxBufferPercent: number;
  splitTicketingFeeRub: number;
  stpcEnabled: boolean;
  duffelLiveEnabled: boolean;
  amadeusLiveEnabled: boolean;
  updatedAt: string;
}

let inMemorySettings: GlobalSettings = {
  fxBufferPercent: 1.5,
  splitTicketingFeeRub: 1500,
  stpcEnabled: true,
  duffelLiveEnabled: true,
  amadeusLiveEnabled: false,
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const supabaseAdmin = createAdminClient();
      const { data } = await supabaseAdmin
        .from('admin_settings')
        .select('*')
        .eq('id', 'global_config')
        .maybeSingle();

      if (data) {
        inMemorySettings = {
          fxBufferPercent: Number(data.fx_buffer_percent) || 1.5,
          splitTicketingFeeRub: Number(data.split_ticketing_fee_rub) || 1500,
          stpcEnabled: Boolean(data.stpc_enabled),
          duffelLiveEnabled: Boolean(data.duffel_live_enabled),
          amadeusLiveEnabled: Boolean(data.amadeus_live_enabled),
          updatedAt: data.updated_at || new Date().toISOString(),
        };
      }
    } catch {}

    return NextResponse.json({ success: true, settings: inMemorySettings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Только Super Admin может изменять финансовые и бизнес-настройки' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fxBufferPercent, splitTicketingFeeRub, stpcEnabled, duffelLiveEnabled, amadeusLiveEnabled } = body;

    inMemorySettings = {
      fxBufferPercent: typeof fxBufferPercent === 'number' ? fxBufferPercent : inMemorySettings.fxBufferPercent,
      splitTicketingFeeRub:
        typeof splitTicketingFeeRub === 'number' ? splitTicketingFeeRub : inMemorySettings.splitTicketingFeeRub,
      stpcEnabled: typeof stpcEnabled === 'boolean' ? stpcEnabled : inMemorySettings.stpcEnabled,
      duffelLiveEnabled: typeof duffelLiveEnabled === 'boolean' ? duffelLiveEnabled : inMemorySettings.duffelLiveEnabled,
      amadeusLiveEnabled:
        typeof amadeusLiveEnabled === 'boolean' ? amadeusLiveEnabled : inMemorySettings.amadeusLiveEnabled,
      updatedAt: new Date().toISOString(),
    };

    try {
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin.from('admin_settings').upsert({
        id: 'global_config',
        fx_buffer_percent: inMemorySettings.fxBufferPercent,
        split_ticketing_fee_rub: inMemorySettings.splitTicketingFeeRub,
        stpc_enabled: inMemorySettings.stpcEnabled,
        duffel_live_enabled: inMemorySettings.duffelLiveEnabled,
        amadeus_live_enabled: inMemorySettings.amadeusLiveEnabled,
        updated_at: inMemorySettings.updatedAt,
        updated_by: session.fullName,
      });
    } catch {}

    // Фиксация в аудит-лог
    await recordAdminAudit({
      staffId: session.id,
      staffName: session.fullName,
      staffRole: session.role,
      action: 'BUSINESS_SETTINGS_UPDATED',
      entityType: 'GLOBAL_CONFIG',
      entityId: 'global_config',
      details: inMemorySettings,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({ success: true, settings: inMemorySettings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
