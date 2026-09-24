import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, ArrowLeft, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service and Financial Disclaimer for Ticker-Tracker: terms of use, market data disclaimers, and user responsibilities.',
  alternates: {
    canonical: 'https://ticker-tracker.pages.dev/terms',
  },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
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
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Terms of Service</h1>
          <p className="text-xs text-slate-500 mt-2">Last updated: September 2026</p>
        </div>

        {/* Prominent Financial Disclaimer Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 mb-8 flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <strong className="block text-amber-300 font-bold mb-1">Important Financial Disclaimer:</strong>
            Ticker-Tracker is an independent personal portfolio tracking and valuation reference tool. It does NOT
            provide investment advice, tax advice, financial planning, or brokerage services. All financial figures,
            multiples (Trailing & Forward P/E), and price variance computations are for personal research and informational purposes only.
          </div>
        </div>

        <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
          <section className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>1. Acceptance of Terms</span>
            </h2>
            <p>
              By accessing, browsing, or using Ticker-Tracker (whether as a registered user or in guest mode), you agree
              to be bound by these Terms of Service. If you do not agree, please do not use the application.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2">2. Market Data & Accuracy</h2>
            <p>
              Financial quotes and fundamental statistics are sourced via open internet endpoints (Yahoo Finance).
              Quotes may be delayed by 15 minutes or more depending on exchange rules and trading hours. Ticker-Tracker
              makes no warranties, express or implied, regarding the accuracy, completeness, timeliness, or reliability
              of any market quote or calculated valuation ratio.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2">3. User Accounts & Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials. You agree to notify us
              immediately of any unauthorized access to your account. You can permanently delete your account at any time
              through your account settings.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2">4. Limitation of Liability</h2>
            <p>
              Under no circumstances shall Ticker-Tracker, its creators, or contributors be liable for any direct, indirect,
              incidental, consequential, or punitive damages resulting from your use of the application, trading decisions,
              investment gains or losses, or service interruptions.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h2 className="text-base font-bold text-white mb-2">5. Governing Law</h2>
            <p>
              These Terms shall be governed and interpreted in accordance with applicable laws, without regard to its conflict of law provisions.
            </p>
          </section>
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-300">Home</Link>
            <Link href="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
          </div>
          <div>© {new Date().getFullYear()} Ticker-Tracker. All rights reserved.</div>
        </div>
      </main>
    </div>
  );
}
