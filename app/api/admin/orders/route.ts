import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, UserRole } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Мок-реестр заказов для операторов (богатый seed для демонстрации реальных сценариев Split-Ticketing и STPC)
const SEED_ORDERS = [
  {
    id: 'ORD-FS9948',
    orderReference: 'ORD-FS9948',
    route: 'Москва (SVO) → Дубай (DXB) → Бангкок (BKK)',
    originIata: 'SVO',
    hubIata: 'DXB',
    destinationIata: 'BKK',
    isSplitTicket: true,
    leg1: {
      airline: 'Emirates (EK)',
      flightNumber: 'EK-134',
      route: 'SVO → DXB',
      departure: '2026-09-15 17:30',
      arrival: '2026-09-15 23:50',
      pnr: 'EK8894K',
      status: 'confirmed',
    },
    leg2: {
      airline: 'Qatar Airways (QR)',
      flightNumber: 'QR-832',
      route: 'DXB → BKK',
      departure: '2026-09-16 14:10',
      arrival: '2026-09-16 23:45',
      pnr: 'QR7712M',
      status: 'confirmed',
    },
    layoverDurationMinutes: 860, // 14ч 20м
    stpcIncluded: true,
    stpcStatus: 'voucher_issued', // 'eligible' | 'voucher_issued' | 'not_eligible'
    stpcHotelName: 'Le Méridien Dubai Hotel & Conference Centre 5★',
    stpcVoucherCode: 'STPC-DXB-9948',
    totalPrice: 55780,
    originalPrice: 89900,
    savingsAmount: 34120,
    currency: 'RUB',
    customerName: 'Александр Иванов',
    customerEmail: 'alex.ivanov@gmail.com',
    customerPhone: '+7 (999) 123-45-67',
    customerTelegram: '@alex_traveler',
    status: 'ticketed', // 'paid' | 'ticketed' | 'incident' | 'refunded'
    passengers: [
      {
        fullName: 'IVANOV ALEKSANDR',
        birthDate: '1988-04-12',
        passportNumber: '75*****12',
        citizenship: 'RU',
      },
    ],
    createdAt: '2026-09-02T14:20:00Z',
    updatedAt: '2026-09-02T14:22:00Z',
  },
  {
    id: 'ORD-FS9949',
    orderReference: 'ORD-FS9949',
    route: 'Санкт-Петербург (LED) → Стамбул (IST) → Денпасар (DPS)',
    originIata: 'LED',
    hubIata: 'IST',
    destinationIata: 'DPS',
    isSplitTicket: true,
    leg1: {
      airline: 'Turkish Airlines (TK)',
      flightNumber: 'TK-402',
      route: 'LED → IST',
      departure: '2026-09-20 12:15',
      arrival: '2026-09-20 16:40',
      pnr: 'TK9941X',
      status: 'confirmed',
    },
    leg2: {
      airline: 'Garuda Indonesia (GA)',
      flightNumber: 'GA-881',
      route: 'IST → DPS',
      departure: '2026-09-21 04:30',
      arrival: '2026-09-21 19:20',
      pnr: 'GA2289P',
      status: 'confirmed',
    },
    layoverDurationMinutes: 710, // 11ч 50м
    stpcIncluded: true,
    stpcStatus: 'eligible', // Требует ручного назначения отеля
    stpcHotelName: 'Renaissance Polat Istanbul Hotel 5★',
    stpcVoucherCode: 'STPC-IST-9949',
    totalPrice: 84200,
    originalPrice: 132000,
    savingsAmount: 47800,
    currency: 'RUB',
    customerName: 'Елена Смирнова',
    customerEmail: 'elena.smirnova@yandex.ru',
    customerPhone: '+7 (911) 987-65-43',
    customerTelegram: '@elena_spb',
    status: 'incident', // Требует внимания оператора
    passengers: [
      {
        fullName: 'SMIRNOVA ELENA',
        birthDate: '1992-08-23',
        passportNumber: '40*****89',
        citizenship: 'RU',
      },
    ],
    createdAt: '2026-09-02T16:00:00Z',
    updatedAt: '2026-09-02T16:05:00Z',
  },
  {
    id: 'ORD-FS9950',
    orderReference: 'ORD-FS9950',
    route: 'Москва (DME) → Доха (DOH) → Пхукет (HKT)',
    originIata: 'DME',
    hubIata: 'DOH',
    destinationIata: 'HKT',
    isSplitTicket: false,
    leg1: {
      airline: 'Qatar Airways (QR)',
      flightNumber: 'QR-338',
      route: 'DME → DOH',
      departure: '2026-09-25 23:55',
      arrival: '2026-09-26 05:05',
      pnr: 'QR5541L',
      status: 'confirmed',
    },
    layoverDurationMinutes: 180, // 3ч пересадка
    stpcIncluded: false,
    stpcStatus: 'not_eligible',
    totalPrice: 42150,
    originalPrice: 42150,
    savingsAmount: 0,
    currency: 'RUB',
    customerName: 'Дмитрий Петров',
    customerEmail: 'dmitry.petrov@mail.ru',
    customerPhone: '+7 (903) 555-11-22',
    customerTelegram: null,
    status: 'paid', // Оплачен, готов к выписке
    passengers: [
      {
        fullName: 'PETROV DMITRII',
        birthDate: '1985-11-04',
        passportNumber: '50*****33',
        citizenship: 'RU',
      },
    ],
    createdAt: '2026-09-01T11:30:00Z',
    updatedAt: '2026-09-01T11:40:00Z',
  },
];

