'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export function ContactClient() {
  const [copied, setCopied] = useState(false)
  const [fullName, setFullName] = useState('')
  const [firmName, setFirmName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [inquiryType, setInquiryType] = useState('General Inquiry')
  const [message, setMessage] = useState('')

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('contact@pillarprojk.com')
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const subject = encodeURIComponent(`[${inquiryType}] Inquiry from ${firmName || fullName || 'Contractor'}`)
    const bodyText = encodeURIComponent(
      `Name: ${fullName || 'N/A'}\n` +
      `Firm / Company: ${firmName || 'N/A'}\n` +
      `Email: ${email || 'N/A'}\n` +
      `Phone: ${phone || 'N/A'}\n` +
      `Inquiry Type: ${inquiryType}\n\n` +
      `Message:\n${message || 'N/A'}\n`
    )
    window.location.href = `mailto:contact@pillarprojk.com?subject=${subject}&body=${bodyText}`
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      {/* ── 1. NAVIGATION HEADER ───────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo theme="light" href="/" size="sm" subtitle="Contact & Support" />
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors px-3 py-1.5"
            >
              ← Back to Home
            </Link>
            <Link
              href="/pricing"
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors hidden sm:inline-block px-3 py-1.5"
            >
              Pricing
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs active:scale-95 transition-all"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. HERO HEADER ─────────────────────────────────────── */}
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Title Card */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span>Support &amp; Inquiries</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Contact Us
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Have questions about Schedule of Rates imports, e-MB field entries, or enterprise joint venture configurations? Our team is available to assist you.
            </p>
          </div>

          {/* ── 3. DIRECT CONTACT CARDS ──────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Direct Email Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Direct Email</h3>
                <p className="text-xs text-slate-500">
                  Send us an email anytime. We respond within 4 business hours.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <a
                  href="mailto:contact@pillarprojk.com"
                  className="block group"
                >
                  <span className="text-[11px] font-semibold text-slate-400 group-hover:text-blue-600 uppercase tracking-wider block">
                    Contact Us
                  </span>
                  <span className="text-sm font-bold text-blue-600 font-mono group-hover:underline block mt-0.5">
                    contact@pillarprojk.com
                  </span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-emerald-700">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tender Onboarding Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Tender &amp; BOQ Onboarding</h3>
                <p className="text-xs text-slate-500">
                  Assistance with mapping CPWD / State SOR line items and initial site mobilization.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <a
                  href="mailto:contact@pillarprojk.com?subject=Tender%20BOQ%20Onboarding%20Assistance"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                >
                  <span>Request BOQ Setup Help</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            {/* Enterprise & Joint Ventures Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Enterprise &amp; Multi-Package</h3>
                <p className="text-xs text-slate-500">
                  Custom contract defense, multi-firm consolidated reporting, and dedicated account manager.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <a
                  href="mailto:contact@pillarprojk.com?subject=Enterprise%20Multi-Package%20Inquiry"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                >
                  <span>Inquire for Enterprise</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>

          {/* ── 4. QUICK INQUIRY FORM ────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Send a Direct Message
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Fill in the details below to automatically generate and send an inquiry via your email client.
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Er. Rajesh Kumar"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contracting Firm / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    placeholder="e.g. Apex Infratech Pvt Ltd"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rajesh@apexinfratech.com"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Inquiry Category
                </label>
                <select
                  value={inquiryType}
                  onChange={(e) => setInquiryType(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Tender & SOR Setup Assistance">Tender &amp; SOR Setup Assistance</option>
                  <option value="CPWD Form 26 & e-MB Demo">CPWD Form 26 &amp; e-MB Demo</option>
                  <option value="Enterprise Multi-Site Pricing">Enterprise Multi-Site Pricing</option>
                  <option value="ContractIQ Dispute Copilot">ContractIQ Dispute Copilot</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message / Details *
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your ongoing projects, works department (e.g. NHAI, State PWD, PMGSY), and what you need assistance with..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-slate-500">
                  Clicking will open your email app addressed directly to <strong className="font-mono text-slate-700">contact@pillarprojk.com</strong>.
                </p>
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm active:scale-95 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Send via Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* ── 5. FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">PillarPro Technologies India Pvt. Ltd.</span>
            <span>•</span>
            <span>contact@pillarprojk.com</span>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

