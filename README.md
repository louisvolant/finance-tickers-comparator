# Ticker-Tracker 📈

A modern, lightning-fast stock and valuation multiples tracker built with Next.js (App Router), Tailwind CSS, Lucide icons, Yahoo Finance integration, IndexedDB local caching, PWA capabilities, and Cloudflare Workers KV support.

## Key Features

- **Real-Time & 30s Cached Market Quotes**: Powered by Yahoo Finance (`yahoo-finance2`), covering US stocks, European equities (e.g. `MC.PA`, `AIR.PA`), and index futures (e.g. `NQ=F`, `ES=F`) with an optimized 30-second KV server cache for rapid sync.
- **Valuation Multiples with Color Tiers**: Instantly displays **Current P/E** (`trailingPE`) and **Forward P/E** (`forwardPE`) on both mobile cards and desktop tables. Forward P/E is dynamically colored by valuation tier:
  - Deep value (< 15x): emerald green
  - Moderate value (15x - 20x): teal
  - **Sweet Spot (20x - 30x)**: prominent cyan highlight
  - Elevated (30x - 40x): warm amber
  - High (40x - 60x): orange
  - Stretched (> 60x): deep red / rose
- **Ultra-Compact Mobile Cards & Clear Hierarchy**:
  - **Line 1 (Top)**: Company/asset **label displayed in bold**, immediately followed by the ticker **symbol in regular font** (e.g. **Apple Inc.** `AAPL`).
  - **Line 2 (Bottom)**: Exchange badge (e.g. `PAR`, `NMS`, `Stock`) followed by **Current P/E** (`PE 32.4x`) and **Forward P/E** (`Fwd 28.1x`).
  - **Right side**: Current price and daily change (% evolution) with extended session indicators (`🌅` / `🌙`).
  - **Details Modal**: Personal cost basis / target price is streamlined away from collapsed cards into the opened details modal right next to the "Equity" pill.
- **Pre-Market, After-Hours & Sunday Futures Indicator**: Displays real-time extended session percentage indicators directly beside daily change (e.g. `▼ -0.41% (🌅 +0.03%)` or `(🌙 -0.12%)`). Essential for monitoring after-hours earnings reports, early morning pre-market trading, and Sunday evening futures pre-trends before Monday market open. Drops below **-0.20%** are highlighted in deep red / rose.
- **Reliable Reorganization Mode (Flèches Haut / Bas)**: Select "Reorganize" (`Réorganisation`) from the display dropdown to enter ordering mode:
  - The right-hand price block on each mobile card is dynamically replaced with intuitive **Up / Down arrow buttons** (`ChevronUp` / `ChevronDown`).
  - Tapping up/down immediately reorders tickers without any touch gesture conflicts between scrolling, tapping, and long-presses.
  - Position changes are saved instantly in local IndexedDB and synchronized to Cloudflare KV for registered accounts.
  - An inline banner provides single-tap confirmation (`OK`) to return to standard pricing view.
- **1-Click Instant Ticker Addition & Bottom Add Button**: Adding tickers from search is immediate with a single click. In addition to the quick search `+` button, an explicit "+ Add Ticker" button is conveniently placed at the bottom of the watchlist right above the privacy notice.
- **100% Private & Zero User Tracking**: No user tracking or behavioral telemetry. The "tracking value" is strictly an optional personal cost basis or target purchase price chosen and entered solely by the user (or left completely empty).
- **Streamlined Watchlist Controls**:
  - **Title Row**: `Ma liste de tickers (X tickers)` on the left with the **Display Mode Selector** docked right.
  - **Action Row**: Search bar and `+` button docked left, and manual **Refresh button** docked right.
- **Comprehensive Forward P/E Educational Guide**: Integrated breakdown detailing how Forward P/E is calculated, Wall Street & European analyst consensus mechanisms, forecast horizons (NTM / next FY), Trailing vs. Forward comparisons, and key analytical limitations.
- **Optional Reference Target & % Diff**: Add or update your cost basis anytime directly from the ticker row, mobile card details, or dedicated modal. Ticker-Tracker automatically highlights the percentage variance (`% Diff`) in real time, or displays clean pricing without any target requirements.
- **Zero-Latency Mobile & Desktop Startup (IndexedDB)**: Saved tickers and quotes are stored locally in IndexedDB, rendering your dashboard instantly upon opening your phone, with background stale-while-revalidate reloads.
- **Progressive Web App (PWA)**: Installable on iOS, Android, and Desktop with offline caching via Service Worker and web app manifest.
- **Multimodal Search (Ticker, Label & ISIN)**: Search stocks by symbol (e.g. `PUST`, `WPEA`), company name / ETF label (e.g. `LVMH`, `AIRBUS`, `SCHNEIDER`), or official ISIN codes (e.g. `FR0011871110`, `FR001400Q9V2`), supplemented by live Yahoo Finance search.
- **Interactive Financial Stats & Charts**: Detailed modal with historical price trends, 52-week ranges, dividend yields, EPS, market capitalization, and beta.
- **Flexible Display & Sorting Modes (Custom, Reorganize, Alphabetical, By Trading Exchange)**: Switch seamlessly with the dropdown button docked right on the title bar:
  - **Custom Order (Liste ordonnée)**: User-defined sequence saved to IndexedDB and Cloudflare KV.
  - **Reorganize (Réorganisation)**: Tactile up/down reorder buttons on each ticker card.
  - **Alphabetical (A → Z)**: Global alphabetical sorting by ticker symbol.
  - **By Trading Market (Par place de cotation)**: Intelligently groups tickers by exchange system (`Euronext Paris`, `NASDAQ`, `NYSE`, `Deutsche Börse XETRA`, `London Stock Exchange`, etc.) with stylish header badges, and sorts tickers alphabetically inside each exchange.
  - Choice is remembered locally across browser sessions.
