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
    card1: { count: '1', val: '₹42.50 L', note: '⏱️ Submitted 6 days ago' },
    card2: { count: '4', val: 'Ch. 14+200', note: 'Sub-grade earthwork verification' },
    card3: { count: '✓', val: '94 Manpower', note: '4 Rollers • 2 Graders on site' },
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
    card1: { count: '2', val: '₹1.15 Cr', note: '⏱️ Avg certification: 9 days' },
    card2: { count: '2', val: 'Ch. 22+800', note: 'DLC / Pavement clearance' },
    card3: { count: '✓', val: '142 Manpower', note: '8 Rollers • 4 Graders on site' },
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
    card1: { count: '3', val: '₹2.40 Cr', note: '⏱️ 96% Certified on schedule' },
    card2: { count: '0', val: 'All Cleared', note: 'Reconciled with MB No. 491' },
    card3: { count: '✓', val: '185 Manpower', note: 'Full plant mobilization' },
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
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* ── 0. TOP INSTITUTIONAL BAR ───────────────────────────── */}
      <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 border-b border-slate-800 tracking-wide font-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate uppercase tracking-wider text-[10.5px]">
              INDIA&apos;S OPERATING SYSTEM FOR GOVERNMENT &amp; EPC INFRASTRUCTURE CONTRACTORS
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-2.5 text-slate-400 shrink-0 text-[10.5px]">
            <span>CPWD Works Manual</span>
            <span>•</span>
            <span>MORTH / IRC</span>
            <span>•</span>
            <span>State PWD Form 26</span>
            <span>•</span>
            <span>Offline Site Sync</span>
          </div>
        </div>
      </div>

      {/* ── 1. MAIN NAVIGATION ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Logo theme="light" href="/" size="sm" />

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Product</a>
            <a href="#pipeline" className="hover:text-blue-600 transition-colors">Solutions</a>
            <a href="#statutory" className="hover:text-blue-600 transition-colors">Compliance</a>
            <Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
            <button
              type="button"
              onClick={() => setContactModalOpen(true)}
              className="hover:text-blue-600 transition-colors"
            >
              Contact
            </button>
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
                  className="hidden sm:inline-flex items-center justify-center border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 rounded-lg px-3.5 py-2 text-xs font-bold transition-all shadow-2xs"
                >
                  Talk to an Engineer
                </button>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-xs font-bold shadow-sm transition-all active:scale-95"
                >
                  Start 7-Day Free Trial
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── 2. HERO SECTION ────────────────────────────────────── */}
      <section className="relative py-12 lg:py-16 bg-slate-50/70 border-b border-slate-200/80 overflow-hidden bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem]">
        {/* Radial fade overlay for legibility */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.65)_100%)] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Content (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold tracking-wide bg-slate-900 text-white shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>BUILT FOR CLASS-I &amp; EPC GOVT CONTRACTORS</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-slate-900 tracking-tight leading-[1.08]">
                Every Contract.<br />
                Every Measurement.<br />
                <span className="text-blue-600">Every Rupee.</span>
              </h1>

              {/* Subheadline */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                The authoritative infrastructure ERP engineered to stop revenue leakage across Running Account (RA) bills, automate L×B×D digital e-MB measurement sheets, enforce statutory recoveries (SD, GST-TDS, Labour Cess, Mobilization), and defend contractual claims under CPWD Works Manual &amp; MORTH IRC protocols.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm active:scale-95 transition-all"
                >
                  Start Free Trial
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

              {/* 3-Column Mini Trust Metric Bar */}
              <div className="border-t border-slate-200 pt-5 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-lg sm:text-xl font-black text-slate-900 tabular-nums tracking-tight">
                    ₹100 Cr+
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                    Tender BOQs Structured
                  </p>
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-black text-slate-900 tabular-nums tracking-tight">
                    100%
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                    CPWD &amp; PWD Form 26 Compliant
                  </p>
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-black text-slate-900 tabular-nums tracking-tight">
                    Zero
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                    Billing Arithmetic Rejections
                  </p>
                </div>
              </div>
            </div>

            {/* Right Multi-Layered ERP Workstation Mockup (7 Cols) */}
            <div className="lg:col-span-7">
              <div className="p-1.5 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800">
                <div className="bg-white rounded-xl overflow-hidden border border-slate-800/80">
                  {/* Top Dark Institutional Bezel / App Bar */}
                  <div className="bg-slate-900 px-4 py-2.5 text-slate-300 flex items-center justify-between gap-3 border-b border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                      </div>
                      <span className="text-xs font-semibold text-slate-300 truncate tracking-tight">
                        PillarPro ERP v2.4 • Division IV Treasury
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded-full shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>e-MB Synced (Offline Ready)</span>
                    </div>
                  </div>

                  {/* App Canvas Preview */}
                  <div className="p-5 sm:p-6 space-y-4 bg-white">
                    {/* Card Title & Timeselector */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          NH
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                              NHAI Package - 4 (Ch. 12+000 to 48+500)
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              Work Fronts Active
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
                    <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            CURRENT CONTRACT POSITION
                          </span>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">
                              {currentMock.contractPosition}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {currentMock.variationsNote}
                            </span>
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          <span>{currentMock.physicalPct} Physically Executed</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: currentMock.physicalPct }}
                        />
                        <div
                          className="bg-blue-600 h-full transition-all duration-300"
                          style={{ width: currentMock.billedPct }}
                        />
                      </div>

                      {/* 5 Stats Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="text-slate-600 block text-[10px] font-medium">Original Value</span>
                          <span className="font-bold text-slate-800 tabular-nums tracking-tight">{currentMock.originalValue}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 block text-[10px] font-medium">Approved Variations</span>
                          <span className="font-bold text-emerald-600 tabular-nums tracking-tight">{currentMock.variations}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 block text-[10px] font-medium">Physical Work</span>
                          <span className="font-bold text-slate-900 tabular-nums tracking-tight">{currentMock.physicalWork}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 block text-[10px] font-medium">Total Billed</span>
                          <span className="font-bold text-blue-600 tabular-nums tracking-tight">{currentMock.totalBilled}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-slate-600 block text-[10px] font-medium">Net Realized</span>
                          <span className="font-bold text-emerald-700 tabular-nums tracking-tight">{currentMock.receivedPaid}</span>
                        </div>
                      </div>
                    </div>

                    {/* 3 Alert Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Card 1 */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600">RA Bills Pending Cert.</span>
                          <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center">
                            {currentMock.card1.count}
                          </span>
                        </div>
                        <p className="text-lg font-black text-slate-900 tabular-nums tracking-tight">{currentMock.card1.val}</p>
                        <p className="text-[10px] font-semibold text-amber-700 flex items-center gap-1">
                          <span>{currentMock.card1.note}</span>
                        </p>
                      </div>

                      {/* Card 2 */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600">Unbilled e-MB Entries</span>
                          <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center">
                            {currentMock.card2.count}
                          </span>
                        </div>
                        <p className="text-lg font-black text-slate-900 tabular-nums tracking-tight">{currentMock.card2.val}</p>
                        <p className="text-[10px] font-semibold text-slate-500">
                          {currentMock.card2.note}
                        </p>
                      </div>

                      {/* Card 3 */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600">Active Site Plant &amp; Labour</span>
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">
                            {currentMock.card3.count}
                          </span>
                        </div>
                        <p className="text-lg font-black text-slate-900 tabular-nums tracking-tight">{currentMock.card3.val}</p>
                        <p className="text-[10px] font-semibold text-slate-500">
                          {currentMock.card3.note}
                        </p>
                      </div>
                    </div>

                    {/* ContractIQ Query Banner */}
                    <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-blue-700 font-bold shrink-0">💬 CONTRACTIQ QUERY:</span>
                        <span className="text-slate-700 truncate font-medium">
                          &quot;Why is RA Bill #12 withholding ₹32.8 Lakhs from our certification?&quot;
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
        </div>
      </section>

      {/* ── 3. DARK INSTITUTIONAL STATUTORY BAR ────────────────── */}
      <section id="statutory" className="bg-slate-900 text-white py-12 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-slate-800 pb-5">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-400">
                STATUTORY &amp; PROCUREMENT ENGINE
              </p>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mt-1">
                Pre-configured for Indian Government Engineering &amp; Treasury Protocols
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Compliant with CPWD Works Manual 2024, State PWD accounts code, and MORTH specifications.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-xl space-y-1">
              <p className="text-xs font-bold text-white tracking-tight">CPWD Works Manual</p>
              <p className="text-[11px] text-slate-300">Clause 7, 10CA, 10CC &amp; EOT</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-xl space-y-1">
              <p className="text-xs font-bold text-white tracking-tight">Form 26 &amp; 24</p>
              <p className="text-[11px] text-slate-300">Standard Running Account Bills</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-xl space-y-1">
              <p className="text-xs font-bold text-white tracking-tight">IS 1200 / e-MB</p>
              <p className="text-[11px] text-slate-300">Chainage &amp; L×B×D Deduction Math</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-xl space-y-1">
              <p className="text-xs font-bold text-white tracking-tight">IRC &amp; MORTH</p>
              <p className="text-[11px] text-slate-300">Highway &amp; Earthwork Tolerances</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-xl space-y-1">
              <p className="text-xs font-bold text-white tracking-tight">Statutory Tax</p>
              <p className="text-[11px] text-slate-300">2% TDS, 2% GST-TDS, 1% BOCW Cess</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-xl space-y-1">
              <p className="text-xs font-bold text-white tracking-tight">BG &amp; EMD Vault</p>
              <p className="text-[11px] text-slate-300">Automated Expiry &amp; Release Alerts</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. SITE-TO-TREASURY EXECUTION PIPELINE ─────────────── */}
      <section id="pipeline" className="bg-white py-14 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              HOW IT WORKS: SITE TO TREASURY PIPELINE
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              From site engineer&apos;s mobile to the bank realization ledger in 4 automated steps
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Eliminate disconnected WhatsApp groups, delayed measurement entries, and handwritten abstracts with an end-to-end audit chain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  Step 01
                </span>
                <span className="text-[11px] font-semibold text-slate-500">Site Engineer</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Chainage Measurements &amp; Diesel Logs
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Punch daily measurements by chainage (L×B×D), capture geo-tagged photo evidence, and log equipment diesel consumption offline on mobile.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Step 02
                </span>
                <span className="text-[11px] font-semibold text-slate-500">Billing Engineer</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Digital e-MB &amp; BOQ Quantity Linkage
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Auto-reconcile field measurements directly with sanctioned BOQ line items, calculate net quantities, and flag excess variations before JE scrutiny.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  Step 03
                </span>
                <span className="text-[11px] font-semibold text-slate-500">Accounts &amp; HO</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Form 26 RA Bill &amp; Statutory Recoveries
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate 1-click Form 26 with automated Security Deposit (5%), GST-TDS (2%), BOCW Cess (1%), and Mobilization Advance schedules.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  Step 04
                </span>
                <span className="text-[11px] font-semibold text-slate-500">Contractor / MD</span>
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
              No generic spreadsheets or consumer task lists. Every calculation respects Indian contractor accounting, tax deduction protocols, and departmental measurement approvals.
            </p>
          </div>

          {/* 2x2 Grid of Feature Cards */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* ── PILLAR 1: CONTRACT & BOQ MASTER ── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-slate-200">
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
              <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <div className="bg-slate-900 text-white px-3.5 py-2 text-xs font-semibold flex items-center justify-between">
                  <span>BOQ Item &amp; Description</span>
                  <span>Tender vs Executed (cum)</span>
                </div>
                <div className="p-3.5 bg-slate-50/90 space-y-3 text-xs">
                  {/* Item 1 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-[11px]">Item 4.04: R.C.C. M-25 in Foundation &amp; Piers</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Within Limit (72.6%)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-slate-600 tabular-nums tracking-tight">
                      <span>Tender: 4,200.00 cum</span>
                      <span>Executed: 3,050.00 cum</span>
                      <span>Rate: ₹6,450 / cum</span>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="space-y-1 pt-2.5 border-t border-slate-200/70">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-[11px]">Item 7.11: Granular Sub-base Course (Grade-II)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Variation Approved (+12.4%)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-slate-600 tabular-nums tracking-tight">
                      <span>Tender: 18,500.00 cum</span>
                      <span>Current: 20,795.00 cum</span>
                      <span className="text-emerald-700 font-bold">Impact: +₹24,12,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PILLAR 2: MEASUREMENTS & DIGITAL E-MB ── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-slate-200">
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
              <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <div className="bg-slate-900 text-white px-3.5 py-2 text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    e-MB Sheet No. 491 • Page 18
                  </span>
                  <span className="text-emerald-300 font-bold text-[11px]">Status: JE Verified</span>
                </div>
                <div className="p-3.5 bg-slate-50/90 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span>Chainage: <strong className="text-slate-900 font-semibold tabular-nums tracking-tight">12+400 to 12+550 (LHS)</strong></span>
                    <span>Structure: <strong className="text-slate-800">Culvert No. 4 Wingwall</strong></span>
                  </div>

                  {/* Math Box */}
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between tabular-nums tracking-tight">
                    <span className="text-slate-600 text-xs">L: 24.50m × B: 3.20m × D: 0.45m</span>
                    <span className="text-sm font-black text-blue-600">35.28 cum</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-600 pt-0.5">
                    <span>GPS: 28.3871° N, 79.4326° E • 11:42 AM</span>
                    <span className="font-semibold text-slate-700">Digital Sign: V. Sharma</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PILLAR 3: RA BILLS & DEDUCTIONS ── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-slate-200">
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
              <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <div className="bg-slate-900 text-white px-3.5 py-2 text-xs font-semibold flex items-center justify-between">
                  <span>Form 26 RA Bill Voucher • Ref: NHAI/4L/RA/03</span>
                  <span className="text-amber-300 font-bold text-[11px]">Due in 3 Days</span>
                </div>
                <div className="p-3.5 bg-slate-50/90 space-y-2 text-xs">
                  <div className="space-y-1 tabular-nums tracking-tight text-[11px]">
                    <div className="flex justify-between text-slate-800 font-semibold">
                      <span>Gross Value of Work Done (A)</span>
                      <span>₹1,15,48,000</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Less: Mobilization Advance Recovery (10%)</span>
                      <span>-₹11,54,800</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Less: Security Deposit / Retention (5%)</span>
                      <span>-₹5,77,400</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Less: Statutory TDS &amp; 1% Labour Cess</span>
                      <span>-₹2,38,600</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Net Payable to Contractor</span>
                    <span className="text-base font-black text-blue-600 tabular-nums tracking-tight">₹95,78,200</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PILLAR 4: SITE OPERATIONS & CONTRACTIQ ASSISTANT ── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-slate-200">
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
              <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <div className="bg-slate-900 text-white px-3.5 py-2 text-xs font-semibold flex items-center justify-between">
                  <span>ContractIQ Dispute &amp; Clause Engine</span>
                  <span className="text-emerald-300 font-bold text-[11px]">Clause Check: Active</span>
                </div>
                <div className="p-3.5 bg-slate-50/90 space-y-2.5 text-xs">
                  {/* 2 Mini Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-600 block font-medium">Today&apos;s Manpower</span>
                      <span className="font-bold text-slate-900 text-xs tabular-nums tracking-tight">84 Labour (4 Gangs)</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-600 block font-medium">Machinery &amp; Diesel</span>
                      <span className="font-bold text-slate-900 text-xs tabular-nums tracking-tight">6 Excavators (420 L)</span>
                    </div>
                  </div>

                  {/* ContractIQ Advisory Card */}
                  <div className="p-3 rounded-xl bg-white border border-blue-200 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11px]">
                      <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                      </svg>
                      <span>ContractIQ Statutory Advisory</span>
                    </div>
                    <p className="text-[11px] text-slate-600 italic leading-relaxed">
                      &quot;Warning: RA Bill #08 has been pending certification for 14 days at the Division Office. As per CPWD Clause 7, you are eligible to claim interest on delayed payment if not certified within 10 days.&quot;
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y md:divide-y-0 md:divide-x divide-slate-200 grid grid-cols-1 md:grid-cols-3">
            {/* Stat 1 */}
            <div className="p-8 space-y-2">
              <p className="text-4xl sm:text-5xl font-black text-slate-900 tabular-nums tracking-tight">
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
            <div className="p-8 space-y-2">
              <p className="text-4xl sm:text-5xl font-black text-slate-900 tabular-nums tracking-tight">
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
            <div className="p-8 space-y-2">
              <p className="text-4xl sm:text-5xl font-black text-slate-900 tabular-nums tracking-tight">
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

      {/* ── 7. BOTTOM CONVERSION CTA BANNER ───────────────────── */}
      <section className="py-16 lg:py-20 bg-slate-100/70">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-800 text-center space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-900/60 text-blue-200 border border-blue-700/60">
              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Seamless Transition from Excel &amp; Physical MBs</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight max-w-2xl mx-auto leading-tight">
              Ready to modernize your civil contracting operations?
            </h2>

            <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Built for highway, building, and irrigation contractors running efficient, dispute-free projects with real-time cash flow visibility.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm active:scale-95 transition-all"
              >
                Start 7-Day Free Trial
              </Link>
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all active:scale-95"
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
      <footer className="bg-white border-t border-slate-200 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            {/* Brand Col (2 cols) */}
            <div className="col-span-2 space-y-3">
              <Logo theme="light" href="/" size="sm" />
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                The comprehensive operating system engineered specifically for Indian civil contractors, highway builders, and infra developers.
              </p>
              <p className="text-[11px] text-blue-600 font-medium">
                • Designed for CPWD, PMGSY, and State Works
              </p>
            </div>

            {/* Product Col (1 col) */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 text-xs">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-blue-600 transition-colors">Measurement Books (e-MB)</a></li>
                <li><a href="#features" className="hover:text-blue-600 transition-colors">RA Bill Automation</a></li>
                <li><a href="#features" className="hover:text-blue-600 transition-colors">Site Tally &amp; Materials</a></li>
                <li><a href="#features" className="hover:text-blue-600 transition-colors">Subcontractor Logs</a></li>
              </ul>
            </div>

            {/* Solutions Col (1 col) */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 text-xs">Solutions</h4>
              <ul className="space-y-2">
                <li><a href="#pipeline" className="hover:text-blue-600 transition-colors">Roads &amp; Highways</a></li>
                <li><a href="#pipeline" className="hover:text-blue-600 transition-colors">Bridges &amp; Flyovers</a></li>
                <li><a href="#pipeline" className="hover:text-blue-600 transition-colors">Urban Water Supply</a></li>
                <li><a href="#pipeline" className="hover:text-blue-600 transition-colors">Commercial EPC</a></li>
              </ul>
            </div>

            {/* Compliance Col (1 col) */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 text-xs">Compliance</h4>
              <ul className="space-y-2">
                <li><a href="#statutory" className="hover:text-blue-600 transition-colors">CPWD Specifications</a></li>
                <li><a href="#statutory" className="hover:text-blue-600 transition-colors">State PWD Codes</a></li>
                <li><a href="#statutory" className="hover:text-blue-600 transition-colors">PMGSY Standards</a></li>
                <li><a href="#statutory" className="hover:text-blue-600 transition-colors">NHPC &amp; MORTH Forms</a></li>
              </ul>
            </div>

            {/* Company Col (1 col) */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 text-xs">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link></li>
                <li>
                  <button
                    type="button"
                    onClick={() => setContactModalOpen(true)}
                    className="hover:text-blue-600 transition-colors cursor-pointer text-left"
                  >
                    Contact Us
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setContactModalOpen(true)}
                    className="hover:text-blue-600 transition-colors cursor-pointer text-left"
                  >
                    Documentation
                  </button>
                </li>
                <li><Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          {/* Copyright Bottom Bar */}
          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-600">
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
