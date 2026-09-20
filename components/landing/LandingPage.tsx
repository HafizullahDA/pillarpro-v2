'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

// ── Monochrome Lucide-style SVG Wireframe Icons ────────────────
function IconFileText({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  )
}

function IconCamera({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function IconShieldAlert({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4M12 16h.01" />
    </svg>
  )
}

function IconUsers({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function IconScale({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 16l3-8 3 8a4.2 4.2 0 01-6 0zM2 16l3-8 3 8a4.2 4.2 0 01-6 0zM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  )
}

function IconLock({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}

function IconBuilding({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
    </svg>
  )
}

function IconCheck({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconX({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconChevronDown({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function IconArrowRight({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  )
}

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
    <div className="min-h-screen bg-[#0B0F17] text-slate-200 font-sans selection:bg-blue-700 selection:text-white antialiased">
      {/* ── Accessible Skip to Main Content Link ────────────── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-700 focus:text-white focus:rounded-md focus:outline-none focus:ring-1 focus:ring-white text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* ── Top Architectural Navbar ────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0B0F17] border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo theme="dark" href="/" size="md" subtitle="Civil Contractor OS" />
          </div>

          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <a href="#features" className="hover:text-slate-100 transition-colors">Features</a>
            <a href="#project-ledger" className="hover:text-slate-100 transition-colors">Active Project Ledger</a>
            <a href="#comparison" className="hover:text-slate-100 transition-colors">Audit Comparison</a>
            <a href="#faq" className="hover:text-slate-100 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold text-white bg-blue-700 hover:bg-blue-600 border border-blue-600 transition-colors"
              >
                <span>Dashboard ({userName || orgName || 'Firm'})</span>
                <IconArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold text-white bg-blue-700 hover:bg-blue-600 border border-blue-600 transition-colors"
                >
                  <span>Start Free Trial</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content Landmark ────────────────────────────── */}
      <main id="main-content">
        {/* ── Hero Section (Flat Architectural Field Slate) ────── */}
        <section className="pt-16 pb-16 md:pt-20 md:pb-24 border-b border-slate-800 bg-[#0F172A]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Architectural System Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#111827] border border-slate-700 text-slate-300 text-xs font-mono tracking-wide uppercase mb-6">
              <span className="h-2 w-2 rounded-sm bg-blue-500" />
              CIVIL CONTRACTING ERP • MILITARY-GRADE AUDIT TRAIL
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              The Financial Operating System for Government Contractors
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
              Stop leaking profits in spreadsheets. Reconcile PWD, CPWD, NHPC & PMGSY Running Account (RA) bills against treasury deductions, scan site expense receipts with AI, track Bank Guarantee expiries, and automate daily muster rolls.
            </p>

            {/* Flat Industrial CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-600 border border-blue-600 transition-colors"
              >
                <span>Launch Contractor Workspace</span>
                <IconArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#project-ledger"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md text-xs font-bold uppercase tracking-wider text-slate-300 bg-[#111827] border border-slate-700 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <span>View Active Project Ledger</span>
                <IconChevronDown className="w-4 h-4 text-slate-400" />
              </a>
            </div>

            {/* Architectural Trust Points */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5 text-slate-300" />
                30-Second Self-Serve Setup
              </span>
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5 text-slate-300" />
                No Credit Card Required
              </span>
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5 text-slate-300" />
                PostgreSQL Row-Level Security Isolation
              </span>
            </div>
          </div>
        </section>

        {/* ── Active Project Ledger Live Preview ─────────────── */}
        <section id="project-ledger" className="py-14 bg-[#0B0F17] border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 sm:p-6">
              
              {/* Ledger Terminal Bar */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-slate-700" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-slate-700" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-slate-700" />
                  </div>
                  <span className="ml-2 text-xs font-mono font-medium text-slate-300 tracking-wider">
                    PillarPro ERP: Active Project Ledger
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-sm bg-slate-900 border border-slate-700 text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  LIVE TELEMETRY • ACTIVE
                </div>
              </div>

              {/* Active Contract Info Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0B0F17] p-4 rounded-md border border-slate-800 mb-5">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-400">
                    Active Milestone Contract
                  </span>
                  <p className="text-base sm:text-lg font-bold text-white mt-0.5 tracking-tight">
                    NH-44 Bypass 4-Lane Widening & Culvert Package (Pkg-02)
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    PWD (R&B) / NHPC / CPWD National Highway Division • Tender Value: ₹18.50 Cr
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-800 px-2.5 py-1 rounded-sm">
                    Status: RA Bill 01 Certified
                  </span>
                </div>
              </div>

              {/* Financial Metrics Architectural Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="p-4 rounded-md bg-[#0B0F17] border border-slate-800">
                  <span className="text-xs text-slate-400 block font-mono uppercase tracking-wider">Gross Certified (RA Bill 01)</span>
                  <span className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tight mt-1 block">₹42,00,000</span>
                  <span className="text-[11px] text-slate-400 mt-1 block font-mono">Earthwork & Sub-Base Tranche</span>
                </div>

                <div className="p-4 rounded-md bg-[#0B0F17] border border-slate-800">
                  <span className="text-xs text-slate-400 block font-mono uppercase tracking-wider">Statutory Deductions</span>
                  <span className="text-xl sm:text-2xl font-mono font-bold text-amber-400 tracking-tight mt-1 block">₹3,35,000</span>
                  <span className="text-[11px] text-slate-400 mt-1 block font-mono">5% Retention + IT TDS + GST TDS + Cess</span>
                </div>

                <div className="p-4 rounded-md bg-[#0B0F17] border border-slate-800">
                  <span className="text-xs text-slate-400 block font-mono uppercase tracking-wider">Net Bank Credit Received</span>
                  <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 tracking-tight mt-1 block">₹23,75,000</span>
                  <span className="text-[11px] text-emerald-400/80 mt-1 block font-mono">Tranche #1 / Treasury Sanction</span>
                </div>
              </div>

              {/* Strict Wireframe Operational Alerts Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Alert 1: BG Warning */}
                <div className="p-3.5 rounded-md border border-slate-800 bg-[#0B0F17] flex items-start gap-3">
                  <div className="h-8 w-8 rounded-md bg-slate-900 border border-slate-700 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <IconShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Bank Guarantee Expiry Alert</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      <strong className="text-slate-200">PBG/HDFC/8912 (₹8.90L)</strong> expires in <span className="text-amber-400 font-mono font-semibold">24 days</span>. Notice sent to Executive Engineer.
                    </p>
                  </div>
                </div>

                {/* Alert 2: AI Receipt Scan */}
                <div className="p-3.5 rounded-md border border-slate-800 bg-[#0B0F17] flex items-start gap-3">
                  <div className="h-8 w-8 rounded-md bg-slate-900 border border-slate-700 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <IconCamera className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Mobile AI Receipt OCR</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Site Supervisor Tariq logged voucher: <strong className="text-slate-200">Diesel 200L (₹12,500)</strong> auto-posted to JCB ledger.
                    </p>
                  </div>
                </div>

                {/* Alert 3: Daily Muster Roll */}
                <div className="p-3.5 rounded-md border border-slate-800 bg-[#0B0F17] flex items-start gap-3">
                  <div className="h-8 w-8 rounded-md bg-slate-900 border border-slate-700 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <IconUsers className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Daily Muster Roll Submitted</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      <strong className="text-slate-200">16 Workers Present</strong>. ₹12,800 wage accrued today, ₹4,000 partial payout disbursed.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Government Compliance Tenders Blueprint Grid ────── */}
        <section className="py-10 border-b border-slate-800 bg-[#0F172A]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-slate-400 mb-5">
              Engineered For Contracts & Tenders Across Indian Government Departments
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-slate-300 font-mono text-xs font-medium">
              <span className="p-2.5 rounded-md bg-[#111827] border border-slate-800 text-center">PWD (R&B)</span>
              <span className="p-2.5 rounded-md bg-[#111827] border border-slate-800 text-center">CPWD Central</span>
              <span className="p-2.5 rounded-md bg-[#111827] border border-slate-800 text-center">NHPC Hydro</span>
              <span className="p-2.5 rounded-md bg-[#111827] border border-slate-800 text-center">PMGSY Roads</span>
              <span className="p-2.5 rounded-md bg-[#111827] border border-slate-800 text-center">NHAI Highways</span>
              <span className="p-2.5 rounded-md bg-[#111827] border border-slate-800 text-center">Irrigation & Flood</span>
            </div>
          </div>
        </section>

        {/* ── Core Architectural Product Pillars ─────────────── */}
        <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-slate-400">
              [SYSTEM CAPABILITIES]
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mt-2 tracking-tight">
              Contractor-Grade Infrastructure Accounting
            </h3>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Generic ERPs and accounting software treat construction like retail inventory. PillarPro is tailored exclusively for milestone-based civil contracting and statutory treasury reconciliations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Feature 1 */}
            <div className="rounded-lg bg-[#111827] border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div>
                <div className="h-9 w-9 rounded-md bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center mb-4">
                  <IconFileText className="w-4 h-4" />
                </div>
                <h4 className="text-base font-bold text-white tracking-tight">Treasury RA Bill & Deductions Engine</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Compare gross certified bills against statutory deductions (5% retention, 2% IT TDS, 2% GST TDS, 1% labour cess) and actual net bank credits across milestone tranches.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                Zero variance between treasury sanctions & bank credit
              </div>
            </div>

            {/* Feature 2 */}
            <div className="rounded-lg bg-[#111827] border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div>
                <div className="h-9 w-9 rounded-md bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center mb-4">
                  <IconCamera className="w-4 h-4" />
                </div>
                <h4 className="text-base font-bold text-white tracking-tight">Site-to-Office Mobile AI Receipt OCR</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Field supervisors snap a photo of fuel, cement, or machinery repair slips on their phone. Google Gemini AI extracts vendor, amount, and items directly into the project ledger.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                End lost paper receipts & unaccounted cash outlays
              </div>
            </div>

            {/* Feature 3 */}
            <div className="rounded-lg bg-[#111827] border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div>
                <div className="h-9 w-9 rounded-md bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center mb-4">
                  <IconShieldAlert className="w-4 h-4" />
                </div>
                <h4 className="text-base font-bold text-white tracking-tight">Bank Guarantee (BG) Expiry Radar</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Active countdown and automated 30-day alerts for Performance BGs, Mobilization Advances, and EMDs before deadlines to prevent bank encashment and departmental forfeiture.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                Protect working capital & bank credit limits
              </div>
            </div>

            {/* Feature 4 */}
            <div className="rounded-lg bg-[#111827] border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div>
                <div className="h-9 w-9 rounded-md bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center mb-4">
                  <IconUsers className="w-4 h-4" />
                </div>
                <h4 className="text-base font-bold text-white tracking-tight">Daily-Wage Labor Muster Rolls</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Log daily full/half shifts on site in seconds. Automatically calculates daily wage liability, records partial payouts from cash drawers, and tracks individual laborer khata balances.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                Contract Labour Act compliant field records
              </div>
            </div>

            {/* Feature 5 */}
            <div className="rounded-lg bg-[#111827] border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div>
                <div className="h-9 w-9 rounded-md bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center mb-4">
                  <IconScale className="w-4 h-4" />
                </div>
                <h4 className="text-base font-bold text-white tracking-tight">Partner Capital & Out-of-Pocket Parity</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Maintain 100% transparency between contracting partners. Track who infused working capital, who paid for diesel out-of-pocket, and who withdrew profit distributions.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                Eliminate partnership disputes & suspicion
              </div>
            </div>

            {/* Feature 6 */}
            <div className="rounded-lg bg-[#111827] border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div>
                <div className="h-9 w-9 rounded-md bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center mb-4">
                  <IconLock className="w-4 h-4" />
                </div>
                <h4 className="text-base font-bold text-white tracking-tight">Site-Restricted Roles (RBAC)</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Assign junior engineers and site munshis strictly to their active package. They cannot view your tender margins, other projects, or overall partner equity accounts.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                Enterprise confidentiality for contractor staff
              </div>
            </div>
          </div>
        </section>

        {/* ── Comparison Table: PillarPro vs Excel / Tally ────────── */}
        <section id="comparison" className="py-16 bg-[#0F172A] border-t border-slate-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-slate-400">
                [AUDIT SCHEDULE SPECIFICATION]
              </h2>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mt-2 tracking-tight">
                Architectural Workflow vs Generic Spreadsheets
              </h3>
            </div>

            <div className="overflow-x-auto rounded-md border border-slate-800 bg-[#111827]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0B0F17] text-slate-300 font-mono uppercase tracking-wider text-[11px]">
                    <th scope="col" className="p-4">Feature / Audit Capability</th>
                    <th scope="col" className="p-4 text-white font-bold bg-slate-800/60 border-x border-slate-700">PillarPro ERP</th>
                    <th scope="col" className="p-4">Excel Spreadsheets</th>
                    <th scope="col" className="p-4">Tally / Standard Accounting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  <tr>
                    <th scope="row" className="p-4 font-medium text-slate-200 text-left font-sans">Government RA Bill Deductions (Retention, TDS, Cess)</th>
                    <td className="p-4 text-emerald-400 font-mono font-semibold bg-slate-800/30 border-x border-slate-700 flex items-center gap-1.5">
                      <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Automated & Reconciled
                    </td>
                    <td className="p-4 text-slate-400">Manual formula error risk</td>
                    <td className="p-4 text-slate-400">Not built for civil tranches</td>
                  </tr>
                  <tr>
                    <th scope="row" className="p-4 font-medium text-slate-200 text-left font-sans">Bank Guarantee & Security Deposit Expiry Alerts</th>
                    <td className="p-4 text-emerald-400 font-mono font-semibold bg-slate-800/30 border-x border-slate-700 flex items-center gap-1.5">
                      <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                      30-Day Proactive Radar
                    </td>
                    <td className="p-4 text-rose-400/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      None (Missed deadlines)
                    </td>
                    <td className="p-4 text-rose-400/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      No expiry warning system
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="p-4 font-medium text-slate-200 text-left font-sans">Site Receipt Capture (Fuel, Cement, Hardware)</th>
                    <td className="p-4 text-emerald-400 font-mono font-semibold bg-slate-800/30 border-x border-slate-700 flex items-center gap-1.5">
                      <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Mobile AI OCR in 5s
                    </td>
                    <td className="p-4 text-rose-400/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      Manual typing into desktop
                    </td>
                    <td className="p-4 text-rose-400/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      Manual journal voucher entry
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="p-4 font-medium text-slate-200 text-left font-sans">Daily Labor Muster Roll & Partial Wage Draws</th>
                    <td className="p-4 text-emerald-400 font-mono font-semibold bg-slate-800/30 border-x border-slate-700 flex items-center gap-1.5">
                      <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                      1-Tap Mobile Muster
                    </td>
                    <td className="p-4 text-slate-400">Messy paper diary sync</td>
                    <td className="p-4 text-rose-400/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      No daily-wage tracking
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="p-4 font-medium text-slate-200 text-left font-sans">Field Supervisor Access Control</th>
                    <td className="p-4 text-emerald-400 font-mono font-semibold bg-slate-800/30 border-x border-slate-700 flex items-center gap-1.5">
                      <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Restricted to Assigned Site
                    </td>
                    <td className="p-4 text-rose-400/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      None (Full sheet exposed)
                    </td>
                    <td className="p-4 text-rose-400/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      Desktop-only installation
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="p-4 font-medium text-slate-200 text-left font-sans">Partner Capital & Drawing Accounts</th>
                    <td className="p-4 text-emerald-400 font-mono font-semibold bg-slate-800/30 border-x border-slate-700 flex items-center gap-1.5">
                      <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Automated Parity Ledger
                    </td>
                    <td className="p-4 text-slate-400">Prone to partner arguments</td>
                    <td className="p-4 text-slate-400">Requires chartered accountant</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQ Section ─────────────────────────────────────── */}
        <section id="faq" className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-slate-400">
              [TECHNICAL INQUIRIES]
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mt-2 tracking-tight">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="space-y-2.5">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx
              return (
                <div
                  key={idx}
                  className="rounded-md border border-slate-800 bg-[#111827] overflow-hidden"
                >
                  <button
                    type="button"
                    id={`faq-btn-${idx}`}
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${idx}`}
                    className="w-full p-4 sm:p-5 text-left font-semibold text-slate-100 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                  >
                    <span className="text-sm">{faq.q}</span>
                    <span
                      aria-hidden="true"
                      className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    >
                      <IconChevronDown className="w-4 h-4" />
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      id={`faq-answer-${idx}`}
                      role="region"
                      aria-labelledby={`faq-btn-${idx}`}
                      className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/70 pt-3"
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Final Architectural Call To Action ──────────────── */}
        <section className="py-16 md:py-20 border-t border-slate-800 bg-[#0F172A]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="h-10 w-10 rounded-md bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
              <IconBuilding className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Ready to take command of your contracting business?
            </h2>
            <p className="mt-3 text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Join forward-thinking infrastructure contractors simplifying RA bills, protecting working capital, and eliminating spreadsheet chaos.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-600 border border-blue-600 transition-colors"
              >
                <span>Launch Your Contractor Workspace Free</span>
                <IconArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <p className="mt-4 text-xs font-mono text-slate-400">
              No credit card required. Multi-tenant database partition provisioned in 30 seconds.
            </p>
          </div>
        </section>
      </main>

      {/* ── JSON-LD Structured Data (Agentic & Search Optimization) ─ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'PillarPro',
            operatingSystem: 'Any',
            applicationCategory: 'BusinessApplication',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'INR',
            },
            description:
              'The Financial & Operations Operating System built specifically for civil infrastructure contractors. RA Billing, statutory deductions, supplier khatas, and site muster rolls.',
          }),
        }}
      />

      {/* ── Architectural Field Slate Footer ─────────────────── */}
      <footer className="py-8 pb-24 md:pb-8 border-t border-slate-800 bg-[#0B0F17] text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo theme="dark" size="sm" href="/" />
            <span className="text-slate-400 font-mono text-[11px]">— Financial & Operations OS for Infrastructure Contractors</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-mono text-[11px]">
            <Link href="/sign-in" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/sign-up" className="hover:text-white transition-colors">Create Firm Workspace</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <span className="text-slate-500">© 2026 PillarPro. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* ── Sticky Mobile CTA Bar (Mobile only) ───────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden p-3 bg-[#0B0F17] border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate font-mono">PillarPro ERP</p>
            <p className="text-[10px] text-slate-400 truncate font-mono">Active Project Ledger</p>
          </div>
          <Link
            href={isLoggedIn ? '/dashboard' : '/sign-up'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-600 border border-blue-600 transition-colors shrink-0"
          >
            <span>{isLoggedIn ? 'Dashboard' : 'Launch'}</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

