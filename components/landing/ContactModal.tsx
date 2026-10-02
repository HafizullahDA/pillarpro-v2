'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('contact@pillarprojk.com')
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback if clipboard API is restricted
      const input = document.createElement('input')
      input.value = 'contact@pillarprojk.com'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const gmailUrl =
    'https://mail.google.com/mail/?view=cm&fs=1&to=contact@pillarprojk.com&su=Inquiry%20regarding%20PillarPro'
  const mailtoUrl =
    'mailto:contact@pillarprojk.com?subject=Inquiry%20regarding%20PillarPro'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 id="contact-modal-title" className="text-base font-bold text-slate-900">
                Contact PillarPro
              </h3>
              <p className="text-xs text-slate-500">
                Choose how you'd like to get in touch with our team:
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Option 1: Gmail Web (Reliable in any browser without desktop mail app) */}
          <a
            href={gmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-red-400 hover:bg-red-50/40 group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                  Open in Gmail
                </p>
                <p className="text-[11px] text-slate-500">
                  Composes directly in your web browser tab
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400 group-hover:text-red-600 font-bold">→</span>
          </a>

          {/* Option 2: Default Mail Client (Outlook / Windows Mail / Apple Mail) */}
          <a
            href={mailtoUrl}
            onClick={onClose}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Open Default Mail App
                </p>
                <p className="text-[11px] text-slate-500">
                  Launches installed Outlook or Windows Mail app
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400 group-hover:text-blue-600 font-bold">→</span>
          </a>

          {/* Option 3: Copy Email Address */}
          <button
            type="button"
            onClick={handleCopyEmail}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 group transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                {copied ? (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {copied ? 'Copied to Clipboard!' : 'Copy Email Address'}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  contact@pillarprojk.com
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-600">
              {copied ? '✓ Copied' : 'Copy'}
            </span>
          </button>
        </div>

        {/* Footer Link to Dedicated Page */}
        <div className="border-t border-slate-100 pt-3 text-center">
          <Link
            href="/contact"
            onClick={onClose}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            Or visit the full Contact &amp; Onboarding Page →
          </Link>
        </div>
      </div>
    </div>
  )
}
