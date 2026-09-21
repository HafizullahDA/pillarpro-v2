'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

// ── Icons ──────────────────────────────────────────────────────────
function IconCheck({ className = 'w-4 h-4 text-emerald-600' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconMinus({ className = 'w-4 h-4 text-slate-300' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
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

function IconShieldCheck({ className = 'w-5 h-5 text-blue-600' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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

export function PricingClient() {
  // Default to Monthly as requested
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [activeFaq, setActiveFaq] = useState<number | null>(0)

  // Interactive Calculator State
  const [calcSites, setCalcSites] = useState<number>(4)
  const [calcTeamMembers, setCalcTeamMembers] = useState<number>(12)

  // Per-seat competitor baseline: ₹700/user/month (Powerplay / Onsite standard)
  const competitorMonthlyPerUser = 700
  const competitorAnnualCost = calcTeamMembers * competitorMonthlyPerUser * 12

  // PillarPro Option B Pricing:
  // Bootstrap: ₹999/mo or ₹9,999/yr
  // Growth: ₹1,999/mo or ₹19,999/yr
  // Enterprise: ₹3,999/mo or ₹39,999/yr (+₹300/site/mo for sites beyond 15)
  const pillarProAnnualCost =
    calcSites <= 2
      ? (billingCycle === 'annual' ? 9999 : 999 * 12)
      : calcSites <= 6
      ? (billingCycle === 'annual' ? 19999 : 1999 * 12)
      : (billingCycle === 'annual'
          ? 39999 + Math.max(0, calcSites - 15) * 300 * 12
          : (3999 + Math.max(0, calcSites - 15) * 300) * 12)

  const pillarProTierName =
    calcSites <= 2 ? 'Bootstrap Plan' : calcSites <= 6 ? 'Growth Contractor' : 'Enterprise Infra'
  const annualSavings = Math.max(0, competitorAnnualCost - pillarProAnnualCost)
  const savingsPercent = Math.round((annualSavings / Math.max(1, competitorAnnualCost)) * 100)

  const faqs = [
    {
      q: 'Is there a free trial before paying?',
      a: 'Yes, every contractor gets a 14-day full-featured free trial with zero credit card required. You can set up your active project, invite your site engineers, take measurements, and generate actual CPWD/PWD RA bills immediately.',
    },
    {
      q: 'What counts as an "Active Site"? How does archiving work?',
      a: 'An Active Site is any contract package actively incurring ongoing material purchases, site muster roll logs, or milestone RA billing. When a project reaches physical completion and enters the Defect Liability Period (DLP), you can archive it with 1 click. Archived sites do not count toward your active site quota, yet all historical measurement sheets, RA bills, and statutory records remain 100% permanently searchable and exportable.',
    },
    {
      q: 'Why does PillarPro provide Unlimited Users instead of charging per seat?',
      a: 'Indian civil contracting operations fail when software charges per user. When competitors charge ₹700 to ₹1,000 per seat per month, contractors avoid giving accounts to site munshis, junior supervisors, storekeepers, or subcontractors—leading to shared passwords, inaccurate muster rolls, and lost paper bills. With PillarPro, you pay strictly for your active packages and invite as many field and office staff as you need with zero incremental fee.',
    },
    {
      q: 'Can we pay via UPI, NEFT, RTGS, or Net Banking?',
      a: 'Yes. We accept all standard payment methods including UPI (Google Pay, PhonePe, Paytm, BHIM), Corporate Net Banking, NEFT/RTGS bank transfers, and all major Credit & Debit cards.',
    },
    {
      q: 'Do you provide an official B2B GST Tax Invoice with Input Tax Credit (ITC)?',
      a: 'Yes, absolutely. During checkout or in your firm settings, enter your registered GSTIN. PillarPro automatically issues a compliant B2B Tax Invoice with 18% GST (SAC 998314 - IT Software Services), enabling your firm to claim 100% Input Tax Credit on your monthly GSTR-2B filing.',
    },
    {
      q: 'How does the Delay Defense & Digital Hindrance Register prevent liquidated damages?',
      a: 'Under standard CPWD Clause 2 and Clause 5 GCC, delays not formally notified within 14 days of occurrence are contractually time-barred, allowing the department to impose up to 10% Liquidated Damages (compensation for delay). PillarPro’s Delay Defense module logs hindrances per CPWD Appendix 21, tracks the statutory 14-day clock, and auto-compiles Clause 5 legal notices and Form 27 Extension of Time (EOT) dossiers to protect your payment margins.',
    },
    {
      q: 'Can site engineers and munshis use the app on mobile with poor internet?',
      a: 'Yes. PillarPro is built as a progressive web application (PWA) with high-contrast architectural UI designed specifically for bright sunlight on site. Muster rolls, material delivery slips, and daily site logs can be entered offline and sync automatically once a 3G/4G connection resumes.',
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

          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <Link href="/#audit-preview" className="hover:text-slate-900 transition-colors">Bill Audit</Link>
            <Link href="/#calculator" className="hover:text-slate-900 transition-colors">Deductions</Link>
            <a href="#plans" className="text-slate-900 font-bold border-b-2 border-slate-900 pb-0.5">Plans & Pricing</a>
            <a href="#calculator-section" className="hover:text-slate-900 transition-colors">Savings Calculator</a>
            <a href="#matrix" className="hover:text-slate-900 transition-colors">Feature Matrix</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
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
              <span>Start 14-Day Free Trial</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main id="main-content" className="pb-20">
        
        {/* ── Hero Header ──────────────────────────────────────── */}
        <section className="pt-14 pb-12 sm:pt-20 sm:pb-16 bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            
            {/* 14-Day Free Trial Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-wide mb-6 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>14-DAY FREE TRIAL ON ALL PLANS • NO CREDIT CARD REQUIRED</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              Fair, Transparent Pricing for Indian Civil Contractors
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Never pay per site supervisor, engineer, or munshi. Pay strictly for the active projects your firm is currently executing. Invite your entire field and head office team with zero incremental seat fees.
            </p>

            {/* Billing Toggle Switcher */}
            <div className="mt-9 inline-flex items-center justify-center p-1.5 rounded-xl bg-slate-100 border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Annual Billing</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-500 text-white">
                  Save ~17% (2 Mo Free)
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ── Pricing Cards Grid ───────────────────────────────── */}
        <section id="plans" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            
            {/* ── CARD 1: Bootstrap / Sub-Contractor ─── */}
            <div className="flex flex-col rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-3">
                  Sub-Contractor & Starter
                </div>
                <h2 className="text-xl font-bold text-slate-900">Bootstrap</h2>
                <p className="mt-1 text-xs text-slate-500 min-h-[32px]">
                  Ideal for proprietorships, sub-contractors, and civil firms running 1–2 ongoing packages.
                </p>
              </div>

              <div className="mb-6 pb-6 border-b border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                    {billingCycle === 'annual' ? '₹9,999' : '₹999'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {billingCycle === 'annual' ? '/ year' : '/ month'}
                  </span>
                </div>
                {billingCycle === 'annual' ? (
                  <p className="mt-1 text-[11px] text-emerald-700 font-medium">
                    Equivalent to ₹833 / month (excl. GST)
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-500 font-medium">
                    or ₹9,999 / year billed annually (Save ~17%)
                  </p>
                )}
              </div>

              {/* Core Limits */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-6 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <span>Active Project Sites</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold">Up to 2 Sites</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <span>Site Munshis & Staff</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">Unlimited Users</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <span>Archived Completed Sites</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold">Unlimited (Free)</span>
                </div>
              </div>

              {/* Feature List */}
              <div className="flex-1 space-y-3 mb-8">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Included Features</p>
                <ul className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Running Account (RA) Bills & Department Invoicing</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Statutory Deductions Ledger (TDS 194C, GST TDS Sec 51, 1% Labour Cess, Security Deposit)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Multi-Tranche Treasury & PFMS Bank Credit Ledger</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Daily Labour Muster Roll & Daily Site Log</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Supplier & Sub-Contractor Khata with Carriage Tracking</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Standard PDF Statement & Voucher Exports</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Standard Email & Helpdesk Support</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/sign-up?plan=bootstrap"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <span>Start 14-Day Free Trial</span>
                <IconArrowRight className="w-4 h-4 text-slate-600" />
              </Link>
            </div>

            {/* ── CARD 2: Growth Contractor (RECOMMENDED) ─── */}
            <div className="relative flex flex-col rounded-2xl bg-slate-900 text-white border-2 border-slate-900 p-6 sm:p-8 shadow-xl">
              {/* Highlight Ribbon */}
              <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                <span className="px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-emerald-500 text-white shadow-md flex items-center gap-1.5">
                  <IconShieldCheck className="w-3.5 h-3.5 text-white" />
                  Recommended for Class-A & PWD Contractors
                </span>
              </div>

              <div className="mb-6 pt-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-3">
                  Prime Contractor Multi-Site
                </div>
                <h2 className="text-xl font-bold text-white">Growth Contractor</h2>
                <p className="mt-1 text-xs text-slate-300 min-h-[32px]">
                  Engineered for active Class-A contractors executing multiple divisions across State PWD, CPWD, PMGSY, or Railways.
                </p>
              </div>

              <div className="mb-6 pb-6 border-b border-slate-800">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">
                    {billingCycle === 'annual' ? '₹19,999' : '₹1,999'}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {billingCycle === 'annual' ? '/ year' : '/ month'}
                  </span>
                </div>
                {billingCycle === 'annual' ? (
                  <p className="mt-1 text-[11px] text-emerald-400 font-medium">
                    Equivalent to ₹1,666 / month (excl. GST)
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-emerald-400 font-medium">
                    or ₹19,999 / year billed annually (Save ~17%)
                  </p>
                )}
              </div>

              {/* Core Limits */}
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 mb-6 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <span>Active Project Sites</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-bold text-emerald-400">Up to 6 Sites</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <span>Site Munshis & Staff</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">Unlimited Users</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <span>Archived Completed Sites</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-bold">Unlimited (Free)</span>
                </div>
              </div>

              {/* Feature List */}
              <div className="flex-1 space-y-3 mb-8">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Everything in Bootstrap, plus:</p>
                <ul className="space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Full SOR BOQ & e-MB Measurement Book</strong> with chainage & structural dimensions</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>CPWD / PWD Form 26 Measurement Book</strong> with 3-tier signature blocks (JE / AE / EE)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Delay Defense & EOT Engine</strong> (CPWD Appendix 21 Digital Hindrance Register & 14-Day Notice Clock)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>10% Liquidated Damages Shield</strong> with auto-generated Clause 5 GCC legal notices</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>AI Receipt & Fuel Slip OCR Scanner</strong> (150 scans/month included)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Partner Equity & Cash Drawing Parity</strong> (eliminate JV disputes)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>PBG & Security Deposit Expiry Radar</strong> with 30-day early claim alerts</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Priority WhatsApp & Phone Support</strong> from civil engineering operations team</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/sign-up?plan=growth"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-md"
              >
                <span>Start 14-Day Free Trial</span>
                <IconArrowRight className="w-4 h-4 text-slate-900" />
              </Link>
            </div>

            {/* ── CARD 3: Enterprise Infra ─── */}
            <div className="flex flex-col rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-3">
                  Infra Conglomerates & EPC
                </div>
                <h2 className="text-xl font-bold text-slate-900">Enterprise Infra</h2>
                <p className="mt-1 text-xs text-slate-500 min-h-[32px]">
                  For large EPC builders, multi-firm groups, and joint-venture contractors with heavy site rosters.
                </p>
              </div>

              <div className="mb-6 pb-6 border-b border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                    {billingCycle === 'annual' ? '₹39,999' : '₹3,999'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {billingCycle === 'annual' ? '/ year' : '/ month'}
                  </span>
                </div>
                {billingCycle === 'annual' ? (
                  <p className="mt-1 text-[11px] text-emerald-700 font-medium">
                    Equivalent to ₹3,333 / month (excl. GST)
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-500 font-medium">
                    or ₹39,999 / year billed annually (Save ~17%)
                  </p>
                )}
              </div>

              {/* Core Limits */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-6 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <span>Active Project Sites</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold">15 Sites (+₹300/site/mo)</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <span>Site Munshis & Staff</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">Unlimited Users</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <span>Archived Completed Sites</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold">Unlimited (Free)</span>
                </div>
              </div>

              {/* Feature List */}
              <div className="flex-1 space-y-3 mb-8">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Everything in Growth, plus:</p>
                <ul className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>CPWD Form 27 Delay Defense Dossier</strong> (Comprehensive legal claim pack for Executive Engineer clearance)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Multi-Entity / Multi-Firm Consolidated Dashboard</strong> for sister contracting concerns</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Unlimited AI Receipt & Fuel Challan OCR</strong> scans across all sites</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Custom Department Deduction Formulas</strong> (State PWD, MES, NHAI, CPWD specific schedules)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Tally Prime & ERP Connector</strong> ready for automated ledger export</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Dedicated Account Manager</strong> with on-site staff and munshi onboarding session</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Custom Service Level Agreement (99.9% Uptime)</strong> and dedicated data retention</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <Link
                  href="/sign-up?plan=enterprise"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <span>Start 14-Day Free Trial</span>
                  <IconArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="mailto:contact@pillarprojk.com?subject=Enterprise%20Infra%20Plan%20Inquiry"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <span>Need custom tender capacity? Talk to Enterprise Team</span>
                </a>
              </div>
            </div>

          </div>
        </section>

        {/* ── Enterprise Add-Ons Section ───────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Specialized Contractor Add-ons</h3>
                <p className="text-xs text-slate-500 mt-1">Optional high-leverage services to accelerate accounting sync and tender startup.</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                Available on Growth & Enterprise
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-900">Tally Prime Direct Sync Connector</h4>
                    <span className="text-xs font-extrabold text-slate-900">₹6,000 / year</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Automated 2-way sync connecting PillarPro RA bill disbursements, statutory deduction ledgers, and supplier khata vouchers directly with your chartered accountant’s Tally Prime. Eliminates manual double-entry.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Instant XML & ODBC Bridge</span>
                  <a href="mailto:contact@pillarprojk.com?subject=Tally%20Prime%20Connector%20Addon" className="text-blue-600 hover:text-blue-800 font-bold">Inquire Addon →</a>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-900">Assisted Tender & BOQ Digitization</h4>
                    <span className="text-xs font-extrabold text-slate-900">₹2,500 / tender</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Send us your scanned government tender PDF or CPWD Bill of Quantities schedule. Our dedicated civil engineering ops team digitizes and structures every item into your workspace within 12 hours so your site engineers can start taking measurements immediately.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>100% Item-by-Item Verification</span>
                  <a href="mailto:contact@pillarprojk.com?subject=Tender%20Digitization%20Addon" className="text-blue-600 hover:text-blue-800 font-bold">Book Tender Setup →</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Interactive Savings Calculator Section ────────────── */}
        <section id="calculator-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 sm:p-10 shadow-xl border border-slate-800">
            <div className="max-w-3xl mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider mb-3 border border-blue-500/30">
                Cost Comparison Analysis
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Why Per-Active-Site Pricing Beats Per-Seat Software
              </h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Generic site apps like Powerplay or Onsite charge ₹700 to ₹1,000 per user every month. In Indian civil contracting, you have project managers, billing engineers, junior munshis, storekeepers, and partners. Watch how much your firm saves with PillarPro’s unlimited users model.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Sliders (Left Column) */}
              <div className="lg:col-span-7 space-y-6 bg-slate-800/60 p-6 rounded-xl border border-slate-700/80">
                {/* Active Sites Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="sites-slider" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Active Project Sites
                    </label>
                    <span className="px-2.5 py-1 rounded-md bg-slate-900 text-emerald-400 font-mono font-bold text-sm border border-slate-700">
                      {calcSites} Active Sites
                    </span>
                  </div>
                  <input
                    id="sites-slider"
                    type="range"
                    min="1"
                    max="15"
                    value={calcSites}
                    onChange={(e) => setCalcSites(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                    <span>1 Site</span>
                    <span>6 Sites</span>
                    <span>15 Sites</span>
                  </div>
                </div>

                {/* Team Members Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="team-slider" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Total Team Members (Engineers, Munshis, Storekeepers, Partners)
                    </label>
                    <span className="px-2.5 py-1 rounded-md bg-slate-900 text-blue-400 font-mono font-bold text-sm border border-slate-700">
                      {calcTeamMembers} Members
                    </span>
                  </div>
                  <input
                    id="team-slider"
                    type="range"
                    min="3"
                    max="40"
                    value={calcTeamMembers}
                    onChange={(e) => setCalcTeamMembers(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                    <span>3 Users</span>
                    <span>20 Users</span>
                    <span>40 Users</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-700 text-xs text-slate-300 flex items-start gap-2.5">
                  <span className="text-base">💡</span>
                  <span>
                    <strong>Zero Seat Friction:</strong> With PillarPro, adding 10 more site supervisors across your bridges or road chainages costs <strong>₹0 extra</strong>. In contrast, per-seat software charges an extra ₹84,000/year for those 10 seats.
                  </span>
                </div>
              </div>

              {/* Real-time Math Output (Right Column) */}
              <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-xl bg-slate-800 border border-slate-700 space-y-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Annual Software Cost Comparison</p>
                  
                  {/* Competitor Per-Seat Cost */}
                  <div className="mt-3 flex items-baseline justify-between pb-3 border-b border-slate-700">
                    <span className="text-xs text-slate-400">Legacy Per-Seat Apps (₹700/seat/mo)</span>
                    <span className="text-sm font-mono font-bold text-red-400">
                      ₹{competitorAnnualCost.toLocaleString('en-IN')}/yr
                    </span>
                  </div>

                  {/* PillarPro Plan */}
                  <div className="mt-3 flex items-baseline justify-between pb-3 border-b border-slate-700">
                    <div>
                      <span className="text-xs font-semibold text-white">PillarPro ({pillarProTierName})</span>
                      <p className="text-[10px] text-emerald-400 font-medium">Unlimited Users Included</p>
                    </div>
                    <span className="text-sm font-mono font-bold text-emerald-400">
                      ₹{pillarProAnnualCost.toLocaleString('en-IN')}/yr
                    </span>
                  </div>
                </div>

                {/* Net Savings Box */}
                <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-center">
                  <p className="text-xs uppercase tracking-wider font-extrabold text-emerald-400">Your Annual Cash Savings</p>
                  <p className="text-3xl font-extrabold text-white font-mono mt-1">
                    ₹{annualSavings.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-emerald-300 mt-0.5 font-medium">
                    {savingsPercent}% less expensive + CPWD Statutory Compliance
                  </p>
                </div>

                <Link
                  href={`/sign-up?plan=${calcSites <= 2 ? 'bootstrap' : calcSites <= 6 ? 'growth' : 'enterprise'}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-sm"
                >
                  <span>Start 14-Day Free Trial</span>
                  <IconArrowRight className="w-4 h-4 text-slate-900" />
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* ── Feature Comparison Matrix ────────────────────────── */}
        <section id="matrix" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Comprehensive Feature Matrix
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Compare capabilities across tiers to select the ideal operational setup for your civil contracting firm.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="py-4 px-6 font-bold text-slate-900 w-2/5">Capabilities & Specifications</th>
                  <th className="py-4 px-4 font-bold text-slate-900 text-center w-1/5">Bootstrap (₹999/mo)</th>
                  <th className="py-4 px-4 font-bold text-emerald-700 text-center w-1/5 bg-emerald-50/40 border-x border-emerald-100">
                    Growth (₹1,999/mo)
                  </th>
                  <th className="py-4 px-4 font-bold text-slate-900 text-center w-1/5">Enterprise (₹3,999/mo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                
                {/* Group 1: Project & Seat Limits */}
                <tr className="bg-slate-100/60">
                  <td colSpan={4} className="py-2.5 px-6 font-bold text-[11px] uppercase tracking-wider text-slate-600">
                    Project Capacity & Seats
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">Active Project Sites</td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-900">Up to 2 Sites</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-700 bg-emerald-50/20 border-x border-emerald-100">Up to 6 Sites</td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-900">Up to 15 Sites (+₹300/site)</td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">Archived Projects (Historical Records)</td>
                  <td className="py-3 px-4 text-center text-slate-900 font-semibold">Unlimited</td>
                  <td className="py-3 px-4 text-center text-slate-900 font-semibold bg-emerald-50/20 border-x border-emerald-100">Unlimited</td>
                  <td className="py-3 px-4 text-center text-slate-900 font-semibold">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">User Seats (Munshis, Supervisors, Partners)</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-700">Unlimited</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-700 bg-emerald-50/20 border-x border-emerald-100">Unlimited</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-700">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">Per-Seat Surcharges</td>
                  <td className="py-3 px-4 text-center text-emerald-700 font-semibold">₹0 (Free)</td>
                  <td className="py-3 px-4 text-center text-emerald-700 font-semibold bg-emerald-50/20 border-x border-emerald-100">₹0 (Free)</td>
                  <td className="py-3 px-4 text-center text-emerald-700 font-semibold">₹0 (Free)</td>
                </tr>

                {/* Group 2: Billing & CPWD/PWD Accounting */}
                <tr className="bg-slate-100/60">
                  <td colSpan={4} className="py-2.5 px-6 font-bold text-[11px] uppercase tracking-wider text-slate-600">
                    Statutory Billing & CPWD/PWD Accounting
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">RA Bill Invoicing & Milestone Tracking</td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">Statutory Deductions (194C, GST TDS, Cess, Retention)</td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">Multi-Tranche Treasury / PFMS Bank Reconciliation</td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">Full Schedule of Rates (SOR) BOQ & e-MB Measurement Book</td>
                  <td className="py-3 px-4 text-center"><IconMinus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">CPWD / PWD Form 26 MB Export with 3-Tier Signatures (JE/AE/EE)</td>
                  <td className="py-3 px-4 text-center"><IconMinus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>

                {/* Group 3: Delay Defense & Legal Claims */}
                <tr className="bg-slate-100/60">
                  <td colSpan={4} className="py-2.5 px-6 font-bold text-[11px] uppercase tracking-wider text-slate-600">
                    Delay Defense & Statutory Claims (Clause 5 GCC)
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">CPWD Appendix 21 Digital Hindrance Register</td>
                  <td className="py-3 px-4 text-center"><IconMinus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">Statutory 14-Day Notice Clock & Warning Alerts</td>
                  <td className="py-3 px-4 text-center"><IconMinus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">1-Click Clause 5 Legal Notice Generator (to Executive Engineer)</td>
                  <td className="py-3 px-4 text-center"><IconMinus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">CPWD Form 27 Delay Defense Legal Immunity Dossier</td>
                  <td className="py-3 px-4 text-center"><IconMinus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-slate-500 bg-emerald-50/20 border-x border-emerald-100">Standard Summary</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">Comprehensive Dossier</td>
                </tr>

                {/* Group 4: Operations & Management */}
                <tr className="bg-slate-100/60">
                  <td colSpan={4} className="py-2.5 px-6 font-bold text-[11px] uppercase tracking-wider text-slate-600">
                    Field Operations & Corporate Governance
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">Daily Labour Muster Roll & Wage Tracking</td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">AI Slip & Invoice OCR Scanner</td>
                  <td className="py-3 px-4 text-center text-slate-400">Manual Entry</td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-900 bg-emerald-50/20 border-x border-emerald-100">150 Scans / mo</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-700">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">Partner Equity & Drawing Parity Ledger (JV Tenders)</td>
                  <td className="py-3 px-4 text-center"><IconMinus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">Performance BG & Security Deposit Expiry Radar</td>
                  <td className="py-3 px-4 text-center"><IconMinus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/20 border-x border-emerald-100"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">Multi-Firm / Sister Entity Consolidation</td>
                  <td className="py-3 px-4 text-center"><IconMinus className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-slate-400 bg-emerald-50/20 border-x border-emerald-100">Single Firm</td>
                  <td className="py-3 px-4 text-center"><IconCheck className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                </tr>

                {/* Group 5: Support & SLA */}
                <tr className="bg-slate-100/60">
                  <td colSpan={4} className="py-2.5 px-6 font-bold text-[11px] uppercase tracking-wider text-slate-600">
                    Support & Onboarding
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">Technical Support Channel</td>
                  <td className="py-3 px-4 text-center text-slate-600">Email & Docs</td>
                  <td className="py-3 px-4 text-center font-semibold text-emerald-700 bg-emerald-50/20 border-x border-emerald-100">Priority WhatsApp & Phone</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">Dedicated Account Exec</td>
                </tr>
                <tr>
                  <td className="py-3 px-6 font-medium">Staff & Site Munshi Onboarding Assistance</td>
                  <td className="py-3 px-4 text-center text-slate-400">Self-serve Guides</td>
                  <td className="py-3 px-4 text-center text-slate-700 bg-emerald-50/20 border-x border-emerald-100">Video Walkthrough</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">1-on-1 Remote / Site Call</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── FAQ Section ──────────────────────────────────────── */}
        <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-18">
          <div className="text-center mb-10">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Clear answers for civil engineering contractors, chartered accountants, and managing partners.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index
              return (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-white transition-colors overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:text-slate-800 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <IconChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-slate-900' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Final Conversion CTA Banner ──────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-18">
          <div className="rounded-2xl bg-slate-900 text-white p-8 sm:p-12 text-center shadow-xl border border-slate-800">
            <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Stop Leaking RA Bill Deductions & Unclaimed Delays
            </h3>
            <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Join leading civil contractors across CPWD, State PWD, and PMGSY. Set up your active project in under 2 minutes and defend every rupee of your contract margin.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-sm"
              >
                <span>Launch 14-Day Free Trial</span>
                <IconArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:contact@pillarprojk.com?subject=Contractor%20Demo%20Request"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
              >
                <span>Request Assisted Demo</span>
              </a>
            </div>
            <p className="mt-5 text-[11px] text-slate-400">
              No credit card required • Official GST B2B Invoice • CPWD Clause 5 & Form 26 Compliant
            </p>
          </div>
        </section>

      </main>

      {/* ── Architectural Footer ─────────────────────────────── */}
      <footer className="py-8 border-t border-slate-200 bg-white text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo theme="light" size="sm" href="/" />
            <span className="text-slate-500 text-[11px]">
              — Financial & Operations OS for Infrastructure Contractors
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[11px] text-slate-600 font-medium">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Link href="/sign-in" className="hover:text-slate-900 transition-colors">Sign In</Link>
            <Link href="/sign-up" className="hover:text-slate-900 transition-colors">Create Firm Workspace</Link>
            <a href="mailto:contact@pillarprojk.com" className="hover:text-slate-900 transition-colors">Contact Us</a>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
            <span className="text-slate-400">© 2026 PillarPro. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
