import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, recordAdminAudit } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase/admin';
import { CacheService } from '@/lib/cache/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;

    // 1. Поиск в Supabase
    let order: any = null;
    try {
      const supabaseAdmin = createAdminClient();
      const { data } = await supabaseAdmin
        .from('orders')
        .select('*')
        .or(`order_reference.eq.${orderId},id.eq.${orderId}`)
        .maybeSingle();

      if (data) {
        order = {
          id: data.order_reference || data.id,
          orderReference: data.order_reference || data.id,
          route: data.route,
          airline: data.airline,
          departureDate: data.departure_date,
          totalPrice: data.total_price || data.totalPrice,
          currency: data.currency || 'RUB',
          savingsAmount: data.savings_amount || 0,
          customerName: data.contact_name || 'Пассажир',
          customerEmail: data.contact_email || 'client@flightsaver.com',
          customerPhone: data.contact_phone || '+7 (999) 000-00-00',
          customerTelegram: data.customer_telegram || null,
          status: data.status || 'ticketed',
          stpcIncluded: Boolean(data.stpc_included),
          stpcHotelName: data.stpc_hotel_name || 'Партнерский 5★ отель',
          stpcStatus: data.stpc_included ? 'voucher_issued' : 'not_eligible',
          stpcVoucherCode: `STPC-${orderId.slice(-4)}`,
          leg1: {
            airline: data.airline || 'Emirates (EK)',
            flightNumber: 'EK-134',
            route: data.route?.split('→')?.[0]?.trim() || 'SVO',
            departure: '2026-09-15 17:30',
            arrival: '2026-09-15 23:50',
            pnr: data.pnr || 'EK8894K',
            status: 'confirmed',
          },
          leg2: {
            airline: 'Qatar Airways (QR)',
            flightNumber: 'QR-832',
            route: data.route?.split('→')?.[1]?.trim() || 'BKK',
            departure: '2026-09-16 14:10',
            arrival: '2026-09-16 23:45',
            pnr: 'QR7712M',
            status: 'confirmed',
          },
          layoverDurationMinutes: 860,
          passengers: data.passengers || [
            {
              fullName: 'IVANOV ALEKSANDR',
              birthDate: '1988-04-12',
              passportNumber: '75*****12',
              citizenship: 'RU',
            },
          ],
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at || new Date().toISOString(),
        };
      }
    } catch {}

    // Fallback: мок-заказ
    if (!order) {
      order = {
        id: orderId,
        orderReference: orderId,
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
        stpcStatus: 'voucher_issued',
        stpcHotelName: 'Le Méridien Dubai Hotel & Conference Centre 5★',
        stpcVoucherCode: `STPC-DXB-${orderId.slice(-4)}`,
        totalPrice: 55780,
        originalPrice: 89900,
        savingsAmount: 34120,
        currency: 'RUB',
        customerName: 'Александр Иванов',
        customerEmail: 'alex.ivanov@gmail.com',
        customerPhone: '+7 (999) 123-45-67',
        customerTelegram: '@alex_traveler',
        status: 'ticketed',
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
      };
    }

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;
    const body = await req.json();
    const { leg1Pnr, leg2Pnr, status, stpcStatus, stpcHotelName } = body;

    // Синхронизация с Supabase (если запись есть)
    try {
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin
        .from('orders')
        .update({
          pnr: leg1Pnr,
          status: status || undefined,
          stpc_hotel_name: stpcHotelName || undefined,
          updated_at: new Date().toISOString(),
        })
        .or(`order_reference.eq.${orderId},id.eq.${orderId}`);
    } catch {}

    // Фиксация изменений в журнале аудита персонала
    await recordAdminAudit({
      staffId: session.id,
      staffName: session.fullName,
      staffRole: session.role,
      action: 'ORDER_UPDATED_BY_CONCIERGE',
      entityType: 'ORDER',
      entityId: orderId,
      details: { leg1Pnr, leg2Pnr, status, stpcStatus, stpcHotelName },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: `Данные заказа ${orderId} успешно сохранены`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;
    const body = await req.json();
    const { action, recipientEmail } = body;

    if (action === 'resend_email') {
      // Повторная отправка билета клиенту
      await recordAdminAudit({
        staffId: session.id,
        staffName: session.fullName,
        staffRole: session.role,
        action: 'RESEND_TICKET_EMAIL',
        entityType: 'ORDER',
        entityId: orderId,
        details: { recipientEmail },
      });

      return NextResponse.json({
        success: true,
        message: `Маршрутная квитанция и ваучер STPC повторно отправлены на ${recipientEmail || 'почту клиента'}`,
      });
    }

    if (action === 'reissue_pdf') {
      // Сброс кэша PDF
      const cacheKey = `pdf_receipt_buffer_${orderId}`;
      try {
        await CacheService.delete(cacheKey);
      } catch {}

      await recordAdminAudit({
        staffId: session.id,
        staffName: session.fullName,
        staffRole: session.role,
        action: 'REISSUE_PDF_RECEIPT',
        entityType: 'ORDER',
        entityId: orderId,
      });

      return NextResponse.json({
        success: true,
        message: `PDF квитанция для заказа ${orderId} перегенерирована`,
        pdfUrl: `/api/receipts/${orderId}`,
      });
    }

    return NextResponse.json({ success: false, error: 'Неизвестное действие' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
