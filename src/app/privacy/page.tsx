import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, ArrowLeft, ShieldCheck, Lock, Database, UserCheck, EyeOff } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Ticker-Tracker: data collection, cookies, security, local IndexedDB caching and GDPR rights.',
  alternates: {
    canonical: 'https://ticker-tracker.pages.dev/privacy',
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-400 p-[1.5px]">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <span className="font-bold text-base text-white tracking-tight">Ticker-Tracker</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>GDPR & Data Protection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-slate-500 mt-2">Last updated: September 2026</p>
        </div>

        <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
          <section className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-emerald-400" />
              <span>1. Overview & Commitment</span>
            </h2>
            <p>
              Ticker-Tracker is a stock and valuation tracking tool designed to monitor financial market quotes,
              multiples (P/E & Forward P/E), and cost basis variance. We are committed to transparency, minimal data
              collection, and absolute privacy. We do not sell your personal information and do not track you across third-party websites.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>2. Data We Collect</span>
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 mt-2">
              <li>
                <strong className="text-white">Account Information:</strong> If you create an account, we store your
                email, username, and an encrypted password hash. If you sign in via Google OAuth, we receive your email and verified profile ID.
              </li>
              <li>
                <strong className="text-white">Watchlist Content:</strong> Your tracked stock tickers, personal target/purchase
                reference values, custom order indices, and optional notes.
              </li>
              <li>
                <strong className="text-white">Local Offline Cache:</strong> Tickers and latest quotes are cached locally
                in your browser&apos;s IndexedDB for instantaneous zero-latency startup on mobile and desktop devices.
              </li>
              <li>
                <strong className="text-white">Technical Metadata:</strong> Strictly necessary HTTP-only session cookies and
                your chosen language preference.
              </li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>3. Cryptography & Security</span>
            </h2>
            <p>
              Passwords are salted and hashed using standard PBKDF2-HMAC-SHA256 with 100,000 iterations. Sessions are authenticated
              using signed HTTP-only cookies (HMAC-SHA256) preventing client-side script injection (XSS). Server-side data is stored
              in encrypted Cloudflare Workers KV storage.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-400" />
              <span>4. Your Rights (GDPR & Data Erasure)</span>
            </h2>
            <p>
              You have the right to access, rectify, or permanently erase your data at any time:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 mt-2">
              <li>
                <strong className="text-white">Immediate Self-Service Account Deletion:</strong> You can permanently delete your
                entire account and all associated tickers instantly from your Account Settings modal.
              </li>
              <li>
                <strong className="text-white">Guest Mode:</strong> You can use Ticker-Tracker entirely without creating an account;
                in this case, all data remains exclusively on your own device in IndexedDB.
              </li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2">5. Cookies</h2>
            <p>
              We only use strictly necessary cookies: your session token (<code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">tt_session</code>)
              and your language preference (<code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">tt_locale</code>). We do not use advertising,
              tracking, or marketing cookies.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2">6. Contact</h2>
            <p>
              For any questions regarding privacy or data protection, please visit our{' '}
              <a href="https://www.louisvolant.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                Personal Page
              </a>{' '}
              or contact us via our website.
            </p>
          </section>
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-300">Home</Link>
            <Link href="/terms" className="hover:text-slate-300">Terms of Service</Link>
          </div>
          <div>© {new Date().getFullYear()} Ticker-Tracker. All rights reserved.</div>
        </div>
      </main>
    </div>
  );
}
