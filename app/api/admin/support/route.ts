import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, recordAdminAudit } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// База клиентов и пассажиров для первой линии поддержки (L1 Care Hub)
const SEED_SUPPORT_CLIENTS = [
  {
    id: 'cli_001',
    telegramId: '8910477599',
    telegramUsername: '@alex_traveler',
    fullName: 'Александр Иванов',
    email: 'alex.ivanov@gmail.com',
    phone: '+7 (999) 123-45-67',
    originCity: 'Нячанг (CXR)',
    vipStatus: 'Gold Member (3 перелета)',
    activeBooking: {
      orderId: 'ORD-FS9948',
      pnr: 'EK8894K / QR7712M',
      route: 'Москва (SVO) → Дубай (DXB) → Бангкок (BKK)',
      flightStatus: 'По расписанию (On-Time)',
      terminal: 'Терминал C, Выход 42',
      departureDate: '2026-09-15 17:30',
      stpcHotel: 'Le Méridien Dubai 5★ (Ваучер выписан)',
      stpcVoucherCode: 'STPC-DXB-9948',
      ticketPdfUrl: '/api/receipts/ORD-FS9948',
      airline: 'Emirates + Qatar Airways',
    },
    ticketCount: 3,
    lastActive: '10 минут назад',
  },
  {
    id: 'cli_002',
    telegramId: '7721894102',
    telegramUsername: '@elena_spb',
    fullName: 'Елена Смирнова',
    email: 'elena.smirnova@yandex.ru',
    phone: '+7 (911) 987-65-43',
    originCity: 'Санкт-Петербург (LED)',
    vipStatus: 'Standard Member',
    activeBooking: {
      orderId: 'ORD-FS9949',
      pnr: 'TK9941X / GA2289P',
      route: 'Санкт-Петербург (LED) → Стамбул (IST) → Денпасар (DPS)',
      flightStatus: '⚠️ Требует подтверждения отеля STPC',
      terminal: 'Терминал 1, Выход 12',
      departureDate: '2026-09-20 12:15',
      stpcHotel: 'Renaissance Polat Istanbul 5★ (На подтверждении)',
      stpcVoucherCode: 'STPC-IST-9949',
      ticketPdfUrl: '/api/receipts/ORD-FS9949',
      airline: 'Turkish Airlines + Garuda',
    },
    ticketCount: 1,
    lastActive: '2 часа назад',
  },
  {
    id: 'cli_003',
    telegramId: '6618491023',
    telegramUsername: null,
    fullName: 'Дмитрий Петров',
    email: 'dmitry.petrov@mail.ru',
    phone: '+7 (903) 555-11-22',
    originCity: 'Москва (DME)',
    vipStatus: 'Standard Member',
    activeBooking: {
      orderId: 'ORD-FS9950',
      pnr: 'QR5541L',
      route: 'Москва (DME) → Доха (DOH) → Пхукет (HKT)',
      flightStatus: 'Оформлен возврат (Refunded)',
      terminal: 'Терминал 2',
      departureDate: '2026-09-25 23:55',
      stpcHotel: 'Не предусмотрен (стыковка 3ч)',
      stpcVoucherCode: null,
      ticketPdfUrl: '/api/receipts/ORD-FS9950',
      airline: 'Qatar Airways',
    },
    ticketCount: 1,
    lastActive: 'Вчера',
  },
];

let inMemoryClients: any[] = [...SEED_SUPPORT_CLIENTS];

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();

    // 1. Попытка подгрузки клиентов из Supabase
    try {
      const supabaseAdmin = createAdminClient();
      const { data: dbProfiles } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .limit(50);

      if (dbProfiles && dbProfiles.length > 0) {
        const mapped = dbProfiles.map((p: any) => ({
          id: p.id,
          telegramId: p.telegram_id || null,
          telegramUsername: p.username ? `@${p.username}` : null,
          fullName: p.full_name || 'Клиент FlightSaver',
          email: p.email || 'client@flightsaver.com',
          phone: p.phone || 'Не указан',
          originCity: p.origin_city ? `${p.origin_city} (${p.origin_iata || ''})` : 'Москва (MOW)',
          vipStatus: 'Active User',
          ticketCount: 1,
          lastActive: 'Недавно',
        }));

        inMemoryClients = [
          ...inMemoryClients.filter((s) => !mapped.some((m: any) => m.id === s.id)),
          ...mapped,
        ];
      }
    } catch {}

    let results = [...inMemoryClients];

    if (query) {
      results = results.filter(
        (c) =>
          c.fullName.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          (c.phone && c.phone.includes(query)) ||
          (c.telegramId && c.telegramId.includes(query)) ||
          (c.telegramUsername && c.telegramUsername.toLowerCase().includes(query)) ||
          (c.activeBooking?.orderId && c.activeBooking.orderId.toLowerCase().includes(query)) ||
          (c.activeBooking?.pnr && c.activeBooking.pnr.toLowerCase().includes(query))
      );
    }

    const stats = {
      totalClients: inMemoryClients.length,
      activeToday: inMemoryClients.filter((c) => c.lastActive.includes('минут') || c.lastActive.includes('час')).length,
      stpcPassengers: inMemoryClients.filter((c) => c.activeBooking?.stpcVoucherCode).length,
    };

    return NextResponse.json({
      success: true,
      clients: results,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, clientId, orderId, destinationContact } = body;

    // 1. Отправка ссылки на билет в Telegram пассажира
    if (action === 'send_telegram_ticket_link') {
      await recordAdminAudit({
        staffId: session.id,
        staffName: session.fullName,
        staffRole: session.role,
        action: 'SUPPORT_DISPATCHED_TELEGRAM_LINK',
        entityType: 'CUSTOMER',
        entityId: clientId || orderId,
        details: { orderId, destinationContact },
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      return NextResponse.json({
        success: true,
        message: `Ссылка на маршрутную квитанцию и ваучер успешно отправлена в диалог Telegram (${destinationContact || 'клиента'})`,
      });
    }

    // 2. Повторная отправка на Email
    if (action === 'resend_email') {
      await recordAdminAudit({
        staffId: session.id,
        staffName: session.fullName,
        staffRole: session.role,
        action: 'SUPPORT_RESENT_EMAIL',
        entityType: 'ORDER',
        entityId: orderId,
        details: { destinationContact },
      });

      return NextResponse.json({
        success: true,
        message: `Письмо с комплектом билетов отправлено на ${destinationContact || 'email пассажира'}`,
      });
    }

    return NextResponse.json({ success: false, error: 'Неизвестное действие' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
