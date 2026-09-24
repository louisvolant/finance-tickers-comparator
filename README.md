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