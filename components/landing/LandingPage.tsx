'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

interface LandingPageProps {
  isLoggedIn?: boolean
  userName?: string | null
  orgName?: string | null
}

export function LandingPage({ isLoggedIn, userName, orgName }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null)

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx)
  }

  const faqs = [
    {
      q: 'Is my contracting firm’s financial data completely private and isolated?',
      a: 'Yes, 100%. PillarPro is built with enterprise multi-tenant Row Level Security (RLS). Your projects, RA bills, partner equity splits, and supplier khatas are stored in an isolated, encrypted partition. No other contractor or outside user can ever see your numbers.',
    },
    {
      q: 'Can site supervisors (munshis/engineers) use this on their phones at active job sites?',
      a: 'Absolutely. PillarPro is optimized for mobile browsers. Site supervisors can take photos of diesel fuel receipts with their phone camera for instant AI OCR extraction and mark daily worker attendance directly on site in under 60 seconds.',
    },
    {
      q: 'Can I stop site supervisors from seeing overall tender margins or partner profit shares?',
      a: 'Yes. PillarPro features strict Role-Based Access Control (RBAC). When you assign a user as a Site Supervisor, they can only view and log expenses/attendance for their specific assigned project. Partner drawings, company-wide profits, and central treasury ledgers are strictly restricted to Owners and Partners.',
    },
    {
      q: 'How does the Treasury RA Bill deduction tracker work?',
      a: 'When you log a Running Account (RA) bill, PillarPro calculates the gross certified amount, automatically calculates statutory deductions (5% retention, 2% IT TDS, 2% GST TDS, 1% BOCW labour cess), and compares it against actual net bank credits across multiple payment tranches.',
    },
    {
      q: 'Can I start with a clean slate or test with a sample project?',
      a: 'During sign-up, you can choose either option. If you select "Include sample project template", your workspace is instantly populated with a realistic PWD highway contract, sample RA bill, supplier ledger, and muster roll so you can explore all features immediately.',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* ── Sticky Top Navbar ────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/85 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo theme="dark" href="/" size="md" subtitle="Civil Contractor OS" />
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#command-center" className="hover:text-white transition-colors">Live Preview</a>
            <a href="#comparison" className="hover:text-white transition-colors">Why PillarPro</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-md shadow-blue-600/20 transition-all"
              >
                <span>Dashboard ({userName || orgName || 'Firm'})</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-md shadow-blue-600/25 transition-all"
                >
                  <span>Start Free Trial</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────── */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden">
        {/* Background Glow Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[250px] bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-semibold tracking-wide uppercase mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Built Exclusively for Civil & Highway Contractors
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            The Financial Operating System for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-blue-500">Government Contractors</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Stop leaking profits in spreadsheets. Reconcile PWD, CPWD & PMGSY Running Account (RA) bills against treasury deductions, scan site expense receipts with AI, track Bank Guarantee expiries, and automate daily muster rolls.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-xl shadow-blue-600/30 transition-all"
            >
              <span>Launch Your Contractor Workspace</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <a
              href="#command-center"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 hover:text-white transition-colors"
            >
              <span>Explore Command Center</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              30-Second Self-Serve Setup
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              No Credit Card Required
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Airtight Multi-Tenant Isolation
            </span>
          </div>
        </div>

        {/* ── Command Center Live Preview ───────────────────────── */}
        <div id="command-center" className="mt-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 shadow-2xl shadow-blue-950/40">
            
            {/* Mockup Window Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400">PillarPro Command Center v2.0</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Project Telemetry
              </div>
            </div>

            {/* Active Contract Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 mb-5">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-blue-400">Active Milestone Contract</span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  NH-44 Bypass 4-Lane Widening & Culvert Package (Pkg-02)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">PWD (R&B) National Highway Division • Tender Value: ₹18.50 Cr</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                  Contract Healthy
                </span>
              </div>
            </div>

            {/* Financial Metrics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <span className="text-xs text-slate-400 block font-medium">Gross Certified (RA Bill 01)</span>
                <span className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1 block">₹42,00,000</span>
                <span className="text-[11px] text-blue-400 mt-0.5 block font-mono">Earthwork & Sub-Base</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <span className="text-xs text-slate-400 block font-medium">Statutory Treasury Deductions</span>
                <span className="text-xl sm:text-2xl font-bold text-amber-400 tracking-tight mt-1 block">₹3,35,000</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">5% Retention + TDS + GST + Cess</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <span className="text-xs text-slate-400 block font-medium">Net Bank Credit Received</span>
                <span className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight mt-1 block">₹23,75,000</span>
                <span className="text-[11px] text-emerald-400/80 mt-0.5 block font-mono">Tranche #1 / Treasury Sanction</span>
              </div>
            </div>

            {/* Live Operational Alerts Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Alert 1: BG Warning */}
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  ⚠️
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-200">Bank Guarantee Expiry Alert</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    <strong className="text-white">PBG/HDFC/8912 (₹8.90L)</strong> expires in <span className="text-amber-300 font-bold">24 days</span>. Notice sent to Executive Engineer.
                  </p>
                </div>
              </div>

              {/* Alert 2: AI Receipt Scan */}
              <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  📸
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-200">Mobile AI Receipt OCR</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    Site Supervisor Tariq snapped voucher: <strong className="text-white">Diesel 200L (₹12,500)</strong> auto-posted to JCB ledger.
                  </p>
                </div>
              </div>

              {/* Alert 3: Daily Muster Roll */}
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  👷
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-200">Daily Muster Roll Submitted</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    <strong className="text-white">16 Workers Present</strong>. ₹12,800 wage accrued today, ₹4,000 partial payout disbursed.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Government Compliance Tenders ────────────────────── */}
      <section className="py-12 border-y border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">
            Engineered For Contracts & Tenders Across Indian Government Departments
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-slate-300 font-bold text-sm tracking-wide">
            <span className="px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60">PWD (Roads & Buildings)</span>
            <span className="px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60">CPWD Central Division</span>
            <span className="px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60">PMGSY Rural Roads</span>
            <span className="px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60">NHAI Expressways</span>
            <span className="px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60">Irrigation & Flood Control</span>
          </div>
        </div>
      </section>

      {/* ── The 4 Core Product Pillars ───────────────────────── */}
      <section id="features" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-400">
            Contractor-Grade Architecture
          </h2>
          <h3 className="text-2xl sm:text-4xl font-extrabold text-white mt-2 tracking-tight">
            Everything generic software gets wrong about civil contracting
          </h3>
          <p className="text-sm sm:text-base text-slate-400 mt-4 leading-relaxed">
            Generic ERPs and accounting software treat construction like retail inventory. PillarPro is tailored exclusively for milestone-based infrastructure contracts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
            <div>
              <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-lg mb-4">
                📄
              </div>
              <h4 className="text-base font-bold text-white">Treasury RA Bill & Deductions Engine</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Compare gross certified bills against statutory deductions (5% retention, 2% IT TDS, 2% GST TDS, 1% labour cess) and actual net bank credits across milestone tranches.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] font-semibold text-blue-400">
              Zero variance between treasury sanctions & bank passbook →
            </div>
          </div>

          {/* Feature 2 */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
            <div>
              <div className="h-10 w-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-lg mb-4">
                📱
              </div>
              <h4 className="text-base font-bold text-white">Site-to-Office Mobile AI Receipt OCR</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Field supervisors snap a photo of fuel, cement, or machinery repair slips on their phone. Google Gemini AI extracts vendor, amount, and items directly into the project ledger.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] font-semibold text-indigo-400">
              End lost paper receipts & unaccounted cash →
            </div>
          </div>

          {/* Feature 3 */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
            <div>
              <div className="h-10 w-10 rounded-xl bg-amber-600/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-lg mb-4">
                🛡️
              </div>
              <h4 className="text-base font-bold text-white">Bank Guarantee (BG) Expiry Radar</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Active countdown and automated 30-day alerts for Performance BGs, Mobilization Advances, and EMDs before deadlines to prevent bank encashment and departmental forfeiture.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] font-semibold text-amber-400">
              Protect your working capital & bank limits →
            </div>
          </div>

          {/* Feature 4 */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
            <div>
              <div className="h-10 w-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg mb-4">
                👷
              </div>
              <h4 className="text-base font-bold text-white">Daily-Wage Labor Muster Rolls</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Log daily full/half shifts on site in seconds. Automatically calculates daily wage liability, records partial payouts from cash drawers, and tracks individual laborer khata balances.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] font-semibold text-emerald-400">
              Contract Labour Act compliant records →
            </div>
          </div>

          {/* Feature 5 */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
            <div>
              <div className="h-10 w-10 rounded-xl bg-rose-600/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-lg mb-4">
                ⚖️
              </div>
              <h4 className="text-base font-bold text-white">Partner Capital & Out-of-Pocket Parity</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Maintain 100% transparency between contracting partners. Track who infused working capital, who paid for diesel out-of-pocket, and who withdrew profit distributions.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] font-semibold text-rose-400">
              Eliminate partnership disputes & suspicion →
            </div>
          </div>

          {/* Feature 6 */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
            <div>
              <div className="h-10 w-10 rounded-xl bg-cyan-600/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-lg mb-4">
                🔒
              </div>
              <h4 className="text-base font-bold text-white">Site-Restricted Roles (RBAC)</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Assign junior engineers and site munshis strictly to their active package. They cannot view your tender margins, other projects, or overall partner equity accounts.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] font-semibold text-cyan-400">
              Enterprise confidentiality for contractor staff →
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison Table: PillarPro vs Excel / Tally ────────── */}
      <section id="comparison" className="py-20 bg-slate-900/50 border-t border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              Head-to-Head Comparison
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mt-2 tracking-tight">
              Why Excel and Generic Accounting Leak Contractor Margins
            </h3>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold">
                  <th className="p-4 sm:p-5">Feature / Capability</th>
                  <th className="p-4 sm:p-5 text-blue-400 font-bold bg-blue-500/10">PillarPro OS</th>
                  <th className="p-4 sm:p-5">Excel Spreadsheets</th>
                  <th className="p-4 sm:p-5">Tally / Standard Accounting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-white">Government RA Bill Deductions (Retention, TDS, Cess)</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-semibold bg-blue-500/5">✓ Automated & Reconciled</td>
                  <td className="p-4 sm:p-5 text-slate-400">Manual formula error risk</td>
                  <td className="p-4 sm:p-5 text-slate-400">Not built for civil tranches</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-white">Bank Guarantee & Security Deposit Expiry Alerts</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-semibold bg-blue-500/5">✓ 30-Day Proactive Radar</td>
                  <td className="p-4 sm:p-5 text-rose-400">✗ None (Missed deadlines)</td>
                  <td className="p-4 sm:p-5 text-rose-400">✗ No expiry warning system</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-white">Site Receipt Capture (Fuel, Cement, Hardware)</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-semibold bg-blue-500/5">✓ Mobile AI OCR in 5s</td>
                  <td className="p-4 sm:p-5 text-rose-400">✗ Manual typing into desktop</td>
                  <td className="p-4 sm:p-5 text-rose-400">✗ Manual journal voucher entry</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-white">Daily Labor Muster Roll & Partial Wage Draws</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-semibold bg-blue-500/5">✓ 1-Tap Mobile Muster</td>
                  <td className="p-4 sm:p-5 text-slate-400">Messy paper diary sync</td>
                  <td className="p-4 sm:p-5 text-rose-400">✗ No daily-wage tracking</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-white">Field Supervisor Access Control</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-semibold bg-blue-500/5">✓ Restricted to Assigned Site</td>
                  <td className="p-4 sm:p-5 text-rose-400">✗ None (Full sheet exposed)</td>
                  <td className="p-4 sm:p-5 text-rose-400">✗ Desktop-only installation</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-white">Partner Capital & Drawing Accounts</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-semibold bg-blue-500/5">✓ Automated Parity Ledger</td>
                  <td className="p-4 sm:p-5 text-slate-400">Prone to partner arguments</td>
                  <td className="p-4 sm:p-5 text-slate-400">Requires chartered accountant</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ─────────────────────────────────────── */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-400">
            Frequently Asked Questions
          </h2>
          <h3 className="text-2xl sm:text-3xl font-bold text-white mt-2 tracking-tight">
            Common questions from infrastructure contractors
          </h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left font-semibold text-white flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  <span className={`text-blue-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Final Call To Action ────────────────────────────── */}
      <section className="py-16 md:py-24 border-t border-slate-800/80 bg-gradient-to-b from-slate-950 to-blue-950/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="h-12 w-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xl mx-auto mb-4">
            🏗️
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to take command of your contracting business?
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Join forward-thinking infrastructure contractors simplifying RA bills, protecting working capital, and eliminating spreadsheet chaos.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-xl shadow-blue-600/30 transition-all"
            >
              <span>Launch Your Contractor Workspace Free</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            No credit card required. Isolated private database established in 30 seconds.
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="py-8 pb-24 md:pb-8 border-t border-slate-800 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo theme="dark" size="sm" />
            <span>— The Financial & Operations OS for Infrastructure Contractors</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link href="/sign-in" className="hover:text-slate-300 transition-colors">Sign In</Link>
            <Link href="/sign-up" className="hover:text-slate-300 transition-colors">Create Firm Workspace</Link>
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
            <span className="text-slate-600">© 2026 PillarPro. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* ── Sticky Mobile CTA Bar (Mobile only) ───────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden p-3 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/80 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">PillarPro ERP</p>
            <p className="text-[10px] text-slate-400 truncate">Free trial • No card required</p>
          </div>
          <Link
            href={isLoggedIn ? '/dashboard' : '/sign-up'}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-md shadow-blue-600/30 transition-all shrink-0"
          >
            <span>{isLoggedIn ? 'Dashboard' : 'Launch Workspace'}</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

