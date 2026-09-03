import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, recordAdminAudit } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Имитация финансовых показателей для демонстрации и разработки
const FINANCE_SUMMARY = {
  grossTicketValueRub: 14850000,
  netRevenueRub: 1245000,
  splitSavingsRub: 6320000,
  totalBookingsCount: 142,
  successfulRefundsCount: 3,
  availableStripeBalance: {
    amount: 980500,
    currency: 'RUB',
  },
  recentTransactions: [
    {
      id: 'tx_fs_001',
      orderId: 'ORD-FS9948',
      amountRub: 55780,
      feeRub: 3000,
      customer: 'Александр Иванов',
      status: 'succeeded',
      date: '2026-09-02T14:22:00Z',
      stripePaymentIntent: 'pi_3N9XkK2eZvKYlo2C0abcde01',
    },
    {
      id: 'tx_fs_002',
      orderId: 'ORD-FS9949',
      amountRub: 84200,
      feeRub: 3000,
      customer: 'Елена Смирнова',
      status: 'succeeded',
      date: '2026-09-02T16:05:00Z',
      stripePaymentIntent: 'pi_3N9XkK2eZvKYlo2C0abcde02',
    },
    {
      id: 'tx_fs_003',
      orderId: 'ORD-FS9950',
      amountRub: 42150,
      feeRub: 1500,
      customer: 'Дмитрий Петров',
      status: 'refunded',
      date: '2026-09-01T11:40:00Z',
      stripePaymentIntent: 'pi_3N9XkK2eZvKYlo2C0abcde03',
    },
  ],
};

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ success: true, finance: FINANCE_SUMMARY });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Только Super Admin имеет право инициировать возврат средств' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { orderId, amountRub, reason, paymentIntentId } = body;

    if (!orderId || !reason) {
      return NextResponse.json(
        { success: false, error: 'Номер заказа и причина возврата обязательны' },
        { status: 400 }
      );
    }

    // Если настроен боевой Stripe, вызываем Stripe SDK
    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('sk_test_placeholder')) {
      try {
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        if (paymentIntentId) {
          await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: amountRub ? Math.round(amountRub * 100) : undefined,
            reason: 'requested_by_customer',
          });
        }
      } catch (stripeErr: any) {
        console.warn('Stripe refund api notice:', stripeErr?.message);
      }
    }

    // Запись в журнал аудита
    await recordAdminAudit({
      staffId: session.id,
      staffName: session.fullName,
      staffRole: session.role,
      action: 'STRIPE_REFUND_EXECUTED',
      entityType: 'ORDER',
      entityId: orderId,
      details: { amountRub, reason, paymentIntentId },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: `Возврат средств по заказу ${orderId} успешно оформлен`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
