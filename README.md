# Ticker-Tracker 📈

A modern, lightning-fast stock and valuation multiples tracker built with Next.js (App Router), Tailwind CSS, Lucide icons, Yahoo Finance integration, IndexedDB local caching, PWA capabilities, and Cloudflare Workers KV support.

## Key Features

- **Real-Time & 15-min Delayed Market Quotes**: Powered by Yahoo Finance (`yahoo-finance2`), covering US stocks, European equities (e.g. `MC.PA`, `AIR.PA`), and ETFs (e.g. `CW8.PA`).
- **Valuation Multiples**: Instantly highlights **Current P/E** (`trailingPE`) and **Forward P/E** (`forwardPE`) for every ticker.
- **Custom Tracking Value & % Diff**: Set your cost basis or target buy price. Ticker-Tracker computes and highlights the percentage variance (`% Diff`) in real time.
- **Zero-Latency Mobile & Desktop Startup (IndexedDB)**: Saved tickers and quotes are stored locally in IndexedDB, rendering your dashboard instantly upon opening your phone, with background stale-while-revalidate reloads.
- **Progressive Web App (PWA)**: Installable on iOS, Android, and Desktop with offline caching via Service Worker.
- **Interactive Financial Stats & Charts**: Detailed modal with historical price trends, 52-week ranges, dividend yields, EPS, market capitalization, and beta.
- **Ticker Reordering**: Organize your watchlist with intuitive drag-and-drop / reordering controls.
- **Cloudflare Workers Ready**: Compatible with Cloudflare Workers / OpenNext with KV storage bindings (`TICKER_TRACKER_KV`) and local development fallback.
- **Authentication**: Email/password credentials and Google OAuth sign-in.

---

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 3. Build & Deploy

For local production test:
```bash
npm run build
npm start
```

For Cloudflare Workers deployment:
```bash
npm run deploy
```

---

## Architecture & KV Caching

Yahoo Finance's unofficial endpoints are prone to IP rate limits and crumb expiration. To provide reliable performance and stay within free tier limits, Ticker-Tracker uses a multi-tier fallback architecture:

1. **Cloudflare KV / Local Store Cache**:
   - Live Quotes: cached for 90 seconds.
   - Autocomplete & Search: cached for 1 hour.
   - Historical Chart & Stats: cached for 10 minutes.
2. **Multi-Tier Fetching Engine**:
   - **Tier 1**: `yf.quote()` for real-time market metrics.
   - **Tier 2**: `yf.quoteSummary()` for fundamental valuation modules (`summaryDetail`, `defaultKeyStatistics`, `price`).
   - **Tier 3**: Direct Yahoo Finance Chart API (`query1.finance.yahoo.com/v8/finance/chart`) with browser headers (no crumb required).
   - **Tier 4**: Graceful stale-cache recovery if network requests are degraded.

## API Endpoints

### Market & Tickers
- `GET /api/tickers/search?q={query}`: Search and autocomplete tickers across global exchanges.
- `GET /api/tickers/quote?symbols={AAPL,MC.PA,...}`: Fetch single or batch quotes with valuation multiples.
- `GET /api/tickers/details?symbol={symbol}&range={1mo}`: Retrieve historical chart time series and detailed statistics.

### Watchlist Management
- `GET /api/tickers`: Retrieve authenticated user's tickers enriched with quotes.
- `POST /api/tickers`: Add a ticker with tracking value baseline and optional notes.
- `PATCH /api/tickers`: Update tracking value or notes for a ticker.
- `DELETE /api/tickers?id={id}`: Remove a ticker and auto-compact order indices.
- `POST /api/tickers/reorder`: Persist custom ordering sequence of tickers.

### Authentication & Sessions
- `POST /api/auth/register`: Create user account with PBKDF2 password encryption.
- `POST /api/auth/login`: Authenticate email/password credentials and set HTTP-only signed session cookie.
- `POST /api/auth/logout`: Invalidate session cookie.
- `GET /api/auth/me`: Verify session and retrieve current user profile.
- `GET /api/auth/google`: Trigger Google OAuth2 consent flow.
- `GET /api/auth/callback/google`: Handle OAuth redirect, profile sync, and session issuing.

## Running Tests

```bash
npm test
```