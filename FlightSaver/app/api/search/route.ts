import { NextRequest, NextResponse } from 'next/server';
import { parseTravelQuery } from '@/lib/nlpParser';
import { generateMockFlights } from '@/lib/mockFlights';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const query = typeof body.query === 'string' ? body.query : '';

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Query string is required' },
        { status: 400 }
      );
    }

    const parsed = parseTravelQuery(query);
    const flights = generateMockFlights(parsed);
    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      parsed,
      flights,
      totalFound: flights.length,
      executionTimeMs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process natural language flight search' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('q') || '';

  if (!query.trim()) {
    return NextResponse.json(
      { error: 'Query parameter ?q= is required' },
      { status: 400 }
    );
  }

  const parsed = parseTravelQuery(query);
  const flights = generateMockFlights(parsed);
  const executionTimeMs = Date.now() - startTime;

  return NextResponse.json({
    parsed,
    flights,
    totalFound: flights.length,
    executionTimeMs,
  });
}
