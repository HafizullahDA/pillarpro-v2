'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Logo } from '@/components/ui/Logo'

const WalkthroughModal = dynamic(
  () => import('./WalkthroughModal').then((mod) => mod.WalkthroughModal),
  { ssr: false }
)
const ContactModal = dynamic(
  () => import('./ContactModal').then((mod) => mod.ContactModal),
  { ssr: false }
)

const WALKTHROUGH_VIDEO_URL: string = ''

interface LandingPageProps {
  isLoggedIn?: boolean
  userName?: string | null
  orgName?: string | null
}

const MOCKUP_DATA = {
  month: {
    contractPosition: '₹2,48,50,000',
    variationsNote: 'Period Gross Certified',
    physicalPct: '14.2%',
    billedPct: '12.0%',
    originalValue: '₹18.42 Cr',
    variations: '+₹12.40 L',
    physicalWork: '₹2.48 Cr',
    totalBilled: '₹2.10 Cr',
    receivedPaid: '₹1.88 Cr',
    card1: { val: '₹42.50 L', cleanNote: '2 RA Bills at Division' },
    card2: { val: 'Ch. 14+200', note: 'Sub-grade verification' },
    card3: { val: '94 Workforce', cleanNote: '6 Excavators • 4 Rollers' },
  },
  quarter: {
    contractPosition: '₹6,92,10,000',
    variationsNote: 'Quarter Cumulative Certified',
    physicalPct: '38.6%',
    billedPct: '32.5%',
    originalValue: '₹18.42 Cr',
    variations: '+₹48.20 L',
    physicalWork: '₹6.92 Cr',
    totalBilled: '₹5.85 Cr',
    receivedPaid: '₹5.12 Cr',
    card1: { val: '₹1.15 Cr', cleanNote: 'Avg certification: 9 days' },
    card2: { val: 'Ch. 22+800', note: 'DLC / Pavement clearance' },
    card3: { val: '142 Workforce', cleanNote: '8 Excavators • 6 Rollers' },
  },
  all: {
    contractPosition: '₹18,42,10,000',
    variationsNote: 'Total Contract Sanctioned',
    physicalPct: '72.8%',
    billedPct: '64.0%',
    originalValue: '₹18.42 Cr',
    variations: '+₹1.62 Cr',
    physicalWork: '₹13.40 Cr',
    totalBilled: '₹11.80 Cr',
    receivedPaid: '₹10.42 Cr',
    card1: { val: '₹2.40 Cr', cleanNote: 'Certified on schedule' },
    card2: { val: 'All Cleared', note: 'Reconciled with MB No. 491' },
    card3: { val: '185 Workforce', cleanNote: 'Full plant mobilization' },
  },
} as const

