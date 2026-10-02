'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { WalkthroughModal } from './WalkthroughModal'
import { ContactModal } from './ContactModal'

// Set your YouTube embed / Loom / MP4 video link here to automatically play in the walkthrough modal
// e.g. "https://www.youtube-nocookie.com/embed/YOUR_VIDEO_ID?autoplay=1" or "/videos/walkthrough.mp4"
const WALKTHROUGH_VIDEO_URL: string = ''

interface LandingPageProps {
  isLoggedIn?: boolean
  userName?: string | null
  orgName?: string | null
}

export function LandingPage({
  isLoggedIn = false,
  userName,
  orgName,
}: LandingPageProps) {
  const [walkthroughOpen, setWalkthroughOpen] = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [previewTimeRange, setPreviewTimeRange] = useState<'month' | 'quarter' | 'all'>('month')

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* ── 1. MAIN NAVIGATION ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Logo theme="light" href="/" size="sm" />

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Product</a>
            <a href="#statutory" className="hover:text-blue-600 transition-colors">Solutions</a>
            <Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
            <a href="#impact" className="hover:text-blue-600 transition-colors">Resources</a>
            <Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-xs transition-all"
              >
                <span>Dashboard ({userName || orgName || 'Firm'})</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs active:scale-95 transition-all"
                >
                  Start Free
                </Link>
                <Link
                  href={isLoggedIn ? "/dashboard" : "/sign-in"}
                  title={isLoggedIn ? "Dashboard" : "Sign In"}
                  aria-label={isLoggedIn ? "Dashboard" : "Sign In"}
                  className="hidden sm:flex w-8 h-8 rounded-full bg-slate-100 border border-slate-200 items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── 3. HERO SECTION ────────────────────────────────────── */}
      <section className="py-12 lg:py-16 bg-slate-50/50 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Content (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Category Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Engineered for Infrastructure &amp; Civil Works</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-black text-slate-900 tracking-tight leading-[1.08]">
                Every Contract.<br />
                Every Measurement.<br />
                <span className="text-blue-600">Every Rupee.</span>
              </h1>

              {/* Subhead */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                The all-in-one operating system for Indian civil contractors managing CPWD, NHPC, State PWD, and PMGSY projects. Eliminate billing leaks, automate measurement books, and track real-time site cash flow.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm active:scale-95 transition-all"
                >
                  Start Free
                </Link>
                <button
                  type="button"
                  onClick={() => setWalkthroughOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-2xs active:scale-95 transition-all"
                >
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Watch 3-Min Walkthrough</span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  7-day Free trial
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  No credit card required
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Offline-first field sync
                </span>
              </div>
            </div>

            {/* Right Interactive Mockup Window (7 Cols) */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden">
                {/* Browser Titlebar */}
                <div className="bg-slate-50/90 border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="px-3 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-mono text-slate-600 max-w-xs w-full text-center truncate">
                    app.pillarprojk.com/contracts/nhai-pkg-04
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Live Master e-MB</span>
                  </div>
                </div>

                {/* App Content Preview */}
                <div className="p-5 sm:p-6 space-y-4 bg-white">
                  {/* Card Title & Timeselector */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        NH
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                            NHAI Package - 4 (Ch. 12+000 to 48+500)
                          </h2>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            Work Fronts
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Four-Laning of Bareilly-Sitapur Section • EPC Mode
                        </p>
                      </div>
                    </div>

                    {/* Time filter switcher */}
                    <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/60 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setPreviewTimeRange('month')}
                        className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all ${
                          previewTimeRange === 'month'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        This Month
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTimeRange('quarter')}
                        className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all ${
                          previewTimeRange === 'quarter'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Quarter
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTimeRange('all')}
                        className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all ${
                          previewTimeRange === 'all'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        All Time
                      </button>
                    </div>
                  </div>

                  {/* Current Contract Position */}
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          CURRENT CONTRACT POSITION
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                            ₹18,42,10,000
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            Excl. Variations 19
                          </span>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span>72.8% Physically Executed</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500 h-full w-[72.8%]" />
                      <div className="bg-blue-600 h-full w-[12.4%]" />
                    </div>

                    {/* 5 Stats Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Original Value</span>
                        <span className="font-bold text-slate-700 font-mono">₹16.80 Cr</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Variations</span>
                        <span className="font-bold text-emerald-600 font-mono">+₹1.62 Cr</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Physical Work</span>
                        <span className="font-bold text-slate-800 font-mono">₹13.40 Cr</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Total Billed</span>
                        <span className="font-bold text-blue-600 font-mono">₹11.80 Cr</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Received Paid</span>
                        <span className="font-bold text-emerald-700 font-mono">₹9.40 Cr</span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Alert Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Card 1 */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">RA Bills Pending Cert.</span>
                        <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center">
                          2
                        </span>
                      </div>
                      <p className="text-lg font-black text-slate-900 font-mono">₹2.40 Cr</p>
                      <p className="text-[10px] font-semibold text-amber-700 flex items-center gap-1">
                        <span>⏱️ Avg wait: 18 days</span>
                      </p>
                    </div>

                    {/* Card 2 */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">Overdue MB Entries</span>
                        <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center">
                          2
                        </span>
                      </div>
                      <p className="text-lg font-black text-slate-900 font-mono">Ch. 32+400</p>
                      <p className="text-[10px] font-semibold text-slate-500">
                        Sub-base verification delay
                      </p>
                    </div>

                    {/* Card 3 */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">Site Labour &amp; Plant</span>
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">
                          ✓
                        </span>
                      </div>
                      <p className="text-lg font-black text-slate-900 font-mono">142 Manpower</p>
                      <p className="text-[10px] font-semibold text-slate-500">
                        8 Rollers • 4 Graders active
                      </p>
                    </div>
                  </div>

                  {/* ContractIQ Query Banner */}
                  <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-blue-600 font-bold shrink-0">💬 CONTRACTIQ QUERY:</span>
                      <span className="text-slate-700 truncate font-medium">
                        &quot;Why is RA Bill #12 withholding ₹32.8 Lakhs fro...&quot;
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-blue-700 border border-blue-200 shadow-2xs shrink-0">
                      Found 1 Clause
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. STATUTORY READY STRIP ───────────────────────────── */}
      <section id="statutory" className="py-8 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                STATUTORY READY
              </p>
              <h3 className="text-xs font-bold text-slate-800 mt-0.5">
                Built strictly around Indian public procurement codes
              </h3>
            </div>

            {/* Badges Strip */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:border-blue-300 transition-colors">
                CPWD Works Manual 2024
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:border-blue-300 transition-colors">
                IRC &amp; MORTH Specifications
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:border-blue-300 transition-colors">
                Standard e-MB Verification
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:border-blue-300 transition-colors">
                SDR / DSR Master Rates
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:border-blue-300 transition-colors">
                State PWD Form 26 Billing
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:border-blue-300 transition-colors">
                PMGSY Rural Road Formats
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. FOUR PILLARS FEATURE MATRIX ─────────────────────── */}
      <section id="features" className="py-16 lg:py-20 bg-slate-50/50 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              ENGINEERED FOR THE GROUND REALITY
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Four Pillars built to stop revenue leakage across site packages
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
              No generic spreadsheets or consumer task lists. Every calculation respects Indian contractor accounting, tax deduction protocols, and engineer measurement approvals.
            </p>
          </div>

          {/* 2x2 Grid of Feature Cards */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* ── PILLAR 1: CONTRACT & BOQ MASTER ── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Contract &amp; BOQ Master
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Import tender BOQ in minutes. Monitor item rate ceilings, track quantity variations (+/-), and apply automated CPWD 10CA/10CC price escalation indices without manual re-keying.
                </p>
              </div>

              {/* Mini Preview Box */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3 text-xs">
                <div className="flex items-center justify-between text-[11px] border-b border-slate-200/70 pb-2">
                  <span className="font-bold text-slate-800">BOQ Schedule Item Tracker</span>
                  <span className="font-mono text-slate-500">Contract Ref: PWD/DIV-IV/2023/108</span>
                </div>

                {/* Item 1 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Item 4.04: R.C.C. M-25 in Foundation &amp; Piers</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Within Limit (72.6%)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between font-mono">
                    <span>Tender: 4,200.00 cum</span>
                    <span>Executed: 3,050.00 cum</span>
                    <span>Rate: ₹6,450 / cum</span>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="space-y-1 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Item 7.11: Granular Sub-base Course (Grade-II)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Variation Approved (+12.4%)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between font-mono">
                    <span>Tender: 18,500.00 cum</span>
                    <span>Current: 20,795.00 cum</span>
                    <span className="text-emerald-700 font-bold">Impact: +₹24,12,000</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PILLAR 2: MEASUREMENTS & DIGITAL E-MB ── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Measurements &amp; Digital e-MB
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Empower site engineers to punch daily field measurements directly by chainage. Automated L x B x D math prevents arithmetic queries from departmental Junior Engineers (JEs).
                </p>
              </div>

              {/* Mini Preview Box */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3 text-xs">
                <div className="flex items-center justify-between text-[11px] border-b border-slate-200/70 pb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    e-MB Sheet No. 491 / Page 18
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    JE Checked &amp; Synced
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span>Chainage: <strong className="font-mono text-slate-800">12+400 to 12+550 (LHS)</strong></span>
                  <span>Structure: <strong className="text-slate-800">Culvert No. 4 Wingwall</strong></span>
                </div>

                {/* Math Box */}
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between font-mono">
                  <span className="text-slate-600">L: 24.50m × B: 3.20m × D: 0.45m</span>
                  <span className="text-base font-black text-blue-600">35.28 cum</span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>GPS: 28.3871° N, 79.4326° E | Recorded 11:42 AM</span>
                  <span className="font-semibold text-slate-600">Digital Sign: V. Sharma</span>
                </div>
              </div>
            </div>

            {/* ── PILLAR 3: RA BILLS & DEDUCTIONS ── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Running Account (RA) Bills &amp; Deductions
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generate 100% compliant CPWD Form 26 and State PWD bills with a single click. Every statutory recovery—Security Deposit, GST-TDS, Labour Cess, and Mobilization recovery—is auto-computed.
                </p>
              </div>

              {/* Mini Preview Box */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] border-b border-slate-200/70 pb-2">
                  <div>
                    <span className="font-bold text-slate-800">NHAI/4L/RA/BILL/03</span>
                    <span className="text-slate-400 block text-[10px]">Period: 01 Nov to 30 Nov 2024</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Certification Due in 3 Days
                  </span>
                </div>

                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-800 font-semibold">
                    <span>Gross Value of Work Done (A)</span>
                    <span>₹1,15,48,000</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Less: Mobilization Advance Recovery (10%)</span>
                    <span>- ₹11,54,800</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Less: Security Deposit / Retention (5%)</span>
                    <span>- ₹5,77,400</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Less: Statutory TDS &amp; 1% Labour Cess</span>
                    <span>- ₹2,38,600</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Net Payable to Contractor</span>
                  <span className="text-base font-black text-blue-600 font-mono">₹95,78,200</span>
                </div>
              </div>
            </div>

            {/* ── PILLAR 4: SITE OPERATIONS & CONTRACTIQ ASSISTANT ── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Site Operations &amp; ContractIQ Assistant
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Log daily site muster rolls, diesel logs for machinery, and cement store balance. ContractIQ cross-checks field events against your agreement clauses in English and Hindi.
                </p>
              </div>

              {/* Mini Preview Box */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3 text-xs">
                {/* 2 Mini Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Today&apos;s Manpower</span>
                    <span className="font-bold text-slate-800 text-xs">84 Labour (4 Gangs)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Machinery &amp; Diesel</span>
                    <span className="font-bold text-slate-800 text-xs">6 Excavators (420 L)</span>
                  </div>
                </div>

                {/* ContractIQ Advisory Card */}
                <div className="p-3 rounded-xl bg-white border border-blue-200 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[11px]">
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                    </svg>
                    <span>ContractIQ Site Advisory</span>
                  </div>
                  <p className="text-[11px] text-slate-600 italic leading-relaxed">
                    &quot;Warning: RA Bill #08 has been pending certification for 14 days at the Division Office. As per CPWD Clause 7, you are eligible to claim interest on delayed payment if not certified within 10 days.&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. IMPACT / TRACTION NUMBERS STRIP ─────────────────── */}
      <section id="impact" className="py-14 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 gap-8 md:gap-0">
            {/* Stat 1 */}
            <div className="md:px-8 first:pl-0 space-y-2">
              <p className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight">
                1-Click
              </p>
              <p className="text-sm font-bold text-slate-900">
                Form 26 &amp; e-MB Generation
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Instant export of statutory CPWD/State PWD bill vouchers, deduction schedules, and measurement abstracts.
              </p>
            </div>

            {/* Stat 2 */}
            <div className="pt-6 md:pt-0 md:px-8 space-y-2">
              <p className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight">
                99.4%
              </p>
              <p className="text-sm font-bold text-slate-900">
                Billing Arithmetic Accuracy
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Zero rejections caused by chainage overlap, SOR code discrepancies, or tax miscalculations.
              </p>
            </div>

            {/* Stat 3 */}
            <div className="pt-6 md:pt-0 md:px-8 last:pr-0 space-y-2">
              <p className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight">
                4.2x Faster
              </p>
              <p className="text-sm font-bold text-slate-900">
                RA Bill Certification Turnaround
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Contractors slash their average submission-to-disbursement window from 45 days down to 11 days.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. BOTTOM CONVERSION CTA BANNER ───────────────────── */}
      <section className="py-16 lg:py-20 bg-slate-50/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Seamless Transition from Excel &amp; Physical MBs</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Ready to modernize your civil contracting operations?
          </h2>

          <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Built for highway, building, and irrigation contractors running efficient, dispute-free projects with real-time cash flow visibility.
          </p>

          <div className="flex items-center justify-center pt-2">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-blue-600/25 active:scale-95 transition-all"
            >
              Start 7-Day Free Trial
            </Link>
          </div>

          <p className="text-xs text-slate-400 pt-2">
            No credit card needed • Fast 1-day onboarding for existing project BOQs • Free data migration assistance
          </p>
        </div>
      </section>

      {/* ── 8. FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Brand Col */}
            <div className="col-span-2 space-y-3">
              <Logo theme="light" href="/" size="sm" />
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                The comprehensive operating system engineered specifically for Indian civil contractors, highway builders, and infra developers.
              </p>
              <p className="text-[11px] text-blue-600 font-medium">
                • Designed for CPWD, PMGSY, and State Works
              </p>
            </div>

            {/* Product Col */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 text-xs">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-blue-600 transition-colors">Measurement Books (e-MB)</a></li>
                <li><a href="#features" className="hover:text-blue-600 transition-colors">RA Bill Automation</a></li>
                <li><a href="#features" className="hover:text-blue-600 transition-colors">Site Tally &amp; Materials</a></li>
                <li><a href="#features" className="hover:text-blue-600 transition-colors">Subcontractor Logs</a></li>
              </ul>
            </div>

            {/* Solutions Col */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 text-xs">Solutions</h4>
              <ul className="space-y-2">
                <li><a href="#statutory" className="hover:text-blue-600 transition-colors">Roads &amp; Highways</a></li>
                <li><a href="#statutory" className="hover:text-blue-600 transition-colors">Bridges &amp; Flyovers</a></li>
                <li><a href="#statutory" className="hover:text-blue-600 transition-colors">Urban Water Supply</a></li>
                <li><a href="#statutory" className="hover:text-blue-600 transition-colors">Commercial EPC</a></li>
              </ul>
            </div>

            {/* Compliance Col */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 text-xs">Compliance</h4>
              <ul className="space-y-2">
                <li><a href="#statutory" className="hover:text-blue-600 transition-colors">CPWD Specifications</a></li>
                <li><a href="#statutory" className="hover:text-blue-600 transition-colors">State PWD Codes</a></li>
                <li><a href="#statutory" className="hover:text-blue-600 transition-colors">PMGSY Standards</a></li>
                <li><a href="#statutory" className="hover:text-blue-600 transition-colors">NHPC &amp; MORTH Forms</a></li>
              </ul>
            </div>

            {/* Company Col */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 text-xs">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link></li>
                <li>
                  <a
                    href="mailto:contact@pillarprojk.com"
                    onClick={(e) => {
                      const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
                      if (!isMobile) {
                        e.preventDefault()
                        setContactModalOpen(true)
                      }
                    }}
                    className="hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Contact Us
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:contact@pillarprojk.com?subject=Documentation%20Request"
                    onClick={(e) => {
                      const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
                      if (!isMobile) {
                        e.preventDefault()
                        setContactModalOpen(true)
                      }
                    }}
                    className="hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Documentation
                  </a>
                </li>
                <li><Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          {/* Copyright Bottom Bar */}
          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <p>© 2026 PillarPro Technologies India Pvt. Ltd. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                GST &amp; E-Invoicing Compliant
              </span>
              <span>•</span>
              <span className="text-slate-600 font-medium">Rupee Ready (₹)</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── 9. WALKTHROUGH MODAL ───────────────────────────────── */}
      <WalkthroughModal
        isOpen={walkthroughOpen}
        onClose={() => setWalkthroughOpen(false)}
        videoUrl={WALKTHROUGH_VIDEO_URL}
      />

      {/* ── 10. CONTACT MODAL ─────────────────────────────────── */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
    </div>
  )
}
