'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/Logo'

export default function ForgotPasswordPage() {
  const supabase = createClient()

  const [email, setEmail]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState(false)
  const [cooldown, setCooldown]         = useState(0)

  // Pre-fill email from query string if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const emailParam = params.get('email')
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam))
      }
    }
  }, [])

  // Countdown timer for cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown(c => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please provide a valid work email address.')
      return
    }

    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before requesting another reset email.`)
      return
    }

    setLoading(true)

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const redirectTo = `${origin}/auth/callback?next=/reset-password`

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      })

      if (resetError) {
        // Handle common Supabase rate-limiting and formatting errors gracefully
        if (resetError.message.toLowerCase().includes('rate limit')) {
          setError('Too many recovery attempts for this email. For security, please wait 60 seconds.')
          setCooldown(60)
        } else {
          setError(resetError.message)
        }
        return
      }

      setSuccess(true)
      setCooldown(60)
    } catch (err: any) {
      console.error('Password reset request error:', err)
      setError(err?.message || 'An unexpected error occurred while requesting password reset.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-900 font-sans antialiased select-none">
      
      {/* ── LEFT PANEL: ENTERPRISE ARCHITECTURAL BRANDING ───── */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 bg-slate-950 p-8 sm:p-12 flex-col justify-between border-r border-slate-800 relative overflow-hidden">
        {/* Subtle geometric grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-25" />
        
        {/* Ambient illumination glow */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-60 h-60 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-8">
          {/* Logo & Category Badge */}
          <div className="flex items-center justify-between">
            <Logo theme="dark" size="md" href="/" />
            <span className="text-[10px] font-mono tracking-widest uppercase text-blue-400 bg-blue-950/70 border border-blue-800/80 px-2.5 py-1 rounded">
              Identity &amp; Access Shield
            </span>
          </div>

          {/* Headline */}
          <div className="pt-4">
            <h1 className="text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Enterprise Access Recovery &amp; Cryptographic Defense.
            </h1>
          </div>

          {/* 3-Item Architectural Specification List */}
          <div className="divide-y divide-slate-800/80 border-y border-slate-800 my-6">
            <div className="py-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-xs font-bold font-mono">01</span>
                <p className="text-sm font-bold text-white tracking-tight">
                  Single-Use Cryptographic Recovery Tokens
                </p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-5">
                Time-limited, encrypted PKCE recovery challenges ensure only authorized firm executives can reset credentials.
              </p>
            </div>

            <div className="py-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-xs font-bold font-mono">02</span>
                <p className="text-sm font-bold text-white tracking-tight">
                  Zero-Knowledge Password Encryption
                </p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-5">
                Passwords are never stored in plaintext and are hashed using industry-standard salted Argon2id/bcrypt algorithms.
              </p>
            </div>

            <div className="py-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-xs font-bold font-mono">03</span>
                <p className="text-sm font-bold text-white tracking-tight">
                  Strict Multi-Tenant Isolation
                </p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-5">
                Firm ledgers, RA bill records, and bank guarantee data remain isolated under PostgreSQL Row Level Security.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Compliance & Security Footer */}
        <div className="relative z-10 pt-6 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium flex-wrap">
            <span className="text-slate-300 font-semibold">Protected Under:</span>
            <span>AES-256</span>
            <span>•</span>
            <span>TLS 1.3</span>
            <span>•</span>
            <span>Supabase Auth</span>
            <span>•</span>
            <span>SOC-2 Type II</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
            <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Immutable Audit Trail &amp; Rate-Limited Endpoint Protection</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: ENTERPRISE FORM WORKSPACE ───────────── */}
      <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-center items-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-[420px] space-y-6">
          
          {/* Mobile Header (Visible only on <lg) */}
          <div className="lg:hidden flex items-center justify-between pb-4 border-b border-slate-100">
            <Logo theme="light" size="sm" href="/" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Contractor OS
            </span>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold mb-3">
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Account Recovery
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Reset your firm password
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Enter the authorized work email registered with your contractor workspace. We’ll dispatch a secure recovery link.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-start gap-2.5 shadow-2xs">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {/* Success Card */}
          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-xs text-emerald-950 space-y-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 mt-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-emerald-900">
                    Password Reset Link Sent
                  </p>
                  <p className="text-emerald-800 leading-relaxed">
                    We’ve dispatched secure recovery instructions to{' '}
                    <strong className="text-emerald-950 font-semibold">{email.trim()}</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-200/80 space-y-2.5">
                <div className="rounded-lg bg-white/80 p-2.5 border border-emerald-200 text-[11px] text-slate-700 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>How to complete password reset:</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed pl-5">
                    1. Check your email for a message from <strong>PillarPro</strong>.
                  </p>
                  <p className="text-slate-600 leading-relaxed pl-5">
                    2. Click the <strong>&quot;Reset password&quot;</strong> button inside that email.
                  </p>
                  <p className="text-slate-500 text-[10px] pl-5 italic">
                    Note: No manual code is required. The email link verifies your identity directly.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleResetRequest}
                    disabled={loading || cooldown > 0}
                    className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {loading ? (
                      'Sending…'
                    ) : cooldown > 0 ? (
                      `Resend link in ${cooldown}s`
                    ) : (
                      'Resend Reset Link'
                    )}
                  </button>

                  <Link
                    href="/sign-in"
                    className="text-xs font-semibold text-emerald-900 hover:underline"
                  >
                    Back to Sign In →
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Reset Request Form */
            <form onSubmit={handleResetRequest} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Authorized Work Email <span className="text-blue-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 transition-all"
                    placeholder="you@contractorfirm.com"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  We’ll send an encrypted, single-use password recovery link to this address.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="h-11 w-full rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Generating Secure Link…</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>Please wait {cooldown}s…</span>
                ) : (
                  <span>Send Recovery Link</span>
                )}
              </button>
            </form>
          )}

          {/* Back to Sign In */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Sign In</span>
            </Link>

            <span className="text-slate-400 text-[11px]">Enterprise Account Shield</span>
          </div>

        </div>
      </div>

    </div>
  )
}