export function LandingPage({
  isLoggedIn = false,
  userName,
  orgName,
}: LandingPageProps) {
  const [walkthroughOpen, setWalkthroughOpen] = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [previewTimeRange, setPreviewTimeRange] = useState<'month' | 'quarter' | 'all'>('month')

  const currentMock = MOCKUP_DATA[previewTimeRange]

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-white text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* ── 1. MAIN NAVIGATION ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 min-w-0">
          {/* Brand Logo */}
          <div className="shrink-0">
            <Logo theme="light" href="/" size="sm" />
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Product</a>
            <a href="#pipeline" className="hover:text-slate-900 transition-colors">Solutions</a>
            <a href="#statutory" className="hover:text-slate-900 transition-colors">Compliance</a>
            <Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
            <button
              type="button"
              onClick={() => setContactModalOpen(true)}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Contact
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 shadow-xs transition-all"
              >
                <span>Dashboard ({userName || orgName || 'Firm'})</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/sign-in"
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </Link>
                <button
                  type="button"
                  onClick={() => setContactModalOpen(true)}
                  className="hidden sm:inline-flex items-center justify-center border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all shadow-2xs"
                >
                  Talk to an Engineer
                </button>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center bg-blue-700 hover:bg-blue-800 text-white rounded-lg px-3.5 sm:px-4 py-2 text-xs font-semibold shadow-xs transition-all"
                >
                  Start 7-Day Free Trial
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── 2. HERO SECTION ────────────────────────────────────── */}
      <section className="relative py-12 lg:py-16 bg-slate-50/50 border-b border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0 max-w-full">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center min-w-0">
            {/* Left Content (5 Cols) */}
            <div className="lg:col-span-5 space-y-6 min-w-0 max-w-full">
              {/* Restrained Typographic Eyebrow */}
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Civil Infrastructure &amp; Public Works ERP
              </p>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[48px] font-bold tracking-tight leading-[1.12] break-words text-slate-900">
                Every Contract.<br />
                Every Measurement.<br />
                <span className="text-slate-600">Every Rupee.</span>
              </h1>

              {/* Subheadline */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                The authoritative infrastructure ERP engineered to stop revenue leakage across Running Account (RA) bills, automate L×B×D digital e-MB measurement sheets, enforce statutory recoveries (SD, GST-TDS, Labour Cess, Mobilization), and defend contractual claims under CPWD Works Manual &amp; MORTH IRC protocols.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto pt-1">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 shadow-sm transition-all w-full sm:w-auto"
                >
                  Start 7-Day Free Trial
                </Link>
                <button
                  type="button"
                  onClick={() => setWalkthroughOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-2xs transition-all w-full sm:w-auto cursor-pointer"
                >
                  <svg className="w-4 h-4 text-slate-700 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Watch 3-Min Walkthrough</span>
                </button>
              </div>

              {/* 3-Column Trust Metrics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 border-t border-slate-200 pt-5 min-w-0 max-w-full">
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums tracking-tight">
                    ₹100 Cr+
                  </p>
                  <p className="text-xs text-slate-500 font-medium leading-tight mt-0.5">
                    BOQs Structured
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums tracking-tight">
                    100%
                  </p>
                  <p className="text-xs text-slate-500 font-medium leading-tight mt-0.5">
                    Form 26 Compliant
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums tracking-tight">
                    Zero
                  </p>
                  <p className="text-xs text-slate-500 font-medium leading-tight mt-0.5">
                    Arithmetic Accuracy
                  </p>
                </div>
              </div>
            </div>

            {/* Right Architectural Ledger Sheet Mockup (7 Cols) */}
            <div className="lg:col-span-7 min-w-0 max-w-full">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-0 max-w-full">
                {/* Top Header inside preview */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                      NHAI Pkg-4 (Ch. 12+000 to 48+500)
                    </h2>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      EPC Mode • Division IV
                    </p>
                  </div>

                  {/* Time Filter Switcher */}
                  <div className="inline-flex bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-medium self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewTimeRange('month')}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        previewTimeRange === 'month'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTimeRange('quarter')}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        previewTimeRange === 'quarter'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Quarter
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTimeRange('all')}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        previewTimeRange === 'all'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Time
                    </button>
                  </div>
                </div>

                {/* Contract Position Section */}
                <div className="p-4 border-b border-slate-200 space-y-3 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                        CERTIFIED WORK POSITION
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
                          {currentMock.contractPosition}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {currentMock.variationsNote}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium tabular-nums self-start sm:self-auto shrink-0">
                      {currentMock.physicalPct} Executed
                    </span>
                  </div>

                  {/* Clean Monochrome Progress Bar */}
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-900 h-full transition-all duration-300"
                      style={{ width: currentMock.physicalPct }}
                    />
                  </div>

                  {/* Financial Breakdown Grid (2x2 on mobile, 4-col on desktop) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-slate-100 min-w-0">
                    <div className="min-w-0">
                      <span className="text-slate-500 block text-[11px] font-medium">Awarded Value</span>
                      <span className="text-sm font-semibold text-slate-900 tabular-nums tracking-tight block truncate">
                        {currentMock.originalValue}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 block text-[11px] font-medium">Approved Variations</span>
                      <span className="text-sm font-semibold text-slate-900 tabular-nums tracking-tight block truncate">
                        {currentMock.variations}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 block text-[11px] font-medium">Total Billed</span>
                      <span className="text-sm font-semibold text-slate-900 tabular-nums tracking-tight block truncate">
                        {currentMock.totalBilled}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 block text-[11px] font-medium">Net Disbursed</span>
                      <span className="text-sm font-semibold text-slate-900 tabular-nums tracking-tight block truncate">
                        {currentMock.receivedPaid}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom 3 Operational Rows */}
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white min-w-0">
                  <div className="p-3.5 space-y-0.5 min-w-0">
                    <span className="text-[11px] font-medium text-slate-500 block">Pending Certification</span>
                    <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums tracking-tight">
                      {currentMock.card1.val}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {currentMock.card1.cleanNote}
                    </p>
                  </div>
                  <div className="p-3.5 space-y-0.5 min-w-0">
                    <span className="text-[11px] font-medium text-slate-500 block">Unbilled e-MB Entries</span>
                    <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums tracking-tight">
                      {currentMock.card2.val}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {currentMock.card2.note}
                    </p>
                  </div>
                  <div className="p-3.5 space-y-0.5 min-w-0">
                    <span className="text-[11px] font-medium text-slate-500 block">Active Site Deployment</span>
                    <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums tracking-tight">
                      {currentMock.card3.val}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {currentMock.card3.cleanNote}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. STATUTORY & PROCUREMENT ENGINE BAR ─────────────── */}
      <section id="statutory" className="bg-slate-50 py-12 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 min-w-0 max-w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-slate-200 pb-5 min-w-0">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                STATUTORY &amp; PROCUREMENT ENGINE
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-1">
                Pre-configured for Indian Government Engineering &amp; Treasury Protocols
              </h2>
            </div>
            <p className="text-xs text-slate-600 max-w-md">
              Compliant with CPWD Works Manual 2024, State PWD accounts code, and MORTH specifications.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 min-w-0">
            <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 tracking-tight">CPWD Works Manual</p>
              <p className="text-[11px] text-slate-500">Clause 7, 10CA, 10CC &amp; EOT</p>
            </div>
            <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 tracking-tight">Form 26 &amp; 24</p>
              <p className="text-[11px] text-slate-500">Standard Running Account Bills</p>
            </div>
            <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 tracking-tight">IS 1200 / e-MB</p>
              <p className="text-[11px] text-slate-500">Chainage &amp; L×B×D Deduction Math</p>
            </div>
            <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 tracking-tight">IRC &amp; MORTH</p>
              <p className="text-[11px] text-slate-500">Highway &amp; Earthwork Tolerances</p>
            </div>
            <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 tracking-tight">Statutory Tax</p>
              <p className="text-[11px] text-slate-500">2% TDS, 2% GST-TDS, 1% BOCW Cess</p>
            </div>
            <div className="bg-white border border-slate-200 p-3.5 rounded-lg space-y-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 tracking-tight">BG &amp; EMD Vault</p>
              <p className="text-[11px] text-slate-500">Automated Expiry &amp; Release Alerts</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. SITE-TO-TREASURY EXECUTION PIPELINE ─────────────── */}
      <section id="pipeline" className="bg-white py-14 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 min-w-0 max-w-full">
          <div className="max-w-3xl space-y-2 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              HOW IT WORKS: SITE TO TREASURY PIPELINE
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              From site engineer&apos;s mobile to the bank realization ledger in 4 automated steps
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Eliminate disconnected WhatsApp groups, delayed measurement entries, and handwritten abstracts with an end-to-end audit chain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-w-0">
            {/* Step 1 */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  Step 01
                </span>
                <span className="text-[11px] font-medium text-slate-500">Site Engineer</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Chainage Measurements &amp; Diesel Logs
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Punch daily measurements by chainage (L×B×D), capture geo-tagged photo evidence, and log equipment diesel consumption offline on mobile.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  Step 02
                </span>
                <span className="text-[11px] font-medium text-slate-500">Billing Engineer</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Digital e-MB &amp; BOQ Quantity Linkage
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Auto-reconcile field measurements directly with sanctioned BOQ line items, calculate net quantities, and flag excess variations before JE scrutiny.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  Step 03
                </span>
                <span className="text-[11px] font-medium text-slate-500">Accounts &amp; HO</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Form 26 RA Bill &amp; Statutory Recoveries
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate 1-click Form 26 with automated Security Deposit (5%), GST-TDS (2%), BOCW Cess (1%), and Mobilization Advance schedules.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  Step 04
                </span>
                <span className="text-[11px] font-medium text-slate-500">Contractor / MD</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Treasury Realization &amp; Dispute Defense
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Track net bank realizations, monitor Bank Guarantee (BG) expiry alerts, and issue automated delay notices before statutory time-bars.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. FOUR PILLARS FEATURE MATRIX ─────────────────────── */}
      <section id="features" className="py-16 lg:py-20 bg-slate-50/50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 min-w-0 max-w-full">
          {/* Header */}
          <div className="max-w-3xl space-y-2 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              ENGINEERED FOR THE GROUND REALITY
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
              Four Pillars built to stop revenue leakage across site packages
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
              No generic spreadsheets or consumer task lists. Every calculation respects Indian contractor accounting, tax deduction protocols, and departmental measurement approvals.
            </p>
          </div>

          {/* 2x2 Grid of Feature Cards */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 min-w-0">
            {/* ── PILLAR 1: CONTRACT & BOQ MASTER ── */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between hover:border-slate-300 transition-all min-w-0">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Pillar 01
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Contract &amp; BOQ Master
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Import tender BOQs in minutes. Monitor item rate ceilings, track quantity variations (+/-), and apply automated CPWD 10CA/10CC price escalation indices without manual re-keying.
                </p>
              </div>

              {/* Mini Preview Box */}
              <div className="rounded-lg border border-slate-200 overflow-hidden min-w-0">
                <div className="bg-slate-100 text-slate-800 border-b border-slate-200 px-3.5 py-2 text-xs font-semibold flex flex-wrap items-center justify-between gap-2">
                  <span>BOQ Item &amp; Description</span>
                  <span>Tender vs Executed (cum)</span>
                </div>
                <div className="p-3.5 bg-white space-y-3 text-xs">
                  {/* Item 1 */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 text-xs">Item 4.04: R.C.C. M-25 in Foundation &amp; Piers</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium tabular-nums">
                        Within Limit (72.6%)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-600 tabular-nums">
                      <span>Tender: 4,200.00 cum</span>
                      <span>Executed: 3,050.00 cum</span>
                      <span className="font-semibold text-slate-900">Rate: ₹6,450 / cum</span>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="space-y-1 pt-2.5 border-t border-slate-100">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 text-xs">Item 7.11: Granular Sub-base Course (Grade-II)</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium tabular-nums">
                        Variation Approved (+12.4%)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-600 tabular-nums">
                      <span>Tender: 18,500.00 cum</span>
                      <span>Current: 20,795.00 cum</span>
                      <span className="font-semibold text-slate-900">Impact: +₹24,12,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PILLAR 2: MEASUREMENTS & DIGITAL E-MB ── */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between hover:border-slate-300 transition-all min-w-0">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Pillar 02
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Measurements &amp; Digital e-MB
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Empower site engineers to punch daily field measurements directly by chainage. Automated L×B×D deduction math prevents arithmetic queries from departmental Junior Engineers (JEs).
                </p>
              </div>

              {/* Mini Preview Box */}
              <div className="rounded-lg border border-slate-200 overflow-hidden min-w-0">
                <div className="bg-slate-100 text-slate-800 border-b border-slate-200 px-3.5 py-2 text-xs font-semibold flex flex-wrap items-center justify-between gap-2">
                  <span>e-MB Sheet No. 491 • Page 18</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium">Status: JE Verified</span>
                </div>
                <div className="p-3.5 bg-white space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span>Chainage: <strong className="text-slate-900 font-semibold tabular-nums">12+400 to 12+550 (LHS)</strong></span>
                    <span>Structure: <strong className="text-slate-900">Culvert No. 4 Wingwall</strong></span>
                  </div>

                  {/* Math Box */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 tabular-nums">
                    <span className="text-slate-600 text-xs">L: 24.50m × B: 3.20m × D: 0.45m</span>
                    <span className="text-sm font-bold text-slate-900">35.28 cum</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-0.5">
                    <span>GPS: 28.3871° N, 79.4326° E</span>
                    <span className="font-medium text-slate-700">Digital Sign: V. Sharma</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PILLAR 3: RA BILLS & DEDUCTIONS ── */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between hover:border-slate-300 transition-all min-w-0">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Pillar 03
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Running Account (RA) Bills &amp; Deductions
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generate 100% compliant CPWD Form 26 and State PWD bills with a single click. Every statutory recovery—Security Deposit, GST-TDS, Labour Cess, and Mobilization recovery—is auto-computed.
                </p>
              </div>

              {/* Mini Preview Box */}
              <div className="rounded-lg border border-slate-200 overflow-hidden min-w-0">
                <div className="bg-slate-100 text-slate-800 border-b border-slate-200 px-3.5 py-2 text-xs font-semibold flex flex-wrap items-center justify-between gap-2">
                  <span>Form 26 RA Bill Voucher • Ref: NHAI/4L/RA/03</span>
                  <span className="text-[10px] font-medium text-slate-600 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">Due in 3 Days</span>
                </div>
                <div className="p-3.5 bg-white space-y-2 text-xs">
                  <div className="space-y-1.5 tabular-nums text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-900 font-semibold">
                      <span>Gross Value of Work Done (A)</span>
                      <span className="tabular-nums">₹1,15,48,000</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600">
                      <span>Less: Mobilization Advance Recovery (10%)</span>
                      <span className="tabular-nums text-slate-700 font-medium">-₹11,54,800</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600">
                      <span>Less: Security Deposit / Retention (5%)</span>
                      <span className="tabular-nums text-slate-700 font-medium">-₹5,77,400</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600">
                      <span>Less: Statutory TDS &amp; 1% Labour Cess</span>
                      <span className="tabular-nums text-slate-700 font-medium">-₹2,38,600</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs">Net Payable to Contractor</span>
                    <span className="text-base font-bold text-slate-900 tabular-nums">₹95,78,200</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PILLAR 4: SITE OPERATIONS & CONTRACTIQ ASSISTANT ── */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between hover:border-slate-300 transition-all min-w-0">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Pillar 04
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Site Operations &amp; ContractIQ Assistant
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Log daily site muster rolls, diesel logs for machinery, and cement store balance. ContractIQ cross-checks field events against your agreement clauses in English and Hindi.
                </p>
              </div>

              {/* Mini Preview Box */}
              <div className="rounded-lg border border-slate-200 overflow-hidden min-w-0">
                <div className="bg-slate-100 text-slate-800 border-b border-slate-200 px-3.5 py-2 text-xs font-semibold flex flex-wrap items-center justify-between gap-2">
                  <span>ContractIQ Dispute &amp; Clause Engine</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium">Clause Check: Active</span>
                </div>
                <div className="p-3.5 bg-white space-y-2.5 text-xs">
                  {/* 2 Mini Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 min-w-0">
                      <span className="text-[10px] text-slate-500 block font-medium">Today&apos;s Manpower</span>
                      <span className="font-semibold text-slate-900 text-xs tabular-nums block truncate">84 Labour (4 Gangs)</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 min-w-0">
                      <span className="text-[10px] text-slate-500 block font-medium">Machinery &amp; Diesel</span>
                      <span className="font-semibold text-slate-900 text-xs tabular-nums block truncate">6 Excavators (420 L)</span>
                    </div>
                  </div>

                  {/* ContractIQ Advisory Card */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-xs font-semibold text-slate-900">
                      ContractIQ Statutory Advisory
                    </div>
                    <p className="text-[11px] text-slate-600 italic leading-relaxed">
                      &quot;Notice: RA Bill #08 has been pending certification for 14 days at the Division Office. Under CPWD Clause 7, you are eligible to claim interest on delayed payments beyond 10 days.&quot;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. IMPACT / TRACTION NUMBERS STRIP ─────────────────── */}
      <section id="impact" className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0 max-w-full">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs divide-y md:divide-y-0 md:divide-x divide-slate-200 grid grid-cols-1 md:grid-cols-3 min-w-0">
            {/* Stat 1 */}
            <div className="p-6 sm:p-8 space-y-2 min-w-0">
              <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tabular-nums tracking-tight">
                1-Click
              </p>
              <p className="text-sm font-bold text-slate-900">
                Form 26 &amp; e-MB Generation
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Instant export of statutory CPWD/State PWD bill vouchers, deduction schedules, and measurement abstracts.
              </p>
            </div>

            {/* Stat 2 */}
            <div className="p-6 sm:p-8 space-y-2 min-w-0">
              <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tabular-nums tracking-tight">
                99.4%
              </p>
              <p className="text-sm font-bold text-slate-900">
                Billing Arithmetic Accuracy
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Zero rejections caused by chainage overlap, SOR code discrepancies, or tax miscalculations.
              </p>
            </div>

            {/* Stat 3 */}
            <div className="p-6 sm:p-8 space-y-2 min-w-0">
              <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tabular-nums tracking-tight">
                4.2x Faster
              </p>
              <p className="text-sm font-bold text-slate-900">
                RA Bill Certification Turnaround
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Contractors slash their average submission-to-disbursement window from 45 days down to 11 days.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. BOTTOM CONVERSION CTA BANNER (THE ONE DARK SECTION) ── */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0 max-w-full">
          <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-12 shadow-md border border-slate-800 text-center space-y-6 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
              <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Transition from Excel &amp; Physical Measurement Books</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight max-w-2xl mx-auto leading-tight">
              Ready to modernize your civil contracting operations?
            </h2>

            <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Built for highway, building, and irrigation contractors running efficient, dispute-free projects with real-time cash flow visibility.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full sm:w-auto">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 shadow-sm transition-all w-full sm:w-auto"
              >
                Start 7-Day Free Trial
              </Link>
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="inline-flex items-center justify-center px-5 sm:px-6 py-3 rounded-lg text-sm font-semibold text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all w-full sm:w-auto cursor-pointer"
              >
                Schedule Guided Walkthrough
              </button>
            </div>

            <p className="text-xs text-slate-400 pt-2">
              No credit card needed • Fast 1-day onboarding for existing project BOQs • Free data migration assistance
            </p>
          </div>
        </div>
      </section>

      {/* ── 8. FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 py-12 text-xs text-slate-500 min-w-0 max-w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 min-w-0">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 min-w-0">
            {/* Brand Col (2 cols) */}
            <div className="col-span-2 space-y-3 min-w-0">
              <Logo theme="light" href="/" size="sm" />
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                The comprehensive operating system engineered specifically for Indian civil contractors, highway builders, and infra developers.
              </p>
              <p className="text-[11px] text-slate-600 font-medium">
                • Designed for CPWD, PMGSY, and State Works
              </p>
            </div>

            {/* Product Col (1 col) */}
            <div className="space-y-2.5 min-w-0">
              <h4 className="font-bold text-slate-900 text-xs">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-slate-900 transition-colors">Measurement Books (e-MB)</a></li>
                <li><a href="#features" className="hover:text-slate-900 transition-colors">RA Bill Automation</a></li>
                <li><a href="#features" className="hover:text-slate-900 transition-colors">Site Tally &amp; Materials</a></li>
                <li><a href="#features" className="hover:text-slate-900 transition-colors">Subcontractor Logs</a></li>
              </ul>
            </div>

            {/* Solutions Col (1 col) */}
            <div className="space-y-2.5 min-w-0">
              <h4 className="font-bold text-slate-900 text-xs">Solutions</h4>
              <ul className="space-y-2">
                <li><a href="#pipeline" className="hover:text-slate-900 transition-colors">Roads &amp; Highways</a></li>
                <li><a href="#pipeline" className="hover:text-slate-900 transition-colors">Bridges &amp; Flyovers</a></li>
                <li><a href="#pipeline" className="hover:text-slate-900 transition-colors">Urban Water Supply</a></li>
                <li><a href="#pipeline" className="hover:text-slate-900 transition-colors">Commercial EPC</a></li>
              </ul>
            </div>

            {/* Compliance Col (1 col) */}
            <div className="space-y-2.5 min-w-0">
              <h4 className="font-bold text-slate-900 text-xs">Compliance</h4>
              <ul className="space-y-2">
                <li><a href="#statutory" className="hover:text-slate-900 transition-colors">CPWD Specifications</a></li>
                <li><a href="#statutory" className="hover:text-slate-900 transition-colors">State PWD Codes</a></li>
                <li><a href="#statutory" className="hover:text-slate-900 transition-colors">PMGSY Standards</a></li>
                <li><a href="#statutory" className="hover:text-slate-900 transition-colors">NHPC &amp; MORTH Forms</a></li>
              </ul>
            </div>

            {/* Company Col (1 col) */}
            <div className="space-y-2.5 min-w-0">
              <h4 className="font-bold text-slate-900 text-xs">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link></li>
                <li>
                  <button
                    type="button"
                    onClick={() => setContactModalOpen(true)}
                    className="hover:text-slate-900 transition-colors cursor-pointer text-left"
                  >
                    Contact Us
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setContactModalOpen(true)}
                    className="hover:text-slate-900 transition-colors cursor-pointer text-left"
                  >
                    Documentation
                  </button>
                </li>
                <li><Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          {/* Copyright Bottom Bar */}
          <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 min-w-0">
            <p>© 2026 PillarPro Technologies India Pvt. Ltd. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      {walkthroughOpen && (
        <WalkthroughModal
          isOpen={walkthroughOpen}
          onClose={() => setWalkthroughOpen(false)}
          videoUrl={WALKTHROUGH_VIDEO_URL}
        />
      )}

      {/* ── 10. CONTACT MODAL ─────────────────────────────────── */}
      {contactModalOpen && (
        <ContactModal
          isOpen={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
        />
      )}
    </div>
  )
}
