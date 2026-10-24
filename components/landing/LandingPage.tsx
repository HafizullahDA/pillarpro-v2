'use client'

import { useState, useEffect } from 'react'
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

const SAMPLE_TALLY_XML = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Journal" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>20261024</DATE>
            <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
            <VOUCHERNUMBER>JV/2026-27/RA-04</VOUCHERNUMBER>
            <NARRATION>Gross work certified for RA Bill #04 (Agmt EE/NHAI/PKG-04/2025-26) with SD (5%), IT-TDS (2%), GST-TDS (2%), BOCW Cess (1%), Mobilization recovery (10%), and Mining Royalty credited to respective ledgers.</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Executive Engineer NHAI Bareilly</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-4575000.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Security Deposit Retention Fund A/c</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>228750.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>TDS Payable u/s 194C (Income Tax)</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>91500.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>GST-TDS Payable (CGST 1% + SGST 1%)</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>91500.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>BOCW Labour Welfare Cess Payable</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>45750.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Mobilization Advance Recovery A/c</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>457500.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Mining Royalty Deductions A/c</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>38200.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Civil Contract Revenue Realization</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>3621800.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`

export function LandingPage({
  isLoggedIn = false,
  userName,
  orgName,
}: LandingPageProps) {
  const [walkthroughOpen, setWalkthroughOpen] = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [previewTimeRange, setPreviewTimeRange] = useState<'month' | 'quarter' | 'all'>('month')
  const [activeOutputTab, setActiveOutputTab] = useState<'form26' | 'emb' | 'tally'>('form26')
  const [showXmlSnippet, setShowXmlSnippet] = useState(false)
  const [copiedXml, setCopiedXml] = useState(false)

  const handleCopyXml = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_TALLY_XML)
      setCopiedXml(true)
      setTimeout(() => setCopiedXml(false), 2000)
    } catch {
      const input = document.createElement('textarea')
      input.value = SAMPLE_TALLY_XML
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopiedXml(true)
      setTimeout(() => setCopiedXml(false), 2000)
    }
  }

  // Intercept any Supabase auth recovery tokens or errors that land on root
  useEffect(() => {
    if (typeof window === 'undefined') return

    const hash = window.location.hash
    const search = window.location.search

    // 1. Password Recovery Tokens (implicit flow hash #access_token=...&type=recovery or search code)
    if (hash.includes('type=recovery') || hash.includes('access_token=') || search.includes('code=')) {
      window.location.replace(`/reset-password${search}${hash}`)
      return
    }

    // 2. Auth Errors (e.g. otp_expired / access_denied in hash or query)
    if (hash.includes('error=') || search.includes('error=')) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
      const searchParams = new URLSearchParams(search.replace(/^\?/, ''))
      const errorCode = hashParams.get('error_code') || searchParams.get('error_code')
      const errorDesc = hashParams.get('error_description') || searchParams.get('error_description')

      const message = errorCode === 'otp_expired'
        ? 'Your password reset link has expired because a newer link was requested or the time limit was reached. Please request a fresh reset link below.'
        : errorDesc || 'The password reset link was invalid or expired. Please request a new recovery link.'

      window.location.replace(`/forgot-password?error=${encodeURIComponent(message.replace(/\+/g, ' '))}`)
      return
    }
  }, [])

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
            <a href="#sample-outputs" className="hover:text-slate-900 transition-colors">Sample Outputs</a>
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
                  className="group hidden sm:inline-flex items-center justify-center gap-2 border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 hover:text-slate-950 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all shadow-2xs hover:shadow-xs hover:border-slate-300 cursor-pointer active:scale-[0.99]"
                >
                  <svg
                    className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 transition-colors shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <span>Contact Sales</span>
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

            {/* ── PILLAR 2: DIGITAL E-MB & CHAINAGE MEASUREMENT SHEETS ── */}
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
                  Digital e-MB &amp; Chainage Measurement Sheets
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Record daily field measurements directly by chainage. Features automated L×B×D deduction sheets, TMT Bar Bending Schedule (BBS) calculations, Level Book Reduced Levels (RL), and proactive quantity variation detection before Junior Engineer (JE) scrutiny.
                </p>
              </div>

              {/* Mini Preview Box */}
              <div className="rounded-lg border border-slate-200 overflow-hidden min-w-0">
                <div className="bg-slate-100 text-slate-800 border-b border-slate-200 px-3.5 py-2 text-xs font-semibold flex flex-wrap items-center justify-between gap-2">
                  <span>e-MB Sheet No. 491 • Page 18</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    JE Verified &amp; Scrutinized
                  </span>
                </div>
                <div className="p-3.5 bg-white space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span>Chainage: <strong className="text-slate-900 font-semibold tabular-nums">Ch. 14+200 to 14+350 (LHS)</strong></span>
                    <span>Structure: <strong className="text-slate-900">Culvert #4 Pier Cap &amp; Deck</strong></span>
                  </div>

                  {/* Multi-Row L×B×D, BBS, and Level Book Box */}
                  <div className="space-y-1.5 rounded-lg bg-slate-50 border border-slate-200 p-2.5 tabular-nums text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-600">L×B×D: 1 × 24.50m × 3.20m × 0.45m</span>
                      <span className="font-bold text-slate-900">35.28 cum (R.C.C. M-25)</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-600">TMT BBS: 16mm &amp; 20mm Fe-550D (124 cuts)</span>
                      <span className="font-semibold text-slate-800">1,842 kg (1.84 MT)</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-600">Level Book: BM 104.25m → BS 1.42m → FS 2.15m</span>
                      <span className="font-semibold text-slate-800">RL 103.52m</span>
                    </div>
                  </div>

                  {/* Auto-Variation Guard & Signatures */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-0.5">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Variation Engine: 72.6% (Within BOQ limit)
                    </span>
                    <span className="font-medium text-slate-700">Digital Sign: V. Sharma (SE)</span>
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

      {/* ── 5B. SAMPLE DEPARTMENTAL OUTPUTS PREVIEW ─────────────── */}
      <section id="sample-outputs" className="py-16 lg:py-24 bg-white border-b border-slate-200 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 min-w-0 max-w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6 min-w-0">
            <div className="max-w-3xl space-y-2 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>VERIFIED GOVERNMENT FORMATS • NO LOGIN REQUIRED</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                Inspect Sample Departmental Outputs
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                Explore real production documents generated by PillarPro. Every export strictly adheres to CPWD Works Manual 2024, State PWD accounts codes, IS 1200 measurement standards, and double-entry accounting software.
              </p>
            </div>

            {/* Live Preview Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold self-start md:self-auto shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Live Interactive Inspector • No Phone Number Required</span>
            </div>
          </div>

          {/* Interactive Tab Switcher */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
            <button
              type="button"
              onClick={() => setActiveOutputTab('form26')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeOutputTab === 'form26'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>CPWA Form 26 Abstract</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                activeOutputTab === 'form26' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'
              }`}>
                Statutory RA Bill
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveOutputTab('emb')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeOutputTab === 'emb'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>PWD Digital e-MB Page</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                activeOutputTab === 'emb' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'
              }`}>
                IS 1200 Sheet
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveOutputTab('tally')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeOutputTab === 'tally'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>Tally Prime Voucher Export</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                activeOutputTab === 'tally' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'
              }`}>
                ERP &amp; Accounts XML
              </span>
            </button>
          </div>

          {/* TAB 1: CPWA FORM 26 ABSTRACT */}
          {activeOutputTab === 'form26' && (
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 sm:p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
              {/* Document Banner */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="border-b border-slate-200 pb-4 text-center space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
                    PUBLIC WORKS DEPARTMENT (PWD) / NATIONAL HIGHWAYS DIVISION
                  </p>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight">
                    FORM CPWA-26 — RUNNING ACCOUNT BILL ABSTRACT
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    [Prescribed under CPWD Works Manual 2024 &amp; State PWD Accounts Code Rules 284 &amp; 295]
                  </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80">
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase font-semibold block">Division / Sub-Div</span>
                    <strong className="text-slate-900 font-semibold text-xs">NH Division IV, Bareilly</strong>
                    <span className="text-[11px] text-slate-600 block">Sub-Div II (Moradabad)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase font-semibold block">Contractor Name</span>
                    <strong className="text-slate-900 font-semibold text-xs">Apex Infra Buildcon Pvt. Ltd.</strong>
                    <span className="text-[11px] text-slate-600 block">Class-I Super EPC</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase font-semibold block">Agreement Reference</span>
                    <strong className="text-slate-900 font-semibold text-xs">EE/NHAI/PKG-04/2025-26/118</strong>
                    <span className="text-[11px] text-slate-600 block">Sanctioned: ₹18.42 Cr</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase font-semibold block">Bill Serial &amp; Period</span>
                    <strong className="text-blue-700 font-bold text-xs">4th Running Account (RA) Bill</strong>
                    <span className="text-[11px] text-slate-600 block">For Period Ending 20-Oct-2026</span>
                  </div>
                </div>

                {/* Section I: Work Value Summary */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>I. Account of Work Executed (Up to Date)</span>
                    <span className="text-[11px] font-normal text-slate-600">Reconciled with e-MB Sheets #485-491</span>
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Item Classification</th>
                          <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                          <th className="py-2.5 px-3 text-right">Statutory Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                        <tr className="bg-white">
                          <td className="py-2.5 px-3 font-sans text-slate-900 font-medium">
                            1. Gross value of work executed up to date (Total of all certified e-MB pages)
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-900 font-bold">₹2,48,50,000.00</td>
                          <td className="py-2.5 px-3 text-right font-sans text-slate-600 text-[10px]">Cumulative certified</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="py-2.5 px-3 font-sans text-slate-700">
                            2. Deduct: Gross value of work certified in previous bill (RA Bill No. 03)
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700 font-medium">-₹2,02,75,000.00</td>
                          <td className="py-2.5 px-3 text-right font-sans text-slate-600 text-[10px]">Disbursed on 05-Sep-2026</td>
                        </tr>
                        <tr className="bg-blue-50/70 font-semibold border-t-2 border-blue-200 text-slate-900">
                          <td className="py-3 px-3 font-sans text-xs">
                            3. Net value of work executed since previous bill (Gross Amount for RA-04) [A]
                          </td>
                          <td className="py-3 px-3 text-right text-sm text-blue-900 font-bold">₹45,75,000.00</td>
                          <td className="py-3 px-3 text-right font-sans text-blue-700 text-[11px] font-bold">Active Bill Gross</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section II: Statutory Recoveries & Deductions */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>II. Schedule of Statutory Deductions &amp; Recoveries (CPWA Form 26 Cl. 8)</span>
                    <span className="text-[11px] font-normal text-slate-600">Auto-calculated per Treasury Rules</span>
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Head of Recovery / Statutory Act</th>
                          <th className="py-2 px-3 text-center">Standard Rate</th>
                          <th className="py-2 px-3 text-right">Deduction Amount (₹)</th>
                          <th className="py-2 px-3">Remittance Head / Ledger</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                        <tr className="bg-white">
                          <td className="py-2.5 px-3 font-sans text-slate-800 font-medium">
                            Security Deposit / Retention Money (SD)
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-sans">5.00%</td>
                          <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">₹2,28,750.00</td>
                          <td className="py-2.5 px-3 font-sans text-slate-600 text-[10px]">Division Deposit Ledger (8443)</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="py-2.5 px-3 font-sans text-slate-800 font-medium">
                            Income Tax TDS u/s 194C
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-sans">2.00%</td>
                          <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">₹91,500.00</td>
                          <td className="py-2.5 px-3 font-sans text-slate-600 text-[10px]">Govt. Treasury Challan 281</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="py-2.5 px-3 font-sans text-slate-800 font-medium">
                            GST-TDS (CGST 1% + SGST 1%)
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-sans">2.00%</td>
                          <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">₹91,500.00</td>
                          <td className="py-2.5 px-3 font-sans text-slate-600 text-[10px]">Form GSTR-7 Portal Filing</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="py-2.5 px-3 font-sans text-slate-800 font-medium">
                            BOCW Labour Welfare Cess Act 1996
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-sans">1.00%</td>
                          <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">₹45,750.00</td>
                          <td className="py-2.5 px-3 font-sans text-slate-600 text-[10px]">State Labour Welfare Board</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="py-2.5 px-3 font-sans text-slate-800 font-medium">
                            Mobilization Advance Principal Recovery (Item 8a)
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-sans">10.00%</td>
                          <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">₹4,57,500.00</td>
                          <td className="py-2.5 px-3 font-sans text-slate-600 text-[10px]">Agreement Clause 10B Recovery</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="py-2.5 px-3 font-sans text-slate-800 font-medium">
                            Mining Royalty Deductions (Stones, Aggregates &amp; Sand)
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-sans">As per challan</td>
                          <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">₹38,200.00</td>
                          <td className="py-2.5 px-3 font-sans text-slate-600 text-[10px]">Dept. of Geology &amp; Mining Head</td>
                        </tr>
                        <tr className="bg-slate-100/90 font-bold text-slate-900">
                          <td colSpan={2} className="py-2.5 px-3 font-sans text-xs">
                            Total Recoveries &amp; Deductions [B]
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs font-mono">₹9,53,200.00</td>
                          <td className="py-2.5 px-3 font-sans text-slate-600 text-[10px]">Total 6 Statutory Deductions</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Net Payable Highlight Card */}
                <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                      NET AMOUNT PAYABLE TO CONTRACTOR [A - B]
                    </span>
                    <p className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight mt-1">
                      ₹36,21,800.00
                    </p>
                    <p className="text-xs text-slate-300 italic pt-0.5">
                      (Rupees Thirty-Six Lakh Twenty-One Thousand Eight Hundred Only)
                    </p>
                  </div>
                  <div className="sm:text-right space-y-1 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Division Treasury Certified
                    </span>
                    <p className="text-[11px] text-slate-400">Cheque / RTGS Order Ready</p>
                  </div>
                </div>

                {/* 4-Tier Institutional Signature & Endorsement Block */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">1. Prepared &amp; Submitted</span>
                    <p className="font-semibold text-slate-900">V. Sharma, BE Civil</p>
                    <p className="text-[11px] text-slate-600">Contractor Billing Engineer</p>
                    <p className="text-[10px] text-slate-500 font-mono">Date: 20-Oct-2026</p>
                  </div>

                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-1">
                    <span className="text-[10px] text-emerald-800 uppercase font-semibold block">2. 100% Measured &amp; Verified</span>
                    <p className="font-semibold text-slate-900">R. Patel, JE PWD</p>
                    <p className="text-[11px] text-slate-600">Junior Engineer, Sub-Div II</p>
                    <p className="text-[10px] text-emerald-800 font-mono">MB #491, Pages 18-26</p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">3. 50% Test-Checked</span>
                    <p className="font-semibold text-slate-900">A. K. Verma, AE PWD</p>
                    <p className="text-[11px] text-slate-600">Assistant Engineer, Div IV</p>
                    <p className="text-[10px] text-slate-500 font-mono">Field Level Verified</p>
                  </div>

                  <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 space-y-1">
                    <span className="text-[10px] text-blue-800 uppercase font-semibold block">4. Passed for Payment</span>
                    <p className="font-semibold text-slate-900">Er. S. N. Mishra</p>
                    <p className="text-[11px] text-slate-600">Executive Engineer, PWD Div IV</p>
                    <p className="text-[10px] text-blue-800 font-mono">Order: Passed for ₹36.21L</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PWD DIGITAL E-MB PAGE */}
          {activeOutputTab === 'emb' && (
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 sm:p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                {/* e-MB Document Header */}
                <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 font-mono">
                        e-MB No. 491
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        Page 18
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Status: CERTIFIED &amp; LOCKED
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-1.5">
                      PWD Digital e-Measurement Book (IS 1200 Standards)
                    </h3>
                    <p className="text-xs text-slate-600">
                      Work: Widening &amp; Strengthening of NH-24 Bypass (Ch. 12+000 to 48+500) • Agmt #118
                    </p>
                  </div>
                  <div className="text-xs sm:text-right space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Sanctioned BOQ Item</span>
                    <strong className="text-slate-900 block font-semibold">Item 4.04: R.C.C. M-25 in Foundation &amp; Piers</strong>
                    <span className="text-slate-600 font-mono text-[11px]">Sanctioned Rate: ₹6,450.00 / cum</span>
                  </div>
                </div>

                {/* Measurements Ledger Table (L x B x D) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Detailed Field Dimensions &amp; Deductions (Chainage Ch. 14+200 to 14+350)
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">All linear dimensions in metres (m)</span>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-2 px-2.5">Entry #</th>
                          <th className="py-2 px-3">Description of Component &amp; Chainage</th>
                          <th className="py-2 px-2 text-right">Nos</th>
                          <th className="py-2 px-2 text-right">Length (L)</th>
                          <th className="py-2 px-2 text-right">Breadth (B)</th>
                          <th className="py-2 px-2 text-right">Depth (D)</th>
                          <th className="py-2 px-3 text-right">Net Qty</th>
                          <th className="py-2 px-2">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                        <tr className="bg-white hover:bg-slate-50/80">
                          <td className="py-2.5 px-2.5 text-slate-500 font-sans">18.01</td>
                          <td className="py-2.5 px-3 font-sans text-slate-900 font-medium">
                            Pier Footing Raft Foundation (P1 LHS, Ch. 14+215)
                          </td>
                          <td className="py-2.5 px-2 text-right">2</td>
                          <td className="py-2.5 px-2 text-right">8.50</td>
                          <td className="py-2.5 px-2 text-right">4.20</td>
                          <td className="py-2.5 px-2 text-right">0.90</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">64.26</td>
                          <td className="py-2.5 px-2 font-sans text-slate-600">cum</td>
                        </tr>
                        <tr className="bg-white hover:bg-slate-50/80">
                          <td className="py-2.5 px-2.5 text-slate-500 font-sans">18.02</td>
                          <td className="py-2.5 px-3 font-sans text-slate-900 font-medium">
                            Pier Shaft Circular Column (P1 &amp; P2, Ch. 14+215 to 14+240)
                          </td>
                          <td className="py-2.5 px-2 text-right">2</td>
                          <td className="py-2.5 px-2 text-right">6.00</td>
                          <td className="py-2.5 px-2 text-right">1.80</td>
                          <td className="py-2.5 px-2 text-right">3.50</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">75.60</td>
                          <td className="py-2.5 px-2 font-sans text-slate-600">cum</td>
                        </tr>
                        <tr className="bg-white hover:bg-slate-50/80">
                          <td className="py-2.5 px-2.5 text-slate-500 font-sans">18.03</td>
                          <td className="py-2.5 px-3 font-sans text-slate-900 font-medium">
                            Pier Cap Top Bedding Beam (Ch. 14+240)
                          </td>
                          <td className="py-2.5 px-2 text-right">1</td>
                          <td className="py-2.5 px-2 text-right">14.50</td>
                          <td className="py-2.5 px-2 text-right">2.20</td>
                          <td className="py-2.5 px-2 text-right">0.60</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">19.14</td>
                          <td className="py-2.5 px-2 font-sans text-slate-600">cum</td>
                        </tr>
                        <tr className="bg-red-50/40 text-red-900 hover:bg-red-50/60">
                          <td className="py-2.5 px-2.5 font-sans">18.04</td>
                          <td className="py-2.5 px-3 font-sans font-medium text-red-800">
                            Deduct: Bearing Plinth Recesses (4 Bearings @ Pier Top)
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-red-700">4</td>
                          <td className="py-2.5 px-2 text-right text-red-700">-0.80</td>
                          <td className="py-2.5 px-2 text-right text-red-700">0.80</td>
                          <td className="py-2.5 px-2 text-right text-red-700">0.15</td>
                          <td className="py-2.5 px-3 text-right font-bold text-red-700">-0.38</td>
                          <td className="py-2.5 px-2 font-sans text-slate-600">cum</td>
                        </tr>
                        <tr className="bg-slate-100 font-bold text-slate-900 text-xs border-t-2 border-slate-300">
                          <td colSpan={6} className="py-3 px-3 font-sans">
                            Total Net Certified Volume for BOQ Item 4.04 (Page 18)
                          </td>
                          <td className="py-3 px-3 text-right text-sm text-blue-900 font-bold">158.62</td>
                          <td className="py-3 px-2 font-sans text-blue-900 font-semibold">cum</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sub-Sheets Grid: TMT BBS & Level Book Integration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* TMT Bar Bending Schedule (BBS) */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        TMT Bar Bending Schedule (BBS) Linkage
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                        Fe-550D TMT
                      </span>
                    </div>
                    <div className="text-xs space-y-1.5 font-mono text-slate-700">
                      <div className="flex justify-between bg-white p-2 rounded border border-slate-200/80">
                        <span className="font-sans text-slate-600">20mm dia rebar (48 cuts @ 7.80m, 2.47 kg/m)</span>
                        <span className="font-bold text-slate-900">924.70 kg</span>
                      </div>
                      <div className="flex justify-between bg-white p-2 rounded border border-slate-200/80">
                        <span className="font-sans text-slate-600">16mm dia rebar (86 cuts @ 6.70m, 1.58 kg/m)</span>
                        <span className="font-bold text-slate-900">910.40 kg</span>
                      </div>
                      <div className="flex justify-between bg-blue-50/80 p-2 rounded border border-blue-200 text-blue-950 font-sans font-semibold">
                        <span>Total Steel Reinforcement Weight</span>
                        <span className="font-mono font-bold">1,835.10 kg (1.84 MT)</span>
                      </div>
                    </div>
                  </div>

                  {/* Level Book Reduced Level (RL) Readings */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Level Book Reduced Level (RL) Cross-Check
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                        Auto Collimation
                      </span>
                    </div>
                    <div className="text-xs space-y-1.5 font-mono text-slate-700">
                      <div className="flex justify-between bg-white p-2 rounded border border-slate-200/80">
                        <span className="font-sans text-slate-600">Benchmark BM-12 (Sanctioned RL)</span>
                        <span className="font-bold text-slate-900">104.250 m</span>
                      </div>
                      <div className="flex justify-between bg-white p-2 rounded border border-slate-200/80">
                        <span className="font-sans text-slate-600">Back Sight (BS: 1.420m) → Height of Instrument (HI)</span>
                        <span className="font-bold text-slate-900">105.670 m</span>
                      </div>
                      <div className="flex justify-between bg-emerald-50/80 p-2 rounded border border-emerald-200 text-emerald-950 font-sans font-semibold">
                        <span>Fore Sight (FS: 2.150m) → Executed Pier Top RL</span>
                        <span className="font-mono font-bold text-emerald-800">103.520 m (±0.0mm)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit & Cryptographic Immutability Strip */}
                <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <strong className="text-white font-semibold">Automatic Variation Engine: PASSED</strong>
                      <span className="text-slate-400 text-[11px] font-mono">(Execution 72.6% of Sanctioned BOQ Limit)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      GPS: 28.3871° N, 79.4326° E • Time: 18-Oct-2026 11:24:02 IST • Scrutiny Token: #PWD-JE-88219
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px] self-start sm:self-auto shrink-0">
                    Billed in RA Bill #04 (Locked)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TALLY PRIME VOUCHER EXPORT */}
          {activeOutputTab === 'tally' && (
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 sm:p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                {/* Header */}
                <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 font-mono">
                        Tally Prime 4.x / ERP 9
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 font-mono">
                        Voucher Type: Journal (JV)
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                        Voucher # JV/2026-27/RA-04
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-1.5">
                      Double-Entry General Ledger Export (Zero Manual Re-Keying)
                    </h3>
                    <p className="text-xs text-slate-600">
                      Auto-posts certified RA bill revenue, statutory retention liabilities, and government tax ledgers directly into Tally Prime.
                    </p>
                  </div>

                  {/* XML Code Snippet Toggle */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowXmlSnippet(!showXmlSnippet)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span>{showXmlSnippet ? 'Hide XML Payload' : 'View Tally XML Payload'}</span>
                    </button>
                    {showXmlSnippet && (
                      <button
                        type="button"
                        onClick={handleCopyXml}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                      >
                        {copiedXml ? '✓ Copied' : 'Copy XML'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Narration Box */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Statutory Accounting Narration
                  </span>
                  <p className="text-slate-700 italic font-mono text-[11px] leading-relaxed">
                    &quot;Being gross work certified for RA Bill #04 (Agmt EE/NHAI/PKG-04/2025-26) with statutory deductions for Security Deposit (5%), IT-TDS u/s 194C (2%), GST-TDS (2%), BOCW Cess (1%), Mobilization Recovery (10%), and Mining Royalty credited to respective balance sheet ledgers.&quot;
                  </p>
                </div>

                {/* Double-Entry Ledger Posting Table */}
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Particulars / Ledger Name</th>
                        <th className="py-2.5 px-3">Tally Group / Account Head</th>
                        <th className="py-2.5 px-3 text-right">Debit (Dr) ₹</th>
                        <th className="py-2.5 px-3 text-right">Credit (Cr) ₹</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                      <tr className="bg-white hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-sans font-bold text-slate-900">
                          Executive Engineer, NHAI Bareilly (Client)
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 text-[10px]">Sundry Debtors (Current Assets)</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹45,75,000.00</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                      </tr>
                      <tr className="bg-white hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-sans text-slate-800 font-medium pl-6">
                          To Security Deposit Retention Fund A/c (5%)
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 text-[10px]">Current Liabilities (Deposits)</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">₹2,28,750.00</td>
                      </tr>
                      <tr className="bg-white hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-sans text-slate-800 font-medium pl-6">
                          To TDS Payable u/s 194C (Income Tax)
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 text-[10px]">Duties &amp; Taxes</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">₹91,500.00</td>
                      </tr>
                      <tr className="bg-white hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-sans text-slate-800 font-medium pl-6">
                          To GST-TDS Payable (CGST 1% + SGST 1%)
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 text-[10px]">Duties &amp; Taxes</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">₹91,500.00</td>
                      </tr>
                      <tr className="bg-white hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-sans text-slate-800 font-medium pl-6">
                          To BOCW Labour Welfare Cess Payable
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 text-[10px]">Current Liabilities</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">₹45,750.00</td>
                      </tr>
                      <tr className="bg-white hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-sans text-slate-800 font-medium pl-6">
                          To Mobilization Advance Recovery A/c
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 text-[10px]">Loans &amp; Advances (Liability)</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">₹4,57,500.00</td>
                      </tr>
                      <tr className="bg-white hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-sans text-slate-800 font-medium pl-6">
                          To Mining Royalty Deductions A/c
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 text-[10px]">Statutory Dues</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">₹38,200.00</td>
                      </tr>
                      <tr className="bg-emerald-50/60 hover:bg-emerald-50/90">
                        <td className="py-2.5 px-3 font-sans font-bold text-emerald-950 pl-6">
                          To Civil Contract Revenue Realization (Net Bank Accrual)
                        </td>
                        <td className="py-2.5 px-3 font-sans text-emerald-800 text-[10px] font-semibold">Direct Income / Revenue</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">₹36,21,800.00</td>
                      </tr>
                      <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-900">
                        <td colSpan={2} className="py-3 px-3 font-sans">
                          Total Balanced Journal Voucher (Debits = Credits)
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-400">₹45,75,000.00</td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-400">₹45,75,000.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Optional Raw XML Payload Inspector */}
                {showXmlSnippet && (
                  <div className="space-y-2 pt-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 font-mono">Raw Tally Prime XML Structure (Ready to Import):</span>
                      <span className="text-[11px] text-slate-500 font-mono">Compatible with Tally Prime 4.x &amp; Tally.ERP 9</span>
                    </div>
                    <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed max-h-72 border border-slate-800">
                      {SAMPLE_TALLY_XML}
                    </pre>
                  </div>
                )}

                {/* HO Accountant Efficiency Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <strong className="text-slate-900 font-semibold block">1-Click Tally Prime Sync</strong>
                    <p className="text-[11px] text-slate-600">Zero duplicate data entry. Directly import XML/CSV vouchers into Tally Prime.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <strong className="text-slate-900 font-semibold block">Exact TDS &amp; GST Matching</strong>
                    <p className="text-[11px] text-slate-600">100% matched with Form 26AS and GSTR-7 returns filed by the Executive Engineer.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <strong className="text-slate-900 font-semibold block">Multi-Entity &amp; JV Ready</strong>
                    <p className="text-[11px] text-slate-600">Automatic splitting across Joint Venture (JV) partners and sub-contract packages.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
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
      <footer className="bg-white border-t border-slate-200 py-14 text-xs text-slate-500 min-w-0 max-w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 min-w-0">
          {/* Enterprise Security & Compliance Guarantee Bar */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-slate-200 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  ENTERPRISE SECURITY &amp; STATUTORY COMPLIANCE
                </p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-1">
                  Engineered for Class-I &amp; Super EPC Contractors Handling Sensitive Tender Data
                </h3>
              </div>
              <p className="text-xs text-slate-600 max-w-md">
                Guaranteed data isolation, fail-closed privilege models, and native accounting integrations trusted by infrastructure leaders across India.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Trust Pillar 1: Tally Prime Export Compatibility */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    XML &amp; CSV Native
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-xs">Tally Prime Export Compatibility</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Direct XML/CSV journal vouchers compatible with Tally Prime 4.x, Tally ERP 9, Busy, and SAP B1. Your HO Chartered Accountant never needs to re-enter a single line.
                </p>
              </div>

              {/* Trust Pillar 2: Role-Based Site & HO Access Control */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                    Fail-Closed Security
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-xs">Role-Based Site &amp; HO Control (RBAC)</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  10-tier fail-closed security architecture. Site engineers, billing engineers, storekeepers, and owners operate in distinct permission boundaries with tamper-proof certified e-MB locks.
                </p>
              </div>

              {/* Trust Pillar 3: Data Encryption & Daily Backups */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    AES-256 &amp; TLS 1.3
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-xs">Data Encryption &amp; Daily Backups</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  All tender BOQ rates, measurement abstracts, and contractor financial ledgers are encrypted with AES-256 at rest and TLS 1.3 in transit. Automated daily off-site backups ensure zero data loss.
                </p>
              </div>

              {/* Trust Pillar 4: CPWD & Departmental Audit Readiness */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    CPWD Works 2024
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-xs">CPWD &amp; Departmental Audit Ready</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  100% compliant with CPWD Works Manual 2024, State PWD Accounts Codes, MORTH 5th Revision, and statutory CAG audit norms. Arithmetic precision backed by automated unit tests.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Navigation & Contact Columns */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 min-w-0">
            {/* Brand & Corporate Support Col (2 cols) */}
            <div className="col-span-2 space-y-4 min-w-0">
              <Logo theme="light" href="/" size="sm" />
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                The authoritative infrastructure ERP engineered specifically for Indian civil contractors, highway builders, and infra developers.
              </p>

              {/* Company Corporate Details */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 max-w-sm">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Registered Corporate Office
                  </span>
                  <p className="font-semibold text-slate-900 text-[11px]">
                    PillarPro Technologies India Pvt. Ltd.
                  </p>
                  <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                    DLF Cyber City, Sector 24, Gurugram, NCR Delhi 122002, India
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    CIN: U72900DL2024PTC398210
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Dedicated Contractor Support &amp; Sales
                  </span>
                  <p className="text-[11px] text-slate-700 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="font-semibold text-slate-900">+91 11 4050 6700</span>
                    <span className="text-slate-400">/</span>
                    <span className="font-semibold text-slate-900">+91 98765 43210</span>
                  </p>
                  <p className="text-[11px] text-slate-700 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href="mailto:contact@pillarprojk.com" className="hover:text-blue-700 transition-colors font-medium text-slate-800">
                      contact@pillarprojk.com
                    </a>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Hours: Mon–Sat, 09:00 AM – 07:00 PM IST (Site Deployment &amp; Support)
                  </p>
                </div>
              </div>
            </div>

            {/* Product Col (1 col) */}
            <div className="space-y-2.5 min-w-0">
              <h4 className="font-bold text-slate-900 text-xs">Product</h4>
              <ul className="space-y-2 text-[11px]">
                <li><a href="#features" className="hover:text-slate-900 transition-colors">Digital e-MB &amp; BBS Sheets</a></li>
                <li><a href="#features" className="hover:text-slate-900 transition-colors">CPWA Form 26 RA Bills</a></li>
                <li><a href="#sample-outputs" className="hover:text-slate-900 transition-colors">Tally Prime XML Export</a></li>
                <li><a href="#features" className="hover:text-slate-900 transition-colors">Level Books &amp; Variations</a></li>
                <li><a href="#features" className="hover:text-slate-900 transition-colors">10-Tier Construction RBAC</a></li>
                <li><a href="#features" className="hover:text-slate-900 transition-colors">Subcontractor &amp; Fuel Logs</a></li>
              </ul>
            </div>

            {/* Solutions Col (1 col) */}
            <div className="space-y-2.5 min-w-0">
              <h4 className="font-bold text-slate-900 text-xs">Solutions</h4>
              <ul className="space-y-2 text-[11px]">
                <li><a href="#pipeline" className="hover:text-slate-900 transition-colors">Roads &amp; Highways (NHAI)</a></li>
                <li><a href="#pipeline" className="hover:text-slate-900 transition-colors">Bridges &amp; Flyovers</a></li>
                <li><a href="#pipeline" className="hover:text-slate-900 transition-colors">Urban Water Supply &amp; JJM</a></li>
                <li><a href="#pipeline" className="hover:text-slate-900 transition-colors">Commercial &amp; Industrial EPC</a></li>
                <li><a href="#pipeline" className="hover:text-slate-900 transition-colors">Irrigation &amp; Canal Works</a></li>
              </ul>
            </div>

            {/* Compliance Col (1 col) */}
            <div className="space-y-2.5 min-w-0">
              <h4 className="font-bold text-slate-900 text-xs">Compliance</h4>
              <ul className="space-y-2 text-[11px]">
                <li><a href="#statutory" className="hover:text-slate-900 transition-colors">CPWD Specifications 2024</a></li>
                <li><a href="#statutory" className="hover:text-slate-900 transition-colors">State PWD Accounts Code</a></li>
                <li><a href="#statutory" className="hover:text-slate-900 transition-colors">IS 1200 Measurement Codes</a></li>
                <li><a href="#statutory" className="hover:text-slate-900 transition-colors">IRC &amp; MORTH 5th Revision</a></li>
                <li><a href="#statutory" className="hover:text-slate-900 transition-colors">Section 194C &amp; GST-TDS</a></li>
                <li><a href="#statutory" className="hover:text-slate-900 transition-colors">BOCW Labour Cess Act 1996</a></li>
              </ul>
            </div>

            {/* Company & Support Col (1 col) */}
            <div className="space-y-2.5 min-w-0">
              <h4 className="font-bold text-slate-900 text-xs">Company</h4>
              <ul className="space-y-2 text-[11px]">
                <li><Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing &amp; Plans</Link></li>
                <li>
                  <button
                    type="button"
                    onClick={() => setContactModalOpen(true)}
                    className="hover:text-slate-900 transition-colors cursor-pointer text-left"
                  >
                    Enterprise Sales
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setContactModalOpen(true)}
                    className="hover:text-slate-900 transition-colors cursor-pointer text-left"
                  >
                    Contractor Support
                  </button>
                </li>
                <li><Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link></li>
                <li>
                  <a href="mailto:compliance@pillarpro.in" className="hover:text-slate-900 transition-colors">
                    Grievance Officer
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright & Certification Bottom Bar */}
          <div className="border-t border-slate-200 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 min-w-0">
            <p>© 2026 PillarPro Technologies India Pvt. Ltd. All rights reserved. CIN: U72900DL2024PTC398210</p>
            <div className="flex flex-wrap items-center justify-center gap-3 font-medium text-slate-600">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                AES-256 Bit Encrypted
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                10-Tier Construction RBAC
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Tally Prime Export Certified
              </span>
              <span>•</span>
              <span className="text-slate-600">GST &amp; E-Invoicing Compliant</span>
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
