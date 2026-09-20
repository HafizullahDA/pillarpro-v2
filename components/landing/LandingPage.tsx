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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold tracking-wide mb-6">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span>CPWD (PFMS) • NHPC & PSUs (FINANCE) • STATE PWD & PMGSY (TREASURY)</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              The Financial Operating System for Indian Civil Contractors
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
              Stop leaking profits in spreadsheets. Reconcile multi-crore milestone contracts against statutory deductions (5% Retention, IT TDS, GST TDS, Labour Cess) and disbursements across <strong className="text-slate-900">PFMS</strong>, <strong className="text-slate-900">PSU Corporate Finance</strong>, and <strong className="text-slate-900">State Treasuries</strong>. Eliminate partner disputes and track site khatas with zero lost paper.
            </p>

            {/* Quiet, Grounded Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
              >
                <span>Launch Contractor Workspace</span>
                <IconArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#audit-preview"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <span>View Live Contract Audit</span>
                <IconChevronDown className="w-4 h-4 text-slate-500" />
              </a>
            </div>

            {/* Contractor Credibility Badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-8 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-4 h-4 text-slate-700" />
                Built for Class-A & Prime Civil Contractors
              </span>
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-4 h-4 text-slate-700" />
                30-Second Self-Serve Setup
              </span>
              <span className="flex items-center gap-1.5">
                <IconCheck className="w-4 h-4 text-slate-700" />
                Multi-Tenant Encrypted RLS Isolation
              </span>
            </div>
          </div>
        </section>

        {/* ── Hero Anchor: Authentic Bill Audit Sheet Preview ─── */}
        <section id="audit-preview" className="py-12 md:py-16 bg-[#F8FAFC] border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {/* Document Header Bar */}
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Government Milestone Contract Audit Voucher
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                    NH-44 Bypass 4-Lane Widening & Culvert Package (Pkg-02)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Agency: PWD (R&B) Division / CPWD (PFMS) / NHPC • Agreement Value: ₹18.50 Cr
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Status: RA Bill 01 Certified & Reconciled
                  </span>
                </div>
              </div>

              {/* 3-Column Financial Audit Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                {/* Column 1: Gross Certified */}
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
                      <span>Sub-Base & RCC Culverts:</span>
                      <span className="font-semibold text-slate-900">₹23,50,000</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Statutory Deductions */}
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
                      <span className="font-mono font-medium text-slate-900">₹42,00,0</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-200">
                    Retention tracked for Defect Liability Period (DLP) release.
                  </p>
                </div>

                {/* Column 3: Multi-Tranche Disbursements */}
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
                      <span>Tranche #2 (Balance Credit):</span>
                      <span className="font-semibold text-slate-900">₹17,80,000</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-100 font-bold text-slate-900">
                      <span>Net Audit Variance:</span>
                      <span className="text-emerald-700">₹0 (Matched)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-world Operational Radar Footer */}
              <div className="px-5 py-3.5 bg-slate-100/70 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-slate-700">
                    <strong className="text-slate-900">BG Radar:</strong> PBG/8912 expires in 24 days (Executive Engineer extension alert active)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                  <span className="text-slate-700">
                    <strong className="text-slate-900">Site Munshi:</strong> 16 workers on site, muster roll verified
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                  <span className="text-slate-700">
                    <strong className="text-slate-900">Supplier Khata:</strong> Cement challan + carriage charges logged
                  </span>
                </div>
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

        {/* ── The 3 Real Moats (Replacing Generic AI Cards) ───── */}
        <section id="capabilities" className="py-16 md:py-20 bg-[#F8FAFC] border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Purpose-Built for Infrastructure
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-1 tracking-tight">
                Three Capabilities That Separate Us From Generic Software
              </h2>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                Generic apps treat civil contracting like retail inventory or office task boards. PillarPro solves the four brutal financial bottlenecks that cause contractors to bleed money.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Moat 1: Multi-Agency RA Bill Audit */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center mb-4">
                    <IconFileText className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pillar 01</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">Multi-Agency RA Bill Audit & Deductions</h3>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    Built for <strong className="text-slate-900">CPWD</strong> (audited by Accounts Branch & credited via PFMS), <strong className="text-slate-900">NHPC & PSUs</strong> (disbursed through corporate finance RTGS), and <strong className="text-slate-900">State PWD & PMGSY</strong> (disbursed through State Treasuries). Reconciles statutory deductions and split bank credit tranches down to the exact rupee.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-medium text-slate-500">
                  ✓ Retention, IT TDS, GST TDS & Labour Cess
                </div>
              </div>

              {/* Moat 2: Bank Guarantee & EMD Radar */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center mb-4">
                    <IconShieldAlert className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pillar 02</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">Bank Guarantee (PBG) & EMD Radar</h3>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    Never lose track of a Performance BG, Mobilization Advance BG, or Earnest Money Deposit. Proactive 30-day alerts notify you before renewal deadlines, preventing departmental invocation and stopping banks from quietly deducting quarterly commission charges on completed projects.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-medium text-slate-500">
                  ✓ Protects working capital & bank credit limits
                </div>
              </div>

              {/* Moat 3: Partner Capital Parity & Field Khata */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center mb-4">
                    <IconScale className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pillar 03</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">Partner Parity & Field Site Khata</h3>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    Civil tenders run as multi-partner joint ventures. PillarPro tracks out-of-pocket partner payments (SBI personal, cash drawers) and capital infusions. Field supervisors log supplier deliveries with itemized <strong className="text-slate-900">carriage/transport charges</strong> and send 1-click WhatsApp Khatas.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-medium text-slate-500">
                  ✓ Zero partner disputes & carriage cost tracking
                </div>
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
            <Link href="/sign-in" className="hover:text-slate-900 transition-colors">Sign In</Link>
            <Link href="/sign-up" className="hover:text-slate-900 transition-colors">Create Firm Workspace</Link>
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
