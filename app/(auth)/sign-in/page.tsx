'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/Logo'

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  )
}

export default function SignInPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [cooldown, setCooldown]         = useState(0)

  // Unconfirmed email & OTP verification state
  const [isEmailUnconfirmed, setIsEmailUnconfirmed] = useState(false)
  const [otpCode, setOtpCode]                       = useState('')
  const [verifyLoading, setVerifyLoading]           = useState(false)
  const [verifyError, setVerifyError]               = useState('')
  const [resendNotice, setResendNotice]             = useState('')
  const [resendCooldown, setResendCooldown]         = useState(0)
  const [resendLoading, setResendLoading]           = useState(false)

  // Read ?error= or ?email= from query parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const errParam = params.get('error')
      const emailParam = params.get('email')
      if (errParam) {
        setError(decodeURIComponent(errParam))
      }
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam))
      }
    }
  }, [])

  // Countdown timer for security lockout cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown(c => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Countdown timer for resend email cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown(c => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const ensureUserProvisioned = async (user: any) => {
    if (!user) return
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id, status')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile?.organization_id || profile?.status !== 'active') {
        const meta = user.user_metadata || {}
        if (meta.join_code) {
          await supabase.rpc('join_organization', {
            p_join_code: meta.join_code,
            p_display_name: meta.display_name || user.email?.split('@')[0],
            p_role: 'site_supervisor',
          })
        } else {
          await supabase.rpc('onboard_contractor', {
            p_firm_name: meta.firm_name || 'My Contracting Firm',
            p_display_name: meta.display_name || user.email?.split('@')[0],
            p_seed_starter: meta.seed_starter !== false,
          })
        }
      }
    } catch (e) {
      console.warn('Post-login provisioning check notice:', e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cooldown > 0) return

    setError('')
    setVerifyError('')
    setResendNotice('')
    setLoading(true)

    // 1. Enforce sliding-window rate limit pre-flight
    try {
      const rlRes = await fetch('/api/auth/rate-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign-in' }),
      })
      const rlData = await rlRes.json().catch(() => ({}))

      if (rlRes.status === 429 || rlData.ok === false) {
        const waitTime = rlData.resetSeconds || 60
        setCooldown(waitTime)
        setError(rlData.error || `Too many sign-in attempts. Please wait ${waitTime}s before retrying.`)
        setLoading(false)
        return
      }
    } catch {
      // If rate limit endpoint network error, proceed with Supabase auth attempt
    }

    // 2. Attempt Supabase authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (authError) {
      const isUnconfirmed = authError.message.toLowerCase().includes('not confirmed') ||
                            authError.message.toLowerCase().includes('unconfirmed')

      if (isUnconfirmed) {
        setIsEmailUnconfirmed(true)
        setError('Your email address has not been confirmed yet. Check your inbox or resend the confirmation email below.')
      } else {
        setError(authError.message)
      }
      setLoading(false)
      return
    }

    if (authData?.user) {
      await ensureUserProvisioned(authData.user)
    }

    router.refresh()
    router.push('/dashboard')
  }

  // Handle OTP verification from sign-in
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode.trim() || !email.trim()) return

    setVerifyError('')
    setVerifyLoading(true)

    try {
      const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpCode.trim(),
        type: 'signup',
      })

      if (verifyErr) {
        setVerifyError(verifyErr.message || 'Invalid or expired verification code.')
        setVerifyLoading(false)
        return
      }

      if (verifyData?.user) {
        await ensureUserProvisioned(verifyData.user)
      }

      router.refresh()
      router.push('/dashboard')
    } catch (err: any) {
      setVerifyError(err?.message || 'Verification failed. Please try again.')
      setVerifyLoading(false)
    }
  }

  // Handle resending confirmation email from sign-in
  const handleResendEmail = async () => {
    if (!email.trim() || resendCooldown > 0 || resendLoading) return

    setResendLoading(true)
    setResendNotice('')
    setVerifyError('')

    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      })

      if (resendErr) {
        setVerifyError(resendErr.message)
      } else {
        setResendCooldown(60)
        setResendNotice(`Confirmation email resent to ${email.trim().toLowerCase()}! Please check your inbox and spam folder.`)
      }
    } catch (err: any) {
      setVerifyError(err?.message || 'Failed to resend confirmation email.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
          
          {/* Left Brand Showcase Column — Order-2 on mobile so form appears first without scrolling */}
          <div className="order-2 lg:order-1 lg:col-span-5 bg-slate-50/70 p-6 sm:p-8 lg:p-10 flex flex-col justify-between border-t lg:border-t-0 lg:border-r border-slate-200 relative z-10">
            <div>
              <div className="hidden lg:flex items-center gap-3 mb-7">
                <Logo theme="light" size="md" subtitle="Civil Contractor OS" href="/" />
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                Civil & Infrastructure Enterprise Suite
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                Contractor Financials, Multi-Agency RA Bills & Site Controls
              </h1>

              {/* 3 Value Proposition Bullets */}
              <div className="mt-6 space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                  <div className="h-5 w-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <strong className="text-slate-900 font-semibold block mb-0.5">Multi-Agency RA Bill Audit</strong>
                    <span>Reconcile gross certified bills vs statutory deductions (Sec 194C TDS, GST TDS, Cess, Retention) and credits via PFMS, State Treasuries, or PSU Corporate Finance.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                  <div className="h-5 w-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <strong className="text-slate-900 font-semibold block mb-0.5">Site-to-Office Control</strong>
                    <span>Daily labor muster rolls, AI receipt scanning for petty site cash, and real-time supplier khata ledgers.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                  <div className="h-5 w-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <strong className="text-slate-900 font-semibold block mb-0.5">Capital & BG Protection</strong>
                    <span>Automated 30-day Bank Guarantee expiry warnings, partner equity parity accounts, and BOQ work-done tracking.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-200 text-xs text-slate-500">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-semibold text-slate-700">Trusted across agencies:</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-[10px] font-bold text-slate-700">PWD</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-[10px] font-bold text-slate-700">CPWD</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-[10px] font-bold text-slate-700">PMGSY</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-[10px] font-bold text-slate-700">NHAI</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-[10px] font-bold text-slate-700">NHPC</span>
              </div>
              <span>Airtight multi-tenant isolation. Each contracting firm operates in its own encrypted workspace.</span>
            </div>
          </div>

          {/* Right Login Form Column */}
          <div className="order-1 lg:order-2 lg:col-span-7 bg-white p-6 sm:p-8 lg:p-10 flex flex-col justify-center relative z-10 text-slate-900">
            <div className="max-w-md w-full mx-auto">
              
              {/* Mobile Header Logo */}
              <div className="lg:hidden flex items-center justify-between pb-5 mb-5 border-b border-slate-100">
                <Logo theme="light" size="md" subtitle="Civil Contractor OS" href="/" />
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to your firm</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Enter your credentials to access your contractor dashboard.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-start gap-2.5 shadow-2xs">
                  <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Unconfirmed Email Action Box */}
              {isEmailUnconfirmed && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 shadow-2xs space-y-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-bold text-amber-950">Email Confirmation Required</p>
                      <p className="text-amber-800 mt-0.5 leading-relaxed">
                        Your account is registered, but your email has not been confirmed. You can resend the link or enter your 6-digit code below:
                      </p>
                    </div>
                  </div>

                  {verifyError && (
                    <div className="p-2.5 rounded-lg bg-red-100/80 border border-red-200 text-red-800 text-xs font-medium">
                      {verifyError}
                    </div>
                  )}

                  {resendNotice && (
                    <div className="p-2.5 rounded-lg bg-emerald-100/80 border border-emerald-200 text-emerald-900 text-xs font-medium">
                      {resendNotice}
                    </div>
                  )}

                  {/* Resend button */}
                  <div>
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={resendCooldown > 0 || resendLoading || !email.trim()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold shadow-2xs transition-colors disabled:opacity-50"
                    >
                      {resendLoading ? (
                        'Resending email…'
                      ) : resendCooldown > 0 ? (
                        `Resend email in ${resendCooldown}s`
                      ) : (
                        'Resend Confirmation Email'
                      )}
                    </button>
                  </div>

                  {/* Inline OTP verification */}
                  <form onSubmit={handleVerifyOtp} className="pt-2 border-t border-amber-200/80 flex gap-2">
                    <input
                      type="text"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\s+/g, ''))}
                      maxLength={8}
                      placeholder="Enter 6-digit code"
                      className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-mono uppercase text-slate-900 focus:border-amber-600 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={verifyLoading || !otpCode.trim()}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                    >
                      {verifyLoading ? 'Verifying…' : 'Verify Code'}
                    </button>
                  </form>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address <span className="text-blue-600">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value)
                      if (isEmailUnconfirmed) setIsEmailUnconfirmed(false)
                    }}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-2xs transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
                    placeholder="you@contractorfirm.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                      Password <span className="text-blue-600">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-2xs transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
                      placeholder="••••••••"
                    />
                    <EyeToggle show={showPassword} onToggle={() => setShowPassword(v => !v)} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || cooldown > 0}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Signing in…
                    </>
                  ) : cooldown > 0 ? (
                    <span className="flex items-center gap-2">
                      <span>🛡️</span>
                      <span>Security Cooldown ({cooldown}s)</span>
                    </span>
                  ) : (
                    <>
                      Sign in to Dashboard
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-2.5">
                <p className="text-xs text-slate-600">
                  New contractor?{' '}
                  <Link href="/sign-up" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    Create your firm workspace →
                  </Link>
                </p>
                <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400">
                  <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
                  <span>•</span>
                  <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