- **Account Lifecycle & Security**: Registration, login, Google OAuth 2.0 integration, password updates (`/api/auth/changepassword`), and complete account deletion (`/api/auth/delete_my_account`).
- **Multilingual Support (i18n)**: Full localization across 6 languages: English (`en`), French (`fr`), German (`de`), Spanish (`es`), Italian (`it`), and Portuguese (`pt`), with an active language selector.
- **SEO & Legal**: Comprehensive metadata, dynamic `sitemap.xml`, `robots.txt`, Privacy Policy (`/privacy`), Terms of Service (`/terms`), and footer links to [Personal Page](https://www.louisvolant.com) and [Portfolio](https://www.louisvolant.com/portfolio).
- **Cloudflare Workers Ready**: Compatible with Cloudflare Workers / OpenNext with KV storage bindings (`KV`, `ticker_tracker_kv`), `keep_vars = true` preservation, and local development fallback.

---

## Curated Equities & ETFs Catalog

The app includes built-in multimodal search indexing for key French, European, and US equities and UCITS ETFs:

| ISIN | Ticker | Label | Yahoo Symbol |
| :--- | :--- | :--- | :--- |
| `FR0011871110` | PUST | AMUNDI PEA NASDAQ-100 UCITS ETF ACC | `PUST.PA` |
| `IE0002XZSHO1` | WPEA | ISHARES MSCI WORLD SWAP PEA UCITS ETF EUR (ACC) | `WPEA.PA` |
| `FR0011550185` | ESE | BNP PARIBAS EASY S&P 500 UCITS ETF EUR CAPITALISATION | `ESE.PA` |
| `DE000A2QP372` | EXX1 | ISHARES EURO STOXX BANKS 30-15 UCITS ETF (DE) EUR (ACC) | `EXX1.DE` |
| `FR0000121014` | MC | LVMH | `MC.PA` |
| `FR0000120073` | AI | AIR LIQUIDE | `AI.PA` |
| `FR0011869312` | PAASI | AMUNDI PEA ASIE PACIFIQUE UCITS ETF ACC | `PAASI.PA` |
| `NL0000235190` | AIR | AIRBUS | `AIR.PA` |
| `FR0000121972` | SU | SCHNEIDER ELECTRIC | `SU.PA` |
| `FR0010307819` | LR | LEGRAND | `LR.PA` |
| `FR001400Q9V2` | EXENS | EXOSENS | `EXENS.PA` |
| `US0231351067` | AMZN | AMAZON.COM | `AMZN` |
| `US5949181045` | MSFT | MICROSOFT | `MSFT` |
| `US67066G1040` | NVDA | NVIDIA | `NVDA` |
| `US30303M1027` | META | META PLATFORMS | `META` |
| `US02079K3059` | GOOGL | ALPHABET-A | `GOOGL` |
| `IE00B6R52036` | IAUP | ISHARES GOLD PRODUCERS UCITS ETF USD (ACC) | `IAUP.L` |
| `US0494681010` | TEAM | ATLASSIAN RG-A | `TEAM` |
| `US0378331005` | AAPL | APPLE | `AAPL` |
| `IE00B3ZW0K18` | IUSE | ISHARES S&P 500 EUR HEDGED UCITS ETF (ACC) | `IUSE.L` |
| `IE000U9ODG19` | DFND | ISHARES GLOBAL AEROSPACE & DEFENCE UCITS ETF USD ACCU | `DFND.L` |
| `LU1681044480` | AASI | AMUNDI MSCI EM ASIA UCITS ETF - EUR | `AASI.PA` |
| `DE000A0H0728` | EXXY | ISHARES DIVERSIFIED COMMODITY SWAP UCITS ETF (DE) | `EXXY.DE` |
| `DE000A2QP380` | EXX5 | ISHARES EURO STOXX SELECT DIVIDEND 30 UCITS ETF (DE) | `EXX5.DE` |
| `LU1834987973` | INSU | AMUNDI STOXX EUROPE 600 INSURANCE UCITS ETF ACC | `LIRU.PA` |
| `US23804L1035` | DDOG | DATADOG RG-A | `DDOG` |

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

For local production Next.js build:
```bash
npm run build:next
npm start
```

For Cloudflare Workers build and deployment:
```bash
npm run build
npm run deploy
```

---

## Environment Variables & Cloudflare Configuration

Set the following environment variables in your `.env.local` for local development or in Cloudflare Workers settings:

```ini
# Session cookie secret (32+ chars generated via: openssl rand -base64 32)
SESSION_SECRET="your-secure-session-secret"

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Optional explicit public application URL (e.g. for OAuth redirects behind reverse proxies)
NEXT_PUBLIC_APP_URL="https://ticker-tracker.yourdomain.com"
```

### Cloudflare Workers KV & Wrangler Setup

The application is configured in `wrangler.toml` with:
- `keep_vars = true` (to preserve dashboard environment variables upon CLI deployment)
- KV namespace bindings `KV` and `ticker_tracker_kv` pointing to ID `d6b4aa8e710d442d97e6c52b1027f92c`:

```toml
name = "ticker-tracker"
main = ".open-next/worker.js"
compatibility_date = "2025-04-01"
compatibility_flags = ["nodejs_compat"]
keep_vars = true

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[[kv_namespaces]]
binding = "KV"
id = "d6b4aa8e710d442d97e6c52b1027f92c"

[[kv_namespaces]]
binding = "ticker_tracker_kv"
id = "d6b4aa8e710d442d97e6c52b1027f92c"
```

### Google OAuth Configuration

In your Google Cloud Console OAuth Client configuration:
- **Authorized JavaScript origins**:
  - `https://your-domain.com`
  - `https://localhost:3000`
- **Authorized redirect URIs**:
  - `https://your-domain.com/api/auth/callback/google`
  - `https://localhost:3000/api/auth/callback/google`

---

## Test Suite

The project includes unit tests and an end-to-end Playwright test suite:

### Run Unit Tests (Node Test Runner + tsx)
```bash
npm run test:unit
```
Covers:
- Auth crypto utilities (PBKDF2 hashing, token signing and verification)
- KV storage adapter (get, put, list, delete with fallbacks)
- Stock catalog multimodal search by ticker, company label, and ISIN code
- Watchlist tickers ordering and `% diff` variance computation
- Account management (password update and account deletion)
- Yahoo Finance service and quote normalization

### Run End-to-End Tests (Playwright)
```bash
npm run test:e2e
```
Covers:
- Full user journey: registration, login, adding tickers by symbol and company label, tracking cost basis configuration, reordering tickers, viewing details and price history charts, password change, logout, re-authentication, and account deletion.
- Multimodal search across tickers (`PUST`), company labels (`LVMH`, `AIRBUS`), and ISIN codes (`FR001400Q9V2`).
- Navigation and internationalization: privacy page, terms page, dynamic language switching across 6 locales, and footer verification (`Personal Page`, `Portfolio`).

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
   - **Tier 3**: Direct Yahoo Finance Chart API (`query1.finance.yahoo.com/v8/finance/chart`) with browser headers.
   - **Tier 4**: Graceful stale-cache recovery if network requests are degraded.

---

## API Endpoints

### Market & Tickers
- `GET /api/tickers/search?q={query}`: Search tickers across curated catalog and global exchanges.
- `GET /api/tickers/quote?symbols={AAPL,MC.PA,...}`: Fetch single or batch quotes with valuation multiples.
- `GET /api/tickers/details?symbol={symbol}&range={1mo}`: Retrieve historical chart time series and detailed statistics.

### Watchlist Management
- `GET /api/tickers`: Retrieve authenticated user's tickers enriched with quotes.
- `POST /api/tickers`: Add a ticker with tracking value baseline and optional notes.
- `PATCH /api/tickers`: Update tracking value or notes for a ticker.
- `DELETE /api/tickers?id={id}`: Remove a ticker and auto-compact order indices.
- `POST /api/tickers/reorder`: Persist custom ordering sequence of tickers.

### Authentication & Account
- `POST /api/auth/register`: Create user account with PBKDF2 password encryption.
- `POST /api/auth/login`: Authenticate email/password credentials and set HTTP-only signed session cookie.
- `GET /api/auth/me`: Retrieve currently authenticated user session.
- `POST /api/auth/logout`: Terminate active session and clear cookies.
- `GET /api/auth/google`: Initiate Google OAuth 2.0 authorization redirect.
- `GET /api/auth/callback/google`: Handle Google OAuth token exchange and session creation.
- `POST /api/auth/changepassword`: Change password with verification of existing password.
- `DELETE /api/auth/delete_my_account`: Permanently delete user profile and associated watchlist data from KV.