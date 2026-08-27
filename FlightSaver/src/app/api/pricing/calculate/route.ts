import { NextResponse } from 'next/server';
import { PricingCalculateRequestSchema } from '@/types/pricing';
import { PricingService } from '@/services/pricingService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();

    // Валидация входного полезного объема через Zod
    const validationResult = PricingCalculateRequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      directBenchmarkPrice,
      directBenchmarkCurrency,
      splitLegs,
      options,
    } = validationResult.data;

    const result = await PricingService.calculateSplitEconomy(
      directBenchmarkPrice,
      directBenchmarkCurrency,
      splitLegs,
      options
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[API /api/pricing/calculate] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error while calculating pricing' },
      { status: 500 }
    );
  }
}
