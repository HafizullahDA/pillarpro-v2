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

function IconTruck({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
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

  // Clause 5 Simulator States
  const [simContractValue, setSimContractValue] = useState<number>(25000000) // ₹2.5 Crore
  const [simDelayDays, setSimDelayDays] = useState<number>(45) // 45 days delay

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

  // Clause 5 Liquidated Damages math
  // CPWD GCC Clause 2/5 max LD penalty is typically 10% of tendered contract value
  const maxLdRisk = Math.round(simContractValue * 0.10)
  const estimatedLdPerDay = Math.round((simContractValue * 0.001) * 0.5)
  const accruedLdExposure = Math.min(maxLdRisk, Math.round(estimatedLdPerDay * simDelayDays))

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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased selection:bg-slate-900 selection:text-white">
      {/* ── Skip to Main Content Link ───────────────────────── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-md text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* ── Top Architectural Navbar ────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo theme="light" href="/" size="md" subtitle="Civil Contractor OS" />
          </div>

          <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#audit-preview" className="hover:text-slate-900 transition-colors">Bill Audit Preview</a>
            <a href="#calculator" className="hover:text-slate-900 transition-colors">Deduction Calculator</a>
            <a href="#capabilities" className="hover:text-slate-900 transition-colors">System Capabilities</a>
            <a href="#specification" className="hover:text-slate-900 transition-colors">Audit Comparison</a>
            <Link href="/pricing" className="text-slate-900 font-bold hover:text-blue-600 transition-colors">Pricing</Link>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
              >
                <span>Dashboard ({userName || orgName || 'Firm'})</span>
                <IconArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
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
      <main id="main-content">
        {/* ── Hero Section (Architectural Studio Field Slate) ─── */}
        <section className="pt-12 pb-14 md:pt-18 md:pb-20 bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            
            {/* Government Department Channels Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold tracking-wide mb-6">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>CPWD (PFMS) • NHPC &amp; PSUs (FINANCE) • STATE PWD &amp; PMGSY (TREASURY)</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              The Financial &amp; Operational OS for Indian Civil Contractors
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
              Built specifically for infrastructure and public works contractors. Reconcile multi-crore RA bills against statutory deductions (5% Retention, Sec 194C TDS, GST TDS, Labour Cess), shield your firm against <strong className="text-slate-900 font-semibold">10% Liquidated Damages under CPWD GCC Clause 5</strong>, scan field fuel slips with <strong className="text-slate-900 font-semibold">PillarVision™ Optical Intelligence</strong>, and run your daily muster rolls and machinery logs in one unified workspace.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
              >
                <span>Launch Firm Workspace Free</span>
                <IconArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#audit-preview"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <span>Explore Interactive Showcase</span>
                <IconChevronDown className="w-4 h-4 text-slate-500" />
              </a>
            </div>

            {/* Contractor Credibility Badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-8 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-4 h-4 text-slate-700" />
                Built for Class-A &amp; Prime Civil Contractors
              </span>
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-4 h-4 text-slate-700" />
                Complete Site &amp; Office Operational Suite
              </span>
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-4 h-4 text-slate-700" />
                Multi-Tenant Encrypted RLS Isolation
              </span>
            </div>
          </div>
        </section>

        {/* ── High-Impact 4-Way Interactive Feature Showcase ──── */}
        <section id="audit-preview" className="py-12 md:py-16 bg-[#F8FAFC] border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Live Interactive System
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                Inspect Real Contractor Command Screens
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
                Toggle between the core modules that safeguard government contractor cash flow &amp; contract claims:
              </p>
            </div>

            {/* Tab Switcher Buttons */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-slate-200/80 rounded-2xl mb-5 text-xs font-semibold max-w-3xl mx-auto">
              <button
                type="button"
                onClick={() => setPreviewTab('ra_bills')}
                className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl transition-all text-center flex items-center justify-center gap-2 ${
                  previewTab === 'ra_bills'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
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
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
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
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
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
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <IconClock className="w-4 h-4 text-rose-600" />
                <span>PBG &amp; EMD Radar</span>
              </button>
            </div>

            {/* Showcase Viewport */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
              
              {/* TAB 1: RA BILL AUDIT */}
              {previewTab === 'ra_bills' && (
                <div>
                  <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider">
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
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        ✓ RA Bill 01 Reconciled
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                    <div className="p-5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Work Certified</p>
                      <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">₹42,00,000</p>
                      <p className="text-xs text-slate-500 mt-1">Abstract of Measurements (MB 142)</p>
                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
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

                    <div className="p-5 bg-slate-50/50">
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
                      <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-200">
                        Retention tracked for Defect Liability Period (DLP) release.
                      </p>
                    </div>

                    <div className="p-5">
                      <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Net Bank Credits Received</p>
                      <p className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">₹37,80,000</p>
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
                        <div className="flex justify-between pt-2 border-t border-slate-100 font-bold text-slate-900">
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
                  <div className="px-5 py-4 border-b border-slate-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 uppercase tracking-wider">
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
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Shield Active • 0 LD Deductions
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                      <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-700 grid grid-cols-12 gap-2 uppercase tracking-wider text-[11px]">
                        <span className="col-span-3 sm:col-span-2">Hindrance Date</span>
                        <span className="col-span-5 sm:col-span-6">Departmental Cause &amp; Description</span>
                        <span className="col-span-2 sm:col-span-2 text-center">Delay Impact</span>
                        <span className="col-span-2 sm:col-span-2 text-right">Notice Status</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-slate-700 bg-white">
                        <div className="px-4 py-3 grid grid-cols-12 gap-2 items-center">
                          <span className="col-span-3 sm:col-span-2 font-mono text-slate-500">12 Feb 2026</span>
                          <span className="col-span-5 sm:col-span-6">
                            <strong className="text-slate-900 block font-semibold">Delayed Site Handover (Km 14+200 to 16+000)</strong>
                            <span className="text-slate-500 text-[11px]">Forest clearance and tree cutting pending by Departmental Forest Division.</span>
                          </span>
                          <span className="col-span-2 sm:col-span-2 text-center font-bold text-amber-700">22 Days</span>
                          <span className="col-span-2 sm:col-span-2 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Served to EE
                            </span>
                          </span>
                        </div>

                        <div className="px-4 py-3 grid grid-cols-12 gap-2 items-center">
                          <span className="col-span-3 sm:col-span-2 font-mono text-slate-500">04 Mar 2026</span>
                          <span className="col-span-5 sm:col-span-6">
                            <strong className="text-slate-900 block font-semibold">Delayed GAD Drawing for Box Culvert</strong>
                            <span className="text-slate-500 text-[11px]">Revision of structural foundation drawing awaiting Superintending Engineer sign-off.</span>
                          </span>
                          <span className="col-span-2 sm:col-span-2 text-center font-bold text-amber-700">14 Days</span>
                          <span className="col-span-2 sm:col-span-2 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Served to EE
                            </span>
                          </span>
                        </div>

                        <div className="px-4 py-3 grid grid-cols-12 gap-2 items-center">
                          <span className="col-span-3 sm:col-span-2 font-mono text-slate-500">28 Mar 2026</span>
                          <span className="col-span-5 sm:col-span-6">
                            <strong className="text-slate-900 block font-semibold">33kV Electric Transmission Line Shifting</strong>
                            <span className="text-slate-500 text-[11px]">Power Development Department (PDD) shutdown not sanctioned on work corridor.</span>
                          </span>
                          <span className="col-span-2 sm:col-span-2 text-center font-bold text-amber-700">12 Days</span>
                          <span className="col-span-2 sm:col-span-2 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              Auto-Drafted
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-amber-900 font-medium">
                        🛡️ <strong>Airtight Defense:</strong> When the Executive Engineer assesses final milestone deadlines, contemporaneous Clause 5 notices prevent arbitrary 10% LD cuts in dispute arbitration.
                      </span>
                      <span className="font-bold text-amber-950 shrink-0 ml-2">₹18.5L+ Saved</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PILLARVISION OCR */}
              {previewTab === 'ocr' && (
                <div>
                  <div className="px-5 py-4 border-b border-slate-200 bg-emerald-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 uppercase tracking-wider">
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
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        Proprietary Optical Compute
                      </span>
                    </div>
                  </div>

                  <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                    {/* Simulated mobile scan card */}
                    <div className="md:col-span-5 bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-md">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-[11px] text-slate-400 font-mono">
                        <span>PILLARVISION™ CAM CAPTURE</span>
                        <span className="text-emerald-400">99.4% CONFIDENCE</span>
                      </div>
                      <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-1 font-mono text-xs text-slate-300">
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
                            <span>Vehicle Slip Ref:</span><span className="text-slate-200">JK02-CH-8821 (JCB-03)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Extracted Ledger Mapping */}
                    <div className="md:col-span-7 space-y-3">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Automated Ledger Routing &amp; Audit Trail
                      </p>
                      
                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-900 block">🚜 Machine Logbook Entry</span>
                            <span className="text-slate-500 text-[11px]">JCB-03 Excavator • +140L logged to hourly consumption</span>
                          </div>
                          <span className="text-emerald-700 font-bold">Auto-Routed</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-900 block">📦 Supplier Khata Ledger</span>
                            <span className="text-slate-500 text-[11px]">Credit to &quot;Highway Fuel Station&quot; Khata Ledger</span>
                          </div>
                          <span className="text-emerald-700 font-bold">₹12,530 Logged</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-900 block">📱 Munshi WhatsApp Verification</span>
                            <span className="text-slate-500 text-[11px]">Driver signed digitally on mobile receipt upload</span>
                          </div>
                          <span className="text-blue-700 font-bold">Verified</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        Zero lost fuel slips at the end of the month. Never pay for phantom diesel again.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PBG & EMD RADAR */}
              {previewTab === 'pbg' && (
                <div>
                  <div className="px-5 py-4 border-b border-slate-200 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 uppercase tracking-wider">
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
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                        1 BG Critical Renewal Alert
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                      <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-700 grid grid-cols-12 gap-2 uppercase tracking-wider text-[11px]">
                        <span className="col-span-3 sm:col-span-2">BG No. / Bank</span>
                        <span className="col-span-4 sm:col-span-5">Project &amp; Authority Division</span>
                        <span className="col-span-3 sm:col-span-3 text-right">BG Value (₹)</span>
                        <span className="col-span-2 sm:col-span-2 text-right">Expiry Radar</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-slate-700 bg-white">
                        <div className="px-4 py-3 grid grid-cols-12 gap-2 items-center bg-rose-50/30">
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
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
                              24 Days Left
                            </span>
                          </span>
                        </div>

                        <div className="px-4 py-3 grid grid-cols-12 gap-2 items-center">
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
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Surrender Due
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                      💡 <strong>Surrender Reminder:</strong> Once a completion certificate is signed, PillarPro prompts your liaison officer to collect the original physical BG letter from the EE division so you can surrender it to the bank immediately, eliminating unnecessary margin lockups.
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Multi-Tenant isolation notice */}
              <div className="px-5 py-3 bg-slate-100/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Enterprise multi-tenant isolation • AES-256 encrypted ledger records</span>
                <Link href="/sign-up" className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
                  <span>Open Your Firm Workspace</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>

          </div>
        </section>

        {/* ── Interactive Statutory Deduction Calculator ──────── */}
        <section id="calculator" className="py-14 bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Interactive Audit Tool
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                Calculate the True Statutory Squeeze on Your RA Bill
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                See exactly where your milestone payments get deducted before bank credit. Slide to test any contract amount:
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              {/* Bill Amount Slider & Input */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label htmlFor="bill-slider" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Gross Certified RA Bill Amount (₹)
                  </label>
                  <span className="text-xl font-black text-slate-900 tabular-nums">
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
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                  <span>₹5 Lakhs</span>
                  <span>₹1 Crore</span>
                  <span>₹2.5 Crore</span>
                  <span>₹5 Crore</span>
                </div>
              </div>

              {/* Calculator Settings Bar (Entity & Retention & Mode) */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 mb-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Contractor Legal Entity</span>
                    <p className="text-[11px] text-slate-500">Determines Income Tax TDS rate under Section 194C</p>
                  </div>
                  <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setCalcContractorType('individual_proprietor')}
                      className={`px-3 py-1 rounded-md transition-all ${
                        calcContractorType === 'individual_proprietor'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Proprietorship / Individual (1% TDS)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcContractorType('company_firm')}
                      className={`px-3 py-1 rounded-md transition-all ${
                        calcContractorType === 'company_firm'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Company / Partnership Firm (2% TDS)
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Contractual Security Deposit (Retention)</span>
                    <p className="text-[11px] text-slate-500">Based on tender agreement or PBG exemption</p>
                  </div>
                  <div className="flex items-center gap-1.5">
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
                        className={`text-xs px-2.5 py-1 rounded-md border font-semibold transition-colors ${
                          calcRetentionRate === p.val
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mode Selector: Auto vs Manual Overrides */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Calculation Method</span>
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setCalcMode('auto')}
                      className={`px-2.5 py-1 rounded transition-all ${
                        calcMode === 'auto' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      ⚡ Standard Rates
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCalcMode('manual')
                        if (!manualRetention) setManualRetention(String(autoRetention))
                        if (!manualItTds) setManualItTds(String(autoItTds))
                        if (!manualGstTds) setManualGstTds(String(autoGstTds))
                        if (!manualLabourCess) setManualLabourCess(String(autoLabourCess))
                      }}
                      className={`px-2.5 py-1 rounded transition-all ${
                        calcMode === 'manual' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      ✏️ Manual Input & Overrides
                    </button>
                  </div>
                </div>
              </div>

              {/* Deductions Breakdown Grid */}
              {calcMode === 'auto' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-[11px] font-semibold text-slate-500">
                      {calcRetentionRate}% Retention (SD)
                    </p>
                    <p className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                      -₹{retention.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Held till DLP expiry</p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-[11px] font-semibold text-slate-500">
                      {itTdsRate * 100}% IT TDS (Sec 194C)
                    </p>
                    <p className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                      -₹{itTds.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {calcContractorType === 'individual_proprietor' ? '1% Individual/Prop' : '2% Company/Firm'}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-[11px] font-semibold text-slate-500">2% GST TDS (Sec 51)</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                      -₹{gstTds.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">1% CGST + 1% SGST</p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-[11px] font-semibold text-slate-500">1% BOCW Cess</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                      -₹{labourCess.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Labour Welfare Board</p>
                  </div>
                </div>
              ) : (
                /* Manual Custom Entry Grid */
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Security Deposit / Retention (₹)
                      </label>
                      <input
                        type="number"
                        value={manualRetention}
                        onChange={e => setManualRetention(e.target.value)}
                        placeholder="0"
                        className="w-full text-xs p-1.5 border border-slate-300 rounded font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        IT TDS (Sec 194C) (₹)
                      </label>
                      <input
                        type="number"
                        value={manualItTds}
                        onChange={e => setManualItTds(e.target.value)}
                        placeholder="0"
                        className="w-full text-xs p-1.5 border border-slate-300 rounded font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        GST TDS (Sec 51) (₹)
                      </label>
                      <input
                        type="number"
                        value={manualGstTds}
                        onChange={e => setManualGstTds(e.target.value)}
                        placeholder="0"
                        className="w-full text-xs p-1.5 border border-slate-300 rounded font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        BOCW Labour Cess (1%) (₹)
                      </label>
                      <input
                        type="number"
                        value={manualLabourCess}
                        onChange={e => setManualLabourCess(e.target.value)}
                        placeholder="0"
                        className="w-full text-xs p-1.5 border border-slate-300 rounded font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Mineral Royalty / Transit Pass (₹)
                      </label>
                      <input
                        type="number"
                        value={manualRoyalty}
                        onChange={e => setManualRoyalty(e.target.value)}
                        placeholder="e.g. 25000"
                        className="w-full text-xs p-1.5 border border-slate-300 rounded font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        QC Testing & Inspection Charges (₹)
                      </label>
                      <input
                        type="number"
                        value={manualTesting}
                        onChange={e => setManualTesting(e.target.value)}
                        placeholder="e.g. 15000"
                        className="w-full text-xs p-1.5 border border-slate-300 rounded font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Net Disbursed Result */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    Expected Net Bank Disbursement
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Total Deductions: ₹{totalDeductions.toLocaleString('en-IN')} ({totalDeductionsPct}% of Gross Bill)
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-2xl font-black text-emerald-900 tabular-nums">
                    ₹{netDisbursed.toLocaleString('en-IN')}
                  </span>
                  <span className="block text-[11px] text-emerald-700 font-medium">
                    Reconciles across PFMS / Finance / State Treasury
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-3 text-center">
                Statutory Note: IT TDS is 1% for individuals/proprietorships and 2% for companies/LLPs under Sec 194C. GST TDS applies at 2% on taxable contracts &gt; ₹2.5L under Sec 51. Security deposit varies by agreement (0%–10%). All figures can be auto-applied or manually entered in PillarPro.
              </p>
            </div>
          </div>
        </section>

        {/* ── Interactive Clause 5 Delay Defense & LD Simulator ─── */}
        <section id="clause5-sim" className="py-14 bg-slate-900 text-white border-b border-slate-800 relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute -top-24 right-0 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
                <IconShieldAlert className="w-3.5 h-3.5" />
                CPWD GCC Clause 5 Defense Calculator
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Simulate Your Firm’s Exposure to Liquidated Damages (LD)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">
                Under standard government contracts, the department can penalize your firm up to 10% of the entire tender value for milestone delays. See how contemporaneous evidence shields you:
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 backdrop-blur-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-slate-300">Total Tender Agreement Value (₹)</label>
                    <span className="text-sm font-bold text-amber-400">₹{(simContractValue / 10000000).toFixed(2)} Cr</span>
                  </div>
                  <input
                    type="range"
                    min="5000000"
                    max="100000000"
                    step="2500000"
                    value={simContractValue}
                    onChange={e => setSimContractValue(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>₹50 Lakhs</span>
                    <span>₹5 Crore</span>
                    <span>₹10 Crore</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-slate-300">Project Delay / Hindrance Duration</label>
                    <span className="text-sm font-bold text-amber-400">{simDelayDays} Days</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="180"
                    step="5"
                    value={simDelayDays}
                    onChange={e => setSimDelayDays(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>10 Days</span>
                    <span>90 Days</span>
                    <span>180 Days</span>
                  </div>
                </div>
              </div>

              {/* Exposure vs Defense Comparison Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Without Contemporaneous Logs</span>
                    <span className="text-xs font-bold text-red-400">Departmental Risk</span>
                  </div>
                  <p className="text-2xl font-black text-red-300 mt-2 tabular-nums">
                    -₹{accruedLdExposure.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    Arbitrary Liquidated Damages deducted from your final bill or security deposit under Clause 2/5 due to lack of contemporaneous proof.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">With PillarPro Clause 5 Defense</span>
                    <span className="text-xs font-bold text-emerald-400">Airtight Shield</span>
                  </div>
                  <p className="text-2xl font-black text-emerald-300 mt-2 tabular-nums">
                    ₹0 Deducted (Protected)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    Timestamped hindrance notices served to Executive Engineer establishing client-side delay (utility shifting, drawing revisions, site access).
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-400">
                  Generates ready-to-print Section 5 extension letters formatted for Executive Engineers.
                </span>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors shrink-0"
                >
                  <span>Shield Your Contracts</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── The 5 Core Pillars (High-Stakes Moats) ───────────── */}
        <section id="capabilities" className="py-16 md:py-20 bg-[#F8FAFC] border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Built For High-Stakes Contracts
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-1 tracking-tight">
                The 5 Proprietary Pillars Protecting Your Bottom Line
              </h2>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                Standard apps manage simple office tasks. PillarPro solves the 5 brutal financial, contractual, and operational vulnerabilities where civil contractors lose lakhs of rupees.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pillar 1: Multi-Agency RA Bill Audit */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-4">
                    <IconFileText className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Pillar 01</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">Multi-Agency RA Bill Audit &amp; Deductions</h3>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    Built for <strong className="text-slate-900">CPWD</strong> (audited by Accounts Branch &amp; credited via PFMS), <strong className="text-slate-900">NHPC &amp; PSUs</strong> (disbursed through corporate finance RTGS), and <strong className="text-slate-900">State PWD &amp; PMGSY</strong> (disbursed through State Treasuries). Reconciles statutory deductions and split bank credit tranches down to the exact rupee.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-medium text-slate-500">
                  ✓ Retention, IT TDS, GST TDS &amp; Labour Cess
                </div>
              </div>

              {/* Pillar 2: Clause 5 Delay Defense */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
                    <IconShieldAlert className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Pillar 02</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">Clause 5 Delay Defense &amp; LD Shield</h3>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    Protect your firm from devastating 10% Liquidated Damages penalty deductions under CPWD GCC Clause 5. Contemporaneous field hindrance logging with auto-drafted Extension of Time (EoT) notices to the Executive Engineer creates an unassailable evidentiary trail.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-medium text-slate-500">
                  ✓ Protects against arbitrary 10% contract cuts
                </div>
              </div>

              {/* Pillar 3: PillarVision OCR */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-4">
                    <IconCamera className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Pillar 03</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">PillarVision™ Document Intelligence</h3>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    Mobile optical scanning purpose-built for harsh site conditions. Snap crumpled petrol pump slips, weighbridge receipts, and supplier challans from any smartphone camera. Instantly extracts items, quantity, vehicle numbers, and allocates to ledgers with zero manual typing.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-medium text-slate-500">
                  ✓ High-speed mobile optical scanning
                </div>
              </div>

              {/* Pillar 4: Bank Guarantee & EMD Radar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
                    <IconClock className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Pillar 04</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">Bank Guarantee (PBG) &amp; EMD Radar</h3>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    Never lose track of a Performance BG, Mobilization Advance BG, or Earnest Money Deposit. Proactive 30-day alerts notify you before renewal deadlines, preventing departmental invocation and stopping banks from quietly deducting quarterly commission charges on completed projects.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-medium text-slate-500">
                  ✓ Stops recurring bank commission bleed
                </div>
              </div>

              {/* Pillar 5: Partner Capital Parity & Khata */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm md:col-span-2">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-4">
                    <IconScale className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">Pillar 05</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">Partner Capital Parity &amp; Joint Venture Ledger</h3>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    Civil tenders frequently run as multi-partner joint ventures where partners pay for diesel or material out of personal bank accounts or cash drawers. PillarPro logs every out-of-pocket contribution and partner drawing, automatically reconciling equity balances and net profit distributions to prevent painful year-end disputes.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-medium text-slate-500">
                  ✓ Full partnership financial transparency &amp; profit sharing clarity
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── The Complete Operational Floor Suite Grid ────────── */}
        <section id="suite" className="py-16 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                All-In-One Operations
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                The Complete Site Suite You Expect — Plus What Others Can&apos;t Offer
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                PillarPro handles all the everyday site operations you need without needing five different disconnected apps:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Feature 1: Labor Muster Roll */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    👷
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Daily Labor Muster Rolls</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Log mason, beldar, and carpenter attendance, daily wage rates, overtime hours, and cash advance khatas directly from the site supervisor&apos;s phone.
                </p>
              </div>

              {/* Feature 2: Machinery & Diesel Logs */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                    🚜
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Machinery &amp; Diesel Logbooks</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Track excavator, tipper, roller, and batching plant run-hours, fuel issue slips, breakdown downtime, and consumption per hour (ltr/hr) to halt fuel theft.
                </p>
              </div>

              {/* Feature 3: Supplier Khata & Carriage */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                    📦
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Supplier Khata &amp; Carriage</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Procurement ledgers for cement, TMT steel, and aggregate with itemized freight &amp; transport carriage charges. Send 1-click WhatsApp payment khatas.
                </p>
              </div>

              {/* Feature 4: Godown Inventory */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    🏢
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Godown &amp; Material Stock</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Track material inflows and site issues, gate passes, minimum threshold stock warnings, and prevent cement bag expiry or unlogged shrinkage.
                </p>
              </div>

              {/* Feature 5: Petty Cash & Munshi Vouchers */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
                    💵
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Site Petty Cash &amp; Vouchers</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Munshi daily cash reconciliation, hardware shop slips, tea and refreshments, with digital receipt attachments and contractor approval controls.
                </p>
              </div>

              {/* Feature 6: Form 26 e-MB Ready */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-sm">
                    📑
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">BOQ &amp; Form 26 Measurement</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Maintain item-rate BOQ quantities, track previous bill vs cumulative up-to-date execution, and export clean measurement abstracts ready for Junior Engineers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Audit Comparison Specification Table ───────────── */}
        <section id="specification" className="py-16 bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Feature Specification
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                PillarPro vs Generic Spreadsheets & Standard Accounting
              </h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th scope="col" className="p-4">Capability</th>
                    <th scope="col" className="p-4 text-slate-900 bg-slate-100/80 border-x border-slate-200 font-black">PillarPro OS</th>
                    <th scope="col" className="p-4">Excel Spreadsheets</th>
                    <th scope="col" className="p-4">Tally / Standard ERP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr>
                    <th scope="row" className="p-4 font-semibold text-slate-900 font-sans">
                      Government RA Bill Statutory Deductions (Retention, TDS, Cess)
                    </th>
                    <td className="p-4 text-emerald-800 font-semibold bg-emerald-50/50 border-x border-slate-200 flex items-center gap-1.5">
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      Automated & Reconciled
                    </td>
                    <td className="p-4 text-slate-500">Manual formula error risk</td>
                    <td className="p-4 text-slate-500">Requires complex journal adjustments</td>
                  </tr>
                  <tr>
                    <th scope="row" className="p-4 font-semibold text-slate-900 font-sans">
                      Multi-Agency Disbursement Tracking (PFMS, PSU Finance, State Treasuries)
                    </th>
                    <td className="p-4 text-emerald-800 font-semibold bg-emerald-50/50 border-x border-slate-200 flex items-center gap-1.5">
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      Tranche-by-Tranche Audit
                    </td>
                    <td className="p-4 text-rose-600/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      Lost in bank statement rows
                    </td>
                    <td className="p-4 text-rose-600/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      No milestone link
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="p-4 font-semibold text-slate-900 font-sans">
                      Bank Guarantee & EMD Expiry Radar
                    </th>
                    <td className="p-4 text-emerald-800 font-semibold bg-emerald-50/50 border-x border-slate-200 flex items-center gap-1.5">
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      30-Day Automated Alert
                    </td>
                    <td className="p-4 text-rose-600/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      None (Missed surrender)
                    </td>
                    <td className="p-4 text-rose-600/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      No expiry warning system
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="p-4 font-semibold text-slate-900 font-sans">
                      Supplier Procurement with Carriage / Freight Charges
                    </th>
                    <td className="p-4 text-emerald-800 font-semibold bg-emerald-50/50 border-x border-slate-200 flex items-center gap-1.5">
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      Itemized Transport Cost
                    </td>
                    <td className="p-4 text-slate-500">Unclear landed cost</td>
                    <td className="p-4 text-slate-500">Manual voucher split</td>
                  </tr>
                  <tr>
                    <th scope="row" className="p-4 font-semibold text-slate-900 font-sans">
                      Partner Capital Parity & Out-of-Pocket Ledger
                    </th>
                    <td className="p-4 text-emerald-800 font-semibold bg-emerald-50/50 border-x border-slate-200 flex items-center gap-1.5">
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      Real-time Equity Reconciliation
                    </td>
                    <td className="p-4 text-slate-500">Frequent partner disputes</td>
                    <td className="p-4 text-slate-500">Requires chartered accountant</td>
                  </tr>
                  <tr>
                    <th scope="row" className="p-4 font-semibold text-slate-900 font-sans">
                      Mobile Field Usability Under Direct Sunlight
                    </th>
                    <td className="p-4 text-emerald-800 font-semibold bg-emerald-50/50 border-x border-slate-200 flex items-center gap-1.5">
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      High-Contrast Glare-Free UI
                    </td>
                    <td className="p-4 text-rose-600/90 flex items-center gap-1">
                      <IconX className="w-3.5 h-3.5" />
                      Tiny mobile sheet cells
                    </td>
                    <td className="p-4 text-rose-600/90 flex items-center gap-1">
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
        <section id="faq" className="py-16 bg-[#F8FAFC] border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Common Inquiries
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = activeFaq === idx
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm"
                  >
                    <button
                      type="button"
                      id={`faq-btn-${idx}`}
                      onClick={() => toggleFaq(idx)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${idx}`}
                      className="w-full p-4 sm:p-5 text-left font-semibold text-slate-900 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors focus:outline-none"
                    >
                      <span className="text-sm font-bold">{faq.q}</span>
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
                        className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3"
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

        {/* ── Final Call To Action ────────────────────────────── */}
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Take Command of Your Contracting Finances Today
            </h2>
            <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
              Join infrastructure and PWD contractors who have eliminated spreadsheet chaos, audited their statutory deductions, and protected their working capital.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
              >
                <span>Launch Contractor Workspace Free</span>
                <IconArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              No credit card required. Isolated database partition provisioned in 30 seconds.
            </p>
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
      <footer className="py-8 pb-24 md:pb-8 border-t border-slate-200 bg-white text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo theme="light" size="sm" href="/" />
            <span className="text-slate-500 text-[11px]">
              — Financial & Operations OS for Infrastructure Contractors
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[11px] text-slate-600 font-medium">
            <Link href="/pricing" className="hover:text-slate-900 transition-colors">Plans & Pricing</Link>
            <Link href="/sign-in" className="hover:text-slate-900 transition-colors">Sign In</Link>
            <Link href="/sign-up" className="hover:text-slate-900 transition-colors">Create Firm Workspace</Link>
            <a href="mailto:contact@pillarprojk.com" className="hover:text-slate-900 transition-colors">Contact Us</a>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
            <span className="text-slate-400">© 2026 PillarPro. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* ── Sticky Mobile Action Bar (Clean High-Contrast) ──── */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden p-3 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">PillarPro OS</p>
            <p className="text-[10px] text-slate-500 truncate">Civil Contractor Financials</p>
          </div>
          <Link
            href={isLoggedIn ? '/dashboard' : '/sign-up'}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm shrink-0"
          >
            <span>{isLoggedIn ? 'Dashboard' : 'Start Trial'}</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
