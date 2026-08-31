import { NextRequest, NextResponse } from 'next/server';
import { PdfReceiptService, ReceiptData } from '@/services/pdfReceiptService';
import { createAdminClient } from '@/lib/supabase/admin';
import { CacheService } from '@/lib/cache/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    const cacheKey = `pdf_receipt_buffer_${orderId}`;

    // L2 Cache: получение готового PDF буфера (Base64)
    const { data: pdfBase64, fromCache } = await CacheService.getOrSet(
      cacheKey,
      async () => {
        const supabase = createAdminClient();

        // 1. Поиск заказа в базе Supabase
        let order: any = null;
        try {
          const { data } = await supabase
            .from('orders')
            .select('*')
            .or(`order_reference.eq.${orderId},id.eq.${orderId}`)
            .single();
          order = data;
        } catch {
          // Fallback
        }

        // 2. Формирование структуры данных для PDF
        const receiptData: ReceiptData = {
          orderId: order?.order_reference || orderId,
          pnr: order?.pnr || order?.e_ticket_number || 'FS789K',
          eTicketNumber: order?.e_ticket_number || `235-${orderId.slice(-6)}`,
          airline: order?.airline || 'Turkish Airlines',
          route: order?.route || 'Москва → Бангкок',
          originCity: order?.route?.split('→')?.[0]?.trim() || 'Москва',
          destinationCity: order?.route?.split('→')?.[1]?.trim() || 'Бангкок',
          departureDate: order?.departure_date || '2026-09-15',
          passengers: order?.passengers || [
            { firstName: 'IVAN', lastName: 'IVANOV', passportNumber: '75 1234567' },
          ],
          totalPrice: Number(order?.total_price || 42800),
          currency: order?.currency || 'RUB',
          serviceType: order?.service_type || 'assistant',
          serviceFee: Number(order?.service_fee || 1500),
          fxBuffer: Number(order?.fx_buffer || 610),
          netFare: Number(order?.net_fare || 40660),
          stpcHotelIncluded: Boolean(order?.stpc_hotel_included),
          stpcHotelName: order?.stpc_hotel_name || 'Партнерский 4★ / 5★ отель авиакомпании',
          contactEmail: order?.contact_email || 'user@example.com',
          createdAt: order?.created_at || new Date().toISOString(),
        };

        // 3. Генерация PDF буфера
        const buffer = await PdfReceiptService.generateReceiptPdfBuffer(receiptData);
        return Buffer.from(buffer).toString('base64');
      },
      3600 // 1 час TTL
    );

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="FlightSaver_Receipt_${orderId}.pdf"`,
        'X-Cache': fromCache ? 'HIT' : 'MISS',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('[Receipt Download API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка генерации квитанции PDF' },
      { status: 500 }
    );
  }
}

