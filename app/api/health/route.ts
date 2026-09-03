import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const startTime = Date.now();

export async function GET() {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  return NextResponse.json(
    {
      status: 'ok',
      timestamp: Date.now(),
      isoTime: new Date().toISOString(),
      version: '1.5.0',
      uptime: uptimeSeconds,
      service: 'FlightSaver Core API',
      environment: process.env.NODE_ENV || 'production',
      checks: {
        api: 'healthy',
        database: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        redisCache: Boolean(process.env.UPSTASH_REDIS_REST_URL),
        aiEngine: Boolean(process.env.GEMINI_API_KEY),
        payments: Boolean(process.env.STRIPE_SECRET_KEY),
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json',
      },
    }
  );
}
