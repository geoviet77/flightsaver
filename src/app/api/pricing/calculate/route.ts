import { NextResponse } from 'next/server';
import { SplitTicketLegInput, PricingCalculateRequestSchema, PricingOptions } from '@/types/pricing';
import { PricingService } from '@/services/pricingService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();

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

    const pricingOptions: PricingOptions = {
      isClubMember: Boolean(options?.isClubMember),
      targetCurrency: options?.targetCurrency || 'RUB',
    };

    const result = await PricingService.calculateSplitEconomy(
      directBenchmarkPrice,
      directBenchmarkCurrency,
      splitLegs as unknown as SplitTicketLegInput[],
      pricingOptions
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
