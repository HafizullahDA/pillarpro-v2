'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

// ── Monochrome Minimal SVG Icons ───────────────────────────────
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

function IconClock({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconCheck({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25} aria-hidden="true">
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

export function LandingPage({
  isLoggedIn = false,
  userName,
  orgName,
}: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(0)
  const [previewTab, setPreviewTab] = useState<'ra_bills' | 'clause5' | 'ocr' | 'pbg'>('ra_bills')
  const [calcBillAmount, setCalcBillAmount] = useState<number>(5000000) // Default ₹50 Lakhs
  const [calcContractorType, setCalcContractorType] = useState<'individual_proprietor' | 'company_firm'>('company_firm')
  const [calcRetentionRate, setCalcRetentionRate] = useState<number>(5)
  const [calcMode, setCalcMode] = useState<'auto' | 'manual'>('auto')

  // Manual override states
  const [manualRetention, setManualRetention] = useState('')
  const [manualItTds, setManualItTds] = useState('')
  const [manualGstTds, setManualGstTds] = useState('')
  const [manualLabourCess, setManualLabourCess] = useState('')
  const [manualRoyalty, setManualRoyalty] = useState('')
  const [manualTesting, setManualTesting] = useState('')

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx)
  }

  // Statutory calculation values
  const itTdsRate = calcContractorType === 'individual_proprietor' ? 0.01 : 0.02
  const autoRetention = Math.round(calcBillAmount * (calcRetentionRate / 100))
  const autoItTds = Math.round(calcBillAmount * itTdsRate)
  const autoGstTds = Math.round(calcBillAmount * 0.02)
  const autoLabourCess = Math.round(calcBillAmount * 0.01)

  const retention = calcMode === 'manual' ? (parseFloat(manualRetention) || 0) : autoRetention
  const itTds = calcMode === 'manual' ? (parseFloat(manualItTds) || 0) : autoItTds
  const gstTds = calcMode === 'manual' ? (parseFloat(manualGstTds) || 0) : autoGstTds
  const labourCess = calcMode === 'manual' ? (parseFloat(manualLabourCess) || 0) : autoLabourCess
  const royalty = calcMode === 'manual' ? (parseFloat(manualRoyalty) || 0) : 0
  const testing = calcMode === 'manual' ? (parseFloat(manualTesting) || 0) : 0

  const totalDeductions = retention + itTds + gstTds + labourCess + royalty + testing
  const netDisbursed = Math.max(0, calcBillAmount - totalDeductions)
  const totalDeductionsPct = calcBillAmount > 0 ? ((totalDeductions / calcBillAmount) * 100).toFixed(1) : '0.0'

  const faqs = [
    {
      q: 'How does PillarPro reconcile payments across different government agencies?',
      a: 'PillarPro is specifically calibrated for Indian civil agency disbursement pathways. For CPWD and Central Ministry tenders, it reconciles accounts audited by the Accounts Branch and credited via PFMS (Public Financial Management System). For PSUs like NHPC, NTPC, and NHAI, it reconciles milestone payments released by internal corporate finance departments. For State PWD (R&B), PMGSY, and Irrigation departments, it tracks State Treasury sanction vouchers and Letters of Credit (LoC).',
    },
    {
      q: 'How are statutory deductions tracked across multiple payment tranches?',
      a: 'When an RA Bill is logged, PillarPro automatically applies statutory rates based on your entity constitution and contract agreement: IT TDS under Section 194C (1% for Proprietorships/Individuals or 2% for Companies/LLPs), GST TDS under Section 51 (2% on taxable contracts > ₹2.5L), 1% BOCW Labour Welfare Cess, and contractual Security Deposit / Retention (customizable 0% to 10%, commonly 2.5% or 5%). Contractors can also manually input or override exact deduction figures and add departmental recoveries (Mineral Royalty, QC Testing, Water/Electricity, Mobilization Advance). When the department releases split payment tranches over weeks or months, each bank credit is logged against the bill with actual deducted amounts until the net payable balance reconciles to zero variance.',
    },
    {
      q: 'How does the Bank Guarantee (BG) and EMD radar protect our firm?',
      a: 'Government tenders require Performance Bank Guarantees (PBG), Mobilization Advances, and Earnest Money Deposits (EMD) that lock your cash limits. PillarPro maintains an active radar showing days-to-expiry with 30-day alerts. Once a package is certified, it prompts you to claim the original BG from the Executive Engineer’s division so you can surrender it to your bank and stop recurring quarterly commission charges.',
    },
    {
      q: 'Can our site supervisors (munshis/engineers) use this on phones under direct sunlight?',
      a: 'Yes. PillarPro is built with a high-contrast architectural slate layout designed specifically for readability on mobile screens in harsh outdoor daylight on active road, bridge, and building sites. Supervisors can snap photos of cement, fuel, and repair slips for AI OCR extraction, record itemized carriage/transport charges, and log daily worker muster rolls with full offline support.',
    },
    {
      q: 'How does PillarPro prevent partner disputes in joint ventures?',
      a: 'In Indian civil contracting partnerships, partners frequently pay for diesel, materials, or labour out of their personal bank accounts or cash drawers. PillarPro features a Partner Equity & Parity Ledger that tracks every out-of-pocket contribution and cash drawing, automatically calculating net profit sharing and capital balances to eliminate year-end disputes.',
    },
    {
      q: 'Can site supervisors see our firm’s profit margins or other project financials?',
      a: 'Never. PillarPro enforces strict Role-Based Access Control (RBAC). Site Supervisors are strictly siloed to their assigned project and cannot see tender margins, company-wide profits, partner drawings, or other contracts. Full financial transparency is reserved exclusively for Owners and Managing Partners.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F2F7FF] via-[#F8FAFC] to-[#F1F5FD] text-slate-900 font-sans antialiased relative selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* ── Apple/Atlassian Ambient Vibrant Mesh Glows ───────── */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[420px] bg-gradient-to-tr from-blue-500/18 via-indigo-500/12 to-sky-400/10 blur-[130px] rounded-full pointer-events-none animate-float-slow" />
      <div className="absolute top-48 -right-28 w-[450px] h-[450px] bg-amber-400/10 blur-[140px] rounded-full pointer-events-none animate-pulse-subtle" />
      <div className="absolute top-[820px] -left-32 w-[500px] h-[500px] bg-emerald-400/10 blur-[140px] rounded-full pointer-events-none" />

      {/* ── Subtle Blue-Tinted Micro-Grid Overlay ────────────── */}
      <div className="absolute inset-0 bg-enterprise-grid [mask-image:radial-gradient(ellipse_75%_55%_at_50%_0%,#000_70%,transparent_100%)] opacity-80 pointer-events-none" />

      {/* ── Skip to Main Content Link ───────────────────────── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-md text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* ── Top Apple-Grade Frosted Glass Navbar ─────────────── */}
      <header className="sticky top-0 z-50 bg-white/75 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_12px_rgba(0,0,0,0.03)] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo theme="light" href="/" size="md" subtitle="Civil Contractor OS" />
          </div>

          <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#audit-preview" className="hover:text-blue-600 transition-colors">Bill Audit Preview</a>
            <a href="#calculator" className="hover:text-blue-600 transition-colors">Deduction Calculator</a>
            <a href="#suite" className="hover:text-blue-600 transition-colors">Contractor Suite</a>
            <a href="#specification" className="hover:text-blue-600 transition-colors">Audit Comparison</a>
            <Link href="/pricing" className="text-slate-900 font-bold hover:text-blue-600 transition-colors">Pricing</Link>
            <a href="#faq" className="hover:text-blue-600 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all"
              >
                <span>Dashboard ({userName || orgName || 'Firm'})</span>
                <IconArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all"
                >
                  <span>Start Free Trial</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main id="main-content" className="relative z-10">
        {/* ── Hero Section (Apple Typography & Vibrant Sheen) ─── */}
        <section className="relative pt-12 pb-14 md:pt-20 md:pb-22 border-b border-slate-200/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            
            {/* Government Department Channels Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-blue-200/80 text-slate-800 text-xs font-semibold tracking-wide mb-6 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all cursor-default">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
              <span className="font-semibold text-slate-700">CPWD (PFMS)</span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-slate-700">NHPC &amp; PSUs</span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-slate-700">STATE PWD &amp; PMGSY</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.1]">
              The Financial &amp; Operational OS{' '}
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-900 bg-clip-text text-transparent">
                for Indian Civil Contractors
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
              Built specifically for infrastructure and public works contractors. Reconcile multi-crore RA bills against statutory deductions (5% Retention, Sec 194C TDS, GST TDS, Labour Cess), shield your firm against <strong className="text-slate-900 font-semibold">10% Liquidated Damages under CPWD GCC Clause 5</strong>, scan field fuel slips with <strong className="text-slate-900 font-semibold">PillarVision™ Optical Intelligence</strong>, and run your daily muster rolls and machinery logs in one unified workspace.
            </p>

            {/* Action Buttons (Apple/Atlassian styled) */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 hover:-translate-y-0.5 transition-all"
              >
                <span>Launch Firm Workspace Free</span>
                <IconArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#audit-preview"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 bg-white/80 hover:bg-white backdrop-blur-md border border-slate-300/80 hover:border-slate-400 shadow-xs hover:shadow-sm hover:-translate-y-0.5 transition-all"
              >
                <span>Explore Interactive Showcase</span>
                <IconChevronDown className="w-4 h-4 text-slate-500" />
              </a>
            </div>

            {/* Contractor Credibility Badges */}
            <div className="mt-9 flex flex-wrap items-center justify-center gap-y-2.5 gap-x-8 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 backdrop-blur-sm border border-slate-200/80 shadow-2xs">
                <IconCheck className="w-4 h-4 text-emerald-600" />
                Built for Class-A &amp; Prime Civil Contractors
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 backdrop-blur-sm border border-slate-200/80 shadow-2xs">
                <IconCheck className="w-4 h-4 text-blue-600" />
                All 6 Primary Site &amp; Office Books
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 backdrop-blur-sm border border-slate-200/80 shadow-2xs">
                <IconCheck className="w-4 h-4 text-indigo-600" />
                Multi-Tenant Encrypted RLS Isolation
              </span>
            </div>
          </div>
        </section>

        {/* ── High-Impact 4-Way Interactive Feature Showcase ──── */}
        <section id="audit-preview" className="py-14 md:py-20 border-b border-slate-200/80 relative">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/80">
                Live Interactive System
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                Inspect Real Contractor Command Screens
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
                Toggle between the core modules that safeguard government contractor cash flow &amp; contract claims:
              </p>
            </div>

            {/* Atlassian-Style Tab Switcher Buttons */}
            <div className="flex overflow-x-auto no-scrollbar gap-1.5 p-1.5 bg-slate-200/70 backdrop-blur-md rounded-2xl mb-6 text-xs font-semibold max-w-3xl mx-auto shadow-inner border border-slate-300/40">
              <button
                type="button"
                onClick={() => setPreviewTab('ra_bills')}
                className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl transition-all text-center flex items-center justify-center gap-2 ${
                  previewTab === 'ra_bills'
                    ? 'bg-white text-blue-700 shadow-sm font-bold scale-[1.01]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <IconFileText className="w-4 h-4 text-blue-600" />
                <span>RA Bill Audit</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('clause5')}
                className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl transition-all text-center flex items-center justify-center gap-2 ${
                  previewTab === 'clause5'
                    ? 'bg-white text-amber-800 shadow-sm font-bold scale-[1.01]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <IconShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Clause 5 LD Shield</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('ocr')}
                className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl transition-all text-center flex items-center justify-center gap-2 ${
                  previewTab === 'ocr'
                    ? 'bg-white text-emerald-800 shadow-sm font-bold scale-[1.01]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <IconCamera className="w-4 h-4 text-emerald-600" />
                <span>PillarVision™ Scanner</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('pbg')}
                className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl transition-all text-center flex items-center justify-center gap-2 ${
                  previewTab === 'pbg'
                    ? 'bg-white text-rose-800 shadow-sm font-bold scale-[1.01]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <IconClock className="w-4 h-4 text-rose-600" />
                <span>PBG &amp; EMD Radar</span>
              </button>
            </div>

            {/* Apple/Atlassian Glass Showcase Viewport */}
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl shadow-[0_12px_40px_rgb(0,0,0,0.05)] overflow-hidden transition-all duration-300">
              
              {/* TAB 1: RA BILL AUDIT */}
              {previewTab === 'ra_bills' && (
                <div>
                  <div className="px-6 py-4.5 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
                          Module 01 • Government RA Bill Audit
                        </span>
                        <span className="text-[11px] text-slate-400">MB-142 e-Record</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                        NH-44 Bypass 4-Lane Widening &amp; Culvert Package (Pkg-02)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Agency: PWD (R&amp;B) Division / CPWD (PFMS) / NHPC • Agreement Value: ₹18.50 Cr
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                        ✓ RA Bill 01 Reconciled
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200/80">
                    <div className="p-6 bg-gradient-to-br from-white to-blue-50/25 hover:bg-blue-50/40 transition-colors duration-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Work Certified</p>
                      <p className="text-2xl font-black text-slate-900 mt-1.5 tabular-nums">₹42,00,000</p>
                      <p className="text-xs text-slate-500 mt-1">Abstract of Measurements (MB 142)</p>
                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                        <div className="flex justify-between">
                          <span>Earthwork Excavation:</span>
                          <span className="font-semibold text-slate-900">₹18,50,000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sub-Base &amp; RCC Culverts:</span>
                          <span className="font-semibold text-slate-900">₹23,50,000</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-white to-rose-50/35 hover:bg-rose-50/50 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Statutory Deductions (10%)</p>
                        <span className="text-xs font-bold text-rose-700">-₹4,20,000</span>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-700">
                          <span>Security Deposit (5% Retention):</span>
                          <span className="font-mono font-medium text-slate-900">₹2,10,000</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Income Tax TDS (2% u/s 194C):</span>
                          <span className="font-mono font-medium text-slate-900">₹84,000</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>GST TDS (2% u/s 51):</span>
                          <span className="font-mono font-medium text-slate-900">₹84,000</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>BOCW Labour Cess (1%):</span>
                          <span className="font-mono font-medium text-slate-900">₹42,000</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-rose-200/50">
                        Retention tracked for Defect Liability Period (DLP) release.
                      </p>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-white to-emerald-50/35 hover:bg-emerald-50/50 transition-colors duration-200">
                      <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Net Bank Credits Received</p>
                      <p className="text-2xl font-black text-emerald-700 mt-1.5 tabular-nums">₹37,80,000</p>
                      <p className="text-xs text-slate-500 mt-1">Multi-Tranche Agency Disbursement</p>
                      <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                        <div className="flex justify-between">
                          <span>Tranche #1 (PFMS / RTGS):</span>
                          <span className="font-semibold text-slate-900">₹20,00,000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tranche #2 (Treasury Vchr):</span>
                          <span className="font-semibold text-slate-900">₹17,80,000</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-emerald-200/50 font-bold text-slate-900">
                          <span>Net Audit Variance:</span>
                          <span className="text-emerald-700">₹0 (Matched Rupee-for-Rupee)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CLAUSE 5 DELAY DEFENSE */}
              {previewTab === 'clause5' && (
                <div>
                  <div className="px-6 py-4.5 border-b border-slate-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 uppercase tracking-wider">
                          Module 02 • CPWD GCC Clause 5 Delay Defense
                        </span>
                        <span className="text-[11px] text-amber-700 font-medium">Liquidated Damages Shield</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                        Contemporaneous Site Hindrance Register &amp; Extension of Time (EoT)
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Contract LD Ceiling: 10% (₹1,85,00,000) • Active Hindrance Days Shielded: 48 Days
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                        Shield Active • 0 LD Deductions
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-3.5">
                    <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs shadow-2xs">
                      <div className="bg-slate-100/90 px-4 py-2.5 font-bold text-slate-700 grid grid-cols-12 gap-2 uppercase tracking-wider text-[11px]">
                        <span className="col-span-3 sm:col-span-2">Hindrance Date</span>
                        <span className="col-span-5 sm:col-span-6">Departmental Cause &amp; Description</span>
                        <span className="col-span-2 sm:col-span-2 text-center">Delay Impact</span>
                        <span className="col-span-2 sm:col-span-2 text-right">Notice Status</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-slate-700 bg-white">
                        <div className="px-4 py-3.5 grid grid-cols-12 gap-2 items-center hover:bg-amber-50/40 transition-colors duration-150">
                          <span className="col-span-3 sm:col-span-2 font-mono text-slate-500">12 Feb 2026</span>
                          <span className="col-span-5 sm:col-span-6">
                            <strong className="text-slate-900 block font-semibold">Delayed Site Handover (Km 14+200 to 16+000)</strong>
                            <span className="text-slate-500 text-[11px]">Forest clearance and tree cutting pending by Departmental Forest Division.</span>
                          </span>
                          <span className="col-span-2 sm:col-span-2 text-center font-bold text-amber-700">22 Days</span>
                          <span className="col-span-2 sm:col-span-2 text-right">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Served to EE
                            </span>
                          </span>
                        </div>

                        <div className="px-4 py-3.5 grid grid-cols-12 gap-2 items-center hover:bg-amber-50/40 transition-colors duration-150">
                          <span className="col-span-3 sm:col-span-2 font-mono text-slate-500">04 Mar 2026</span>
                          <span className="col-span-5 sm:col-span-6">
                            <strong className="text-slate-900 block font-semibold">Delayed GAD Drawing for Box Culvert</strong>
                            <span className="text-slate-500 text-[11px]">Revision of structural foundation drawing awaiting Superintending Engineer sign-off.</span>
                          </span>
                          <span className="col-span-2 sm:col-span-2 text-center font-bold text-amber-700">14 Days</span>
                          <span className="col-span-2 sm:col-span-2 text-right">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Served to EE
                            </span>
                          </span>
                        </div>

                        <div className="px-4 py-3.5 grid grid-cols-12 gap-2 items-center hover:bg-amber-50/40 transition-colors duration-150">
                          <span className="col-span-3 sm:col-span-2 font-mono text-slate-500">28 Mar 2026</span>
                          <span className="col-span-5 sm:col-span-6">
                            <strong className="text-slate-900 block font-semibold">33kV Electric Transmission Line Shifting</strong>
                            <span className="text-slate-500 text-[11px]">Power Development Department (PDD) shutdown not sanctioned on work corridor.</span>
                          </span>
                          <span className="col-span-2 sm:col-span-2 text-center font-bold text-amber-700">12 Days</span>
                          <span className="col-span-2 sm:col-span-2 text-right">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              Auto-Drafted
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-center justify-between text-xs shadow-2xs hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200">
                      <span className="text-amber-950 font-medium">
                        🛡️ <strong>Airtight Defense:</strong> When the Executive Engineer assesses final milestone deadlines, contemporaneous Clause 5 notices prevent arbitrary 10% LD cuts in dispute arbitration.
                      </span>
                      <span className="font-bold text-amber-950 shrink-0 ml-3">₹18.5L+ Saved</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PILLARVISION OCR */}
              {previewTab === 'ocr' && (
                <div>
                  <div className="px-6 py-4.5 border-b border-slate-200 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 uppercase tracking-wider">
                          Module 03 • PillarVision™ Document Intelligence
                        </span>
                        <span className="text-[11px] text-emerald-700 font-medium">Mobile Optical Extraction</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                        Instant Extraction for Handwritten Petrol Slips, Quarry Weighment &amp; Challans
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Site Munshi snaps a photo on WhatsApp or mobile web • Auto-allocates to vehicle khata in seconds
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                        Proprietary Optical Compute
                      </span>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-5 bg-slate-900 text-white p-4.5 rounded-2xl border border-slate-800 shadow-lg hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 ease-out">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-[11px] text-slate-400 font-mono">
                        <span>PILLARVISION™ CAM CAPTURE</span>
                        <span className="text-emerald-400 font-bold">99.4% CONFIDENCE</span>
                      </div>
                      <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1 font-mono text-xs text-slate-300">
                        <p className="text-white font-bold">BHARAT PETROLEUM DEALER #2841</p>
                        <p className="text-[11px] text-slate-400">Highway Pump, Bypass Junction</p>
                        <div className="border-t border-slate-700 pt-1.5 mt-1.5 space-y-1 text-xs">
                          <div className="flex justify-between"><span>Product:</span><span className="text-white">High Speed Diesel (HSD)</span></div>
                          <div className="flex justify-between"><span>Volume:</span><span className="text-white font-bold">140.00 Litres</span></div>
                          <div className="flex justify-between"><span>Rate:</span><span>₹89.50 / Ltr</span></div>
                          <div className="flex justify-between border-t border-slate-700/80 pt-1 font-bold text-emerald-400">
                            <span>Total Amount:</span><span>₹12,530.00</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Vehicle Reg:</span><span className="text-amber-300 font-mono">JK02-CH-8812 (JCB 3DX)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-7 space-y-3.5">
                      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:-translate-y-0.5 hover:shadow-xs hover:border-emerald-300/80 transition-all duration-200">
                        <span className="text-xs font-bold text-slate-900 block mb-1">Direct Auto-Posting to Machinery Khata</span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          PillarVision extracts fuel volume, odometer hours, and dealer GSTIN. It automatically debit-allocates fuel expenditure to JCB-02 and credits the pump station account balance.
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:-translate-y-0.5 hover:shadow-xs hover:border-emerald-300/80 transition-all duration-200">
                        <span className="text-xs font-bold text-slate-900 block mb-1">Weighbridge &amp; Quarry Slips</span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Captures gross/tare weights and deduction for moisture, updating site crushed aggregate inventory in real-time.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PBG & EMD RADAR */}
              {previewTab === 'pbg' && (
                <div>
                  <div className="px-6 py-4.5 border-b border-slate-200 bg-rose-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300 uppercase tracking-wider">
                          Module 04 • Performance BG &amp; EMD Capital Radar
                        </span>
                        <span className="text-[11px] text-rose-700 font-medium">Working Capital Protection</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                        Proactive Expiry Radar &amp; Division Release Tracking
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Active BGs: ₹1,42,50,000 • Prevents bank quarterly renewal commission bleed &amp; invocation
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs">
                        1 BG Critical Renewal Alert
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-3.5">
                    <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs shadow-2xs">
                      <div className="bg-slate-100/90 px-4 py-2.5 font-bold text-slate-700 grid grid-cols-12 gap-2 uppercase tracking-wider text-[11px]">
                        <span className="col-span-3 sm:col-span-2">BG No. / Bank</span>
                        <span className="col-span-4 sm:col-span-5">Project &amp; Authority Division</span>
                        <span className="col-span-3 sm:col-span-3 text-right">BG Value (₹)</span>
                        <span className="col-span-2 sm:col-span-2 text-right">Expiry Radar</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-slate-700 bg-white">
                        <div className="px-4 py-3.5 grid grid-cols-12 gap-2 items-center bg-rose-50/30 hover:bg-rose-50/60 transition-colors duration-150">
                          <span className="col-span-3 sm:col-span-2">
                            <strong className="text-slate-900 block font-semibold">PBG/8912</strong>
                            <span className="text-slate-400 text-[10px]">SBI Main Branch</span>
                          </span>
                          <span className="col-span-4 sm:col-span-5">
                            <strong className="text-slate-900 block font-semibold">NH-44 Bypass Culvert Pkg-02</strong>
                            <span className="text-slate-500 text-[11px]">Executive Engineer, PWD (R&amp;B) Div-1</span>
                          </span>
                          <span className="col-span-3 sm:col-span-3 text-right font-mono font-bold text-slate-900">
                            ₹92,50,000
                          </span>
                          <span className="col-span-2 sm:col-span-2 text-right">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
                              24 Days Left
                            </span>
                          </span>
                        </div>

                        <div className="px-4 py-3.5 grid grid-cols-12 gap-2 items-center hover:bg-slate-50 transition-colors duration-150">
                          <span className="col-span-3 sm:col-span-2">
                            <strong className="text-slate-900 block font-semibold">EMD/4410</strong>
                            <span className="text-slate-400 text-[10px]">J&amp;K Bank Residency</span>
                          </span>
                          <span className="col-span-4 sm:col-span-5">
                            <strong className="text-slate-900 block font-semibold">PMGSY Hill Road Stage-II</strong>
                            <span className="text-slate-500 text-[11px]">EE PMGSY Division, Udhampur</span>
                          </span>
                          <span className="col-span-3 sm:col-span-3 text-right font-mono font-bold text-slate-900">
                            ₹18,00,000
                          </span>
                          <span className="col-span-2 sm:col-span-2 text-right">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Surrender Due
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 shadow-2xs hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200">
                      💡 <strong>Surrender Reminder:</strong> Once a completion certificate is signed, PillarPro prompts your liaison officer to collect the original physical BG letter from the EE division so you can surrender it to the bank immediately, eliminating unnecessary margin lockups.
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Multi-Tenant isolation notice */}
              <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Enterprise multi-tenant isolation • AES-256 encrypted ledger records</span>
                <Link href="/sign-up" className="text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1">
                  <span>Open Your Firm Workspace</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>

          </div>
        </section>

        {/* ── Interactive Statutory Deduction Calculator ──────── */}
        <section id="calculator" className="py-14 md:py-20 border-b border-slate-200/80 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/80">
                Interactive Audit Tool
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                Calculate the True Statutory Squeeze on Your RA Bill
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                See exactly where your milestone payments get deducted before bank credit. Slide to test any contract amount:
              </p>
            </div>

            <div className="bg-white/90 backdrop-blur-xl border border-blue-100 shadow-[0_12px_40px_rgba(37,99,235,0.06)] rounded-3xl p-6 sm:p-9">
              {/* Bill Amount Slider & Input */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label htmlFor="bill-slider" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Gross Certified RA Bill Amount (₹)
                  </label>
                  <span className="text-2xl font-black text-slate-900 tabular-nums">
                    ₹{calcBillAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <input
                  id="bill-slider"
                  type="range"
                  min="500000"
                  max="50000000"
                  step="500000"
                  value={calcBillAmount}
                  onChange={e => setCalcBillAmount(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-medium">
                  <span>₹5 Lakhs</span>
                  <span>₹1 Crore</span>
                  <span>₹2.5 Crore</span>
                  <span>₹5 Crore</span>
                </div>
              </div>

              {/* Calculator Settings Bar (Entity & Retention & Mode) */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 mb-6 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Contractor Legal Entity</span>
                    <p className="text-[11px] text-slate-500">Determines Income Tax TDS rate under Section 194C</p>
                  </div>
                  <div className="inline-flex rounded-xl bg-slate-200/70 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setCalcContractorType('individual_proprietor')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        calcContractorType === 'individual_proprietor'
                          ? 'bg-white text-blue-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Proprietorship (1% TDS)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcContractorType('company_firm')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        calcContractorType === 'company_firm'
                          ? 'bg-white text-blue-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Company / Firm (2% TDS)
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-slate-200/80">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Contractual Security Deposit (Retention)</span>
                    <p className="text-[11px] text-slate-500">Based on tender agreement or PBG exemption</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: '0% (Full PBG)', val: 0 },
                      { label: '2.5% (CPWD)', val: 2.5 },
                      { label: '5% (Standard PWD)', val: 5 },
                      { label: '10%', val: 10 },
                    ].map(p => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setCalcRetentionRate(p.val)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                          calcRetentionRate === p.val
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mode Selector: Auto vs Manual Overrides */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/80">
                  <span className="text-xs font-bold text-slate-800">Calculation Method</span>
                  <div className="inline-flex rounded-xl bg-slate-200/70 p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setCalcMode('auto')}
                      className={`px-2.5 py-0.5 rounded-lg transition-all ${
                        calcMode === 'auto'
                          ? 'bg-white text-blue-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Standard Statutory Rules
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcMode('manual')}
                      className={`px-2.5 py-0.5 rounded-lg transition-all ${
                        calcMode === 'manual'
                          ? 'bg-white text-blue-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Manual Exact Figures
                    </button>
                  </div>
                </div>
              </div>

              {/* Deductions Breakdown Output */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Statutory Deductions Breakdown
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-blue-50/50 hover:border-blue-200/80 hover:-translate-y-0.5 hover:shadow-2xs transition-all duration-200 cursor-default">
                      <div>
                        <span className="font-semibold text-slate-800">Retention / Security Deposit</span>
                        <span className="text-[10px] text-slate-500 block">DLP Release</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">₹{retention.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-blue-50/50 hover:border-blue-200/80 hover:-translate-y-0.5 hover:shadow-2xs transition-all duration-200 cursor-default">
                      <div>
                        <span className="font-semibold text-slate-800">IT TDS (u/s 194C)</span>
                        <span className="text-[10px] text-slate-500 block">{(itTdsRate * 100).toFixed(0)}% Tax Deduction</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">₹{itTds.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-blue-50/50 hover:border-blue-200/80 hover:-translate-y-0.5 hover:shadow-2xs transition-all duration-200 cursor-default">
                      <div>
                        <span className="font-semibold text-slate-800">GST TDS (u/s 51)</span>
                        <span className="text-[10px] text-slate-500 block">2% (1% CGST + 1% SGST)</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">₹{gstTds.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-blue-50/50 hover:border-blue-200/80 hover:-translate-y-0.5 hover:shadow-2xs transition-all duration-200 cursor-default">
                      <div>
                        <span className="font-semibold text-slate-800">BOCW Labour Welfare Cess</span>
                        <span className="text-[10px] text-slate-500 block">1% Cess</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">₹{labourCess.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-50/30 to-white border border-emerald-200/80 shadow-xs hover:-translate-y-1 hover:shadow-md hover:shadow-emerald-500/10 hover:border-emerald-300 transition-all duration-300 ease-out">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                      Net Expected Bank Disbursal
                    </span>
                    <p className="text-3xl sm:text-4xl font-black text-emerald-700 mt-2 tabular-nums">
                      ₹{netDisbursed.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Total Statutory Squeeze: <span className="font-bold text-rose-700">₹{totalDeductions.toLocaleString('en-IN')}</span> ({totalDeductionsPct}%)
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-emerald-200/60 text-xs text-slate-600 space-y-1.5">
                    <p>✓ Automated Form 43 bill reconciliation</p>
                    <p>✓ Multi-tranche credit tracking (PFMS / State Treasury)</p>
                    <p>✓ Defect Liability Period retention release reminders</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Unified 6-in-1 Contractor Operating Suite ───────── */}
        <section id="suite" className="py-14 md:py-20 border-b border-slate-200/80 relative">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/80">
                Full Operational Command
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                All 6 Critical Site &amp; Office Books in One Architecture
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Eliminate spreadsheet fragmentation. Run your entire government contracting firm through unified project ledgers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Module 1: RA Bills */}
              <div className="group p-6 rounded-2xl bg-white/80 hover:bg-white backdrop-blur-md border border-slate-200/80 hover:border-blue-400/60 shadow-xs hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300">
                <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                  🏛️
                </div>
                <h3 className="font-bold text-slate-900 text-base">Client &amp; RA Bills Engine</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Reconcile gross certified abstracts against statutory deductions (Retention, TDS, Cess). Track multi-tranche agency credits from PFMS, PSU finance, and State Treasuries until zero balance variance.
                </p>
              </div>

              {/* Module 2: Clause 5 Delay Defense */}
              <div className="group p-6 rounded-2xl bg-white/80 hover:bg-white backdrop-blur-md border border-slate-200/80 hover:border-amber-400/60 shadow-xs hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-1 transition-all duration-300">
                <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                  🛡️
                </div>
                <h3 className="font-bold text-slate-900 text-base">CPWD Clause 5 Delay Defense</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Log contemporaneous client-side hindrances (delayed drawing approvals, land handover, utility shifting) with timestamped notices to Executive Engineers, shielding your firm from 10% Liquidated Damages.
                </p>
              </div>

              {/* Module 3: Muster Roll */}
              <div className="group p-6 rounded-2xl bg-white/80 hover:bg-white backdrop-blur-md border border-slate-200/80 hover:border-emerald-400/60 shadow-xs hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-300">
                <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                  👷‍♂️
                </div>
                <h3 className="font-bold text-slate-900 text-base">Daily Muster &amp; Wages</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Mobile-optimized for site munshis under direct sunlight. Record mason/labour attendance, daily wage rates, cash advances, and overtime shifts with full offline sync.
                </p>
              </div>

              {/* Module 4: Store & Materials */}
              <div className="group p-6 rounded-2xl bg-white/80 hover:bg-white backdrop-blur-md border border-slate-200/80 hover:border-cyan-400/60 shadow-xs hover:shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-1 transition-all duration-300">
                <div className="h-11 w-11 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200/80 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                  📦
                </div>
                <h3 className="font-bold text-slate-900 text-base">Store &amp; Stock Inventory</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Goods Receipt Notes (GRN), gate passes, cement expiry warnings, and physical MAS reconciliation to eliminate unlogged site shrinkage and wastage.
                </p>
              </div>

              {/* Module 5: Supplier Khata */}
              <div className="group p-6 rounded-2xl bg-white/80 hover:bg-white backdrop-blur-md border border-slate-200/80 hover:border-indigo-400/60 shadow-xs hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300">
                <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                  🏢
                </div>
                <h3 className="font-bold text-slate-900 text-base">Supplier Khata &amp; Payables</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Itemize material purchase invoices, track transport/carriage deductions, verify weighbridge receipts, and share PDF statements directly via WhatsApp.
                </p>
              </div>

              {/* Module 6: Petty Cash & Vouchers */}
              <div className="group p-6 rounded-2xl bg-white/80 hover:bg-white backdrop-blur-md border border-slate-200/80 hover:border-rose-400/60 shadow-xs hover:shadow-lg hover:shadow-rose-500/5 hover:-translate-y-1 transition-all duration-300">
                <div className="h-11 w-11 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/80 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                  🧾
                </div>
                <h3 className="font-bold text-slate-900 text-base">Site Petty Cash &amp; Vouchers</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Daily imprest cash reconciliation, fuel slips, hardware store receipts, and repair vouchers with mobile photo attachments and contractor sign-off.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Audit Comparison Specification Table ───────────── */}
        <section id="specification" className="py-14 md:py-20 border-b border-slate-200/80 relative">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/80">
                Feature Specification
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                PillarPro vs Generic Spreadsheets &amp; Standard Accounting
              </h2>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] bg-white/95 backdrop-blur-md transition-shadow duration-300">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th scope="col" className="p-4 sm:p-5">Capability</th>
                    <th scope="col" className="p-4 sm:p-5 text-blue-900 bg-blue-50/50 border-x border-blue-200/60 font-black">PillarPro OS</th>
                    <th scope="col" className="p-4 sm:p-5">Excel Spreadsheets</th>
                    <th scope="col" className="p-4 sm:p-5">Tally / Standard ERP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr className="hover:bg-blue-50/30 transition-colors duration-150">
                    <th scope="row" className="p-4 sm:p-5 font-semibold text-slate-900 font-sans">
                      Government RA Bill Statutory Deductions (Retention, TDS, Cess)
                    </th>
                    <td className="p-4 sm:p-5 text-emerald-800 font-semibold bg-emerald-50/40 border-x border-blue-200/60 flex items-center gap-1.5">
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      Automated &amp; Reconciled
                    </td>
                    <td className="p-4 sm:p-5 text-slate-500">Manual formula error risk</td>
                    <td className="p-4 sm:p-5 text-slate-500">Requires complex journal adjustments</td>
                  </tr>
                  <tr className="hover:bg-blue-50/30 transition-colors duration-150">
                    <th scope="row" className="p-4 sm:p-5 font-semibold text-slate-900 font-sans">
                      Multi-Agency Disbursement Tracking (PFMS, PSU Finance, State Treasuries)
                    </th>
                    <td className="p-4 sm:p-5 text-emerald-800 font-semibold bg-emerald-50/40 border-x border-blue-200/60 flex items-center gap-1.5">
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      Tranche-by-Tranche Audit
                    </td>
                    <td className="p-4 sm:p-5 text-rose-600/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      Lost in bank statement rows
                    </td>
                    <td className="p-4 sm:p-5 text-rose-600/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      No milestone link
                    </td>
                  </tr>
                  <tr className="hover:bg-blue-50/30 transition-colors duration-150">
                    <th scope="row" className="p-4 sm:p-5 font-semibold text-slate-900 font-sans">
                      Bank Guarantee &amp; EMD Expiry Radar
                    </th>
                    <td className="p-4 sm:p-5 text-emerald-800 font-semibold bg-emerald-50/40 border-x border-blue-200/60 flex items-center gap-1.5">
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      30-Day Automated Alert
                    </td>
                    <td className="p-4 sm:p-5 text-rose-600/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      None (Missed surrender)
                    </td>
                    <td className="p-4 sm:p-5 text-rose-600/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      No expiry warning system
                    </td>
                  </tr>
                  <tr className="hover:bg-blue-50/30 transition-colors duration-150">
                    <th scope="row" className="p-4 sm:p-5 font-semibold text-slate-900 font-sans">
                      Supplier Procurement with Carriage / Freight Charges
                    </th>
                    <td className="p-4 sm:p-5 text-emerald-800 font-semibold bg-emerald-50/40 border-x border-blue-200/60 flex items-center gap-1.5">
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      Itemized Transport Cost
                    </td>
                    <td className="p-4 sm:p-5 text-slate-500">Unclear landed cost</td>
                    <td className="p-4 sm:p-5 text-slate-500">Manual voucher split</td>
                  </tr>
                  <tr className="hover:bg-blue-50/30 transition-colors duration-150">
                    <th scope="row" className="p-4 sm:p-5 font-semibold text-slate-900 font-sans">
                      Partner Capital Parity &amp; Out-of-Pocket Ledger
                    </th>
                    <td className="p-4 sm:p-5 text-emerald-800 font-semibold bg-emerald-50/40 border-x border-blue-200/60 flex items-center gap-1.5">
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      Real-time Equity Reconciliation
                    </td>
                    <td className="p-4 sm:p-5 text-slate-500">Frequent partner disputes</td>
                    <td className="p-4 sm:p-5 text-slate-500">Requires chartered accountant</td>
                  </tr>
                  <tr className="hover:bg-blue-50/30 transition-colors duration-150">
                    <th scope="row" className="p-4 sm:p-5 font-semibold text-slate-900 font-sans">
                      Mobile Field Usability Under Direct Sunlight
                    </th>
                    <td className="p-4 sm:p-5 text-emerald-800 font-semibold bg-emerald-50/40 border-x border-blue-200/60 flex items-center gap-1.5">
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      High-Contrast Glare-Free UI
                    </td>
                    <td className="p-4 sm:p-5 text-rose-600/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      Tiny mobile sheet cells
                    </td>
                    <td className="p-4 sm:p-5 text-rose-600/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      Desktop-only software
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQ Section (Clean Accordion) ───────────────────── */}
        <section id="faq" className="py-14 md:py-20 border-b border-slate-200/80 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/80">
                Common Inquiries
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-3.5">
              {faqs.map((faq, idx) => {
                const isOpen = activeFaq === idx
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200/90 bg-white/90 backdrop-blur-md overflow-hidden shadow-2xs hover:border-blue-300/80 hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <button
                      type="button"
                      id={`faq-btn-${idx}`}
                      onClick={() => toggleFaq(idx)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${idx}`}
                      className="w-full p-4.5 sm:p-5 text-left font-semibold text-slate-900 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors focus:outline-none"
                    >
                      <span className="text-sm font-bold">{faq.q}</span>
                      <span
                        aria-hidden="true"
                        className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
                      >
                        <IconChevronDown className="w-4 h-4" />
                      </span>
                    </button>
                    {isOpen && (
                      <div
                        id={`faq-answer-${idx}`}
                        role="region"
                        aria-labelledby={`faq-btn-${idx}`}
                        className="px-4.5 pb-5 sm:px-5 sm:pb-6 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3.5 bg-slate-50/40"
                      >
                        {faq.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Final Call To Action (Apple-Style High-Impact Card) ─ */}
        <section className="py-16 md:py-24 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-8 sm:p-14 shadow-2xl hover:shadow-blue-900/30 hover:-translate-y-1 transition-all duration-300 ease-out overflow-hidden text-center">
              {/* Internal subtle glow */}
              <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-4">
                  Built For Class-A Civil Contractors
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Take Command of Your Contracting Finances Today
                </h2>
                <p className="mt-3 text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                  Join infrastructure and PWD contractors who have eliminated spreadsheet chaos, audited their statutory deductions, and protected their working capital.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/sign-up"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5"
                  >
                    <span>Launch Contractor Workspace Free</span>
                    <IconArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  No credit card required • Isolated database partition provisioned in 30 seconds
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── JSON-LD Structured Data ──────────────────────────── */}
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
              'The Financial & Operations Operating System built specifically for Indian civil infrastructure contractors. RA Billing, statutory deductions, PFMS reconciliation, supplier khatas, and site muster rolls.',
          }),
        }}
      />

      {/* ── Minimal Architectural Footer ─────────────────────── */}
      <footer className="py-8 pb-24 md:pb-8 border-t border-slate-200/80 bg-white/80 backdrop-blur-md text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo theme="light" size="sm" href="/" />
            <span className="text-slate-500 text-[11px]">
              — Financial &amp; Operations OS for Infrastructure Contractors
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[11px] text-slate-600 font-medium">
            <Link href="/pricing" className="hover:text-blue-600 transition-colors">Plans &amp; Pricing</Link>
            <Link href="/sign-in" className="hover:text-blue-600 transition-colors">Sign In</Link>
            <Link href="/sign-up" className="hover:text-blue-600 transition-colors">Create Firm Workspace</Link>
            <a href="mailto:contact@pillarprojk.com" className="hover:text-blue-600 transition-colors">Contact Us</a>
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link>
            <span className="text-slate-400">© 2026 PillarPro. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* ── Sticky Mobile Action Bar (Clean High-Contrast Glass) ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden p-3 bg-white/90 backdrop-blur-xl border-t border-slate-200/90 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">PillarPro OS</p>
            <p className="text-[10px] text-slate-500 truncate">Civil Contractor Financials</p>
          </div>
          <Link
            href={isLoggedIn ? '/dashboard' : '/sign-up'}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md shadow-blue-600/20 shrink-0"
          >
            <span>{isLoggedIn ? 'Dashboard' : 'Start Trial'}</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
