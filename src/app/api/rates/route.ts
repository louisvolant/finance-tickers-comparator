import { NextResponse } from 'next/server';
import { getExchangeRates } from '@/lib/exchangeRates';

export const runtime = 'nodejs';

/**
 * GET /api/rates - EUR-based exchange rates, cached server-side (KV).
 */
export async function GET() {
  try {
    const data = await getExchangeRates();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    console.error('Error in /api/rates:', err);
    return NextResponse.json({ error: 'Failed to fetch exchange rates' }, { status: 502 });
  }
}
