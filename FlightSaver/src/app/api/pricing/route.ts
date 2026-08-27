import { NextRequest, NextResponse } from 'next/server';
import { SplitTicketingEngine } from '@/services/splitTicketing';
import { PricingCalculationRequest } from '@/types/pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<PricingCalculationRequest>;

    // Валидация входных данных
    if (!body.splitLegs || !Array.isArray(body.splitLegs) || body.splitLegs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: splitLegs array is required' },
        { status: 400 }
      );
    }

    const payload: PricingCalculationRequest = {
      userTier: body.userTier || 'standard',
      targetCurrency: body.targetCurrency || 'RUB',
      standardItinerary: body.standardItinerary,
      splitLegs: body.splitLegs,
      stpcBenefit: body.stpcBenefit,
    };

    // Выполнение расчета экономики и проверка рисков
    const result = SplitTicketingEngine.calculateEconomics(payload);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[FlightSaver Pricing Engine Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal pricing engine error',
      },
      { status: 500 }
    );
  }
}