let inMemoryOrders: any[] = [...SEED_ORDERS];

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const query = (searchParams.get('q') || '').trim().toLowerCase();

    // 1. Попытка загрузки реальных заказов из Supabase
    try {
      const supabaseAdmin = createAdminClient();
      const { data: dbOrders } = await supabaseAdmin
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbOrders && dbOrders.length > 0) {
        // Обогащаем и объединяем
        const formatted = dbOrders.map((d: any) => ({
          id: d.order_reference || d.id,
          orderReference: d.order_reference || d.id,
          route: d.route || 'Маршрут',
          totalPrice: d.total_price || d.totalPrice || 0,
          currency: d.currency || 'RUB',
          savingsAmount: d.savings_amount || d.savingsAmount || 0,
          customerName: d.contact_name || d.customerName || 'Пассажир',
          customerEmail: d.contact_email || d.customerEmail || 'client@flightsaver.com',
          customerPhone: d.contact_phone || d.customerPhone || '+79990000000',
          customerTelegram: d.customer_telegram || null,
          status: d.status || 'ticketed',
          stpcIncluded: Boolean(d.stpc_included),
          stpcHotelName: d.stpc_hotel_name || null,
          stpcStatus: d.stpc_included ? 'voucher_issued' : 'not_eligible',
          leg1: {
            airline: d.airline || 'Aviation Carrier',
            flightNumber: 'FL-101',
            route: d.route,
            pnr: d.pnr || 'FS8894',
            status: 'confirmed',
          },
          createdAt: d.created_at || new Date().toISOString(),
        }));

        // Слияние без дублей
        inMemoryOrders = [
          ...inMemoryOrders.filter((s) => !formatted.some((f: any) => f.id === s.id)),
          ...formatted,
        ];
      }
    } catch {}

    // Фильтрация
    let result = [...inMemoryOrders];

    if (status !== 'all') {
      result = result.filter((o) => o.status === status);
    }

    if (query) {
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(query) ||
          o.route.toLowerCase().includes(query) ||
          o.customerName.toLowerCase().includes(query) ||
          o.customerEmail.toLowerCase().includes(query) ||
          (o.customerPhone && o.customerPhone.includes(query)) ||
          (o.leg1?.pnr && o.leg1.pnr.toLowerCase().includes(query)) ||
          (o.leg2?.pnr && o.leg2.pnr.toLowerCase().includes(query))
      );
    }

    const counts = {
      all: inMemoryOrders.length,
      paid: inMemoryOrders.filter((o) => o.status === 'paid').length,
      ticketed: inMemoryOrders.filter((o) => o.status === 'ticketed').length,
      incident: inMemoryOrders.filter((o) => o.status === 'incident').length,
      refunded: inMemoryOrders.filter((o) => o.status === 'refunded').length,
    };

    return NextResponse.json({
      success: true,
      orders: result,
      counts,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
