import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { kvGet, kvPut } from '@/lib/kv';
import { getQuote, getBatchQuotes } from '@/lib/yahooFinance';
import { UserTicker } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * GET /api/tickers - Retrieve authenticated user's tickers with live quotes
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tickersKey = `user:tickers:${user.id}`;
    let tickers = (await kvGet<UserTicker[]>(tickersKey)) || [];

    // Sort by order ascending
    tickers.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (tickers.length === 0) {
      return NextResponse.json({ tickers: [] });
    }

    // Enrich with quotes
    const symbols = tickers.map((t) => t.symbol);
    const quotes = await getBatchQuotes(symbols);

    const enrichedTickers = tickers.map((t) => ({
      ...t,
      quote: quotes[t.symbol.toUpperCase()] || t.quote || null,
    }));

    return NextResponse.json({ tickers: enrichedTickers });
  } catch (err) {
    console.error('Error fetching user tickers:', err);
    return NextResponse.json({ error: 'Failed to fetch tickers' }, { status: 500 });
  }
}

/**
 * POST /api/tickers - Add a new ticker to user's watchlist
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { symbol, name, trackingValue, notes } = await request.json();

    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const cleanSymbol = symbol.trim().toUpperCase();
    let parsedTrackingValue: number | null = null;
    if (trackingValue !== undefined && trackingValue !== null && trackingValue !== '') {
      const val = Number(trackingValue);
      if (!isNaN(val) && val > 0) {
        parsedTrackingValue = Number(val.toFixed(4));
      }
    }

    // Verify ticker exists via quote
    const quote = await getQuote(cleanSymbol);
    if (!quote) {
      return NextResponse.json({ error: `Could not find ticker symbol "${cleanSymbol}"` }, { status: 404 });
    }

    const tickersKey = `user:tickers:${user.id}`;
    const tickers = (await kvGet<UserTicker[]>(tickersKey)) || [];

    // Check if symbol already in watchlist
    const existingIndex = tickers.findIndex((t) => t.symbol.toUpperCase() === cleanSymbol);
    if (existingIndex !== -1) {
      return NextResponse.json({ error: `Ticker ${cleanSymbol} is already in your watchlist` }, { status: 409 });
    }

    const newTicker: UserTicker = {
      id: 'tck_' + crypto.randomUUID().replace(/-/g, ''),
      symbol: cleanSymbol,
      name: name || quote.name || cleanSymbol,
      trackingValue: parsedTrackingValue !== null ? Number(parsedTrackingValue.toFixed(4)) : null,
      notes: typeof notes === 'string' ? notes.trim() : '',
      order: tickers.length,
      createdAt: Date.now(),
      quote,
    };

    tickers.push(newTicker);
    await kvPut(tickersKey, tickers);

    return NextResponse.json({ ticker: newTicker }, { status: 201 });
  } catch (err) {
    console.error('Error adding ticker:', err);
    return NextResponse.json({ error: 'Failed to add ticker' }, { status: 500 });
  }
}

/**
 * PATCH /api/tickers - Update tracking value or notes for a ticker
 */
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, trackingValue, notes } = await request.json();

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Ticker ID is required' }, { status: 400 });
    }

    const tickersKey = `user:tickers:${user.id}`;
    const tickers = (await kvGet<UserTicker[]>(tickersKey)) || [];
    const tickerIndex = tickers.findIndex((t) => t.id === id);

    if (tickerIndex === -1) {
      return NextResponse.json({ error: 'Ticker not found' }, { status: 404 });
    }

    if (trackingValue !== undefined) {
      if (trackingValue === null || trackingValue === '') {
        tickers[tickerIndex].trackingValue = null;
      } else {
        const parsed = Number(trackingValue);
        if (!isNaN(parsed) && parsed > 0) {
          tickers[tickerIndex].trackingValue = Number(parsed.toFixed(4));
        }
      }
    }

    if (notes !== undefined && typeof notes === 'string') {
      tickers[tickerIndex].notes = notes.trim();
    }

    await kvPut(tickersKey, tickers);

    return NextResponse.json({ ticker: tickers[tickerIndex] });
  } catch (err) {
    console.error('Error updating ticker:', err);
    return NextResponse.json({ error: 'Failed to update ticker' }, { status: 500 });
  }
}

/**
 * DELETE /api/tickers - Remove a ticker from watchlist
 */
export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Ticker ID is required' }, { status: 400 });
    }

    const tickersKey = `user:tickers:${user.id}`;
    let tickers = (await kvGet<UserTicker[]>(tickersKey)) || [];

    const initialLength = tickers.length;
    tickers = tickers.filter((t) => t.id !== id);

    if (tickers.length === initialLength) {
      return NextResponse.json({ error: 'Ticker not found' }, { status: 404 });
    }

    // Re-index orders
    tickers.forEach((t, idx) => {
      t.order = idx;
    });

    await kvPut(tickersKey, tickers);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting ticker:', err);
    return NextResponse.json({ error: 'Failed to delete ticker' }, { status: 500 });
  }
}
