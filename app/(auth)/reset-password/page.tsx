'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/Logo'

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
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

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [hasSession, setHasSession]               = useState<boolean | null>(null)
  const [email, setEmail]                         = useState('')
  const [otpCode, setOtpCode]                     = useState('')
  const [password, setPassword]                   = useState('')
  const [confirmPassword, setConfirmPassword]     = useState('')
  const [showPassword, setShowPassword]           = useState(false)
  const [showConfirm, setShowConfirm]             = useState(false)
  const [loading, setLoading]                     = useState(false)
  const [error, setError]                         = useState('')
  const [success, setSuccess]                     = useState(false)
  const [countdown, setCountdown]                 = useState(5)

  // Parse URL query params and check for active auth/recovery session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const emailParam = params.get('email')
      const codeParam = params.get('code')
      if (emailParam) setEmail(decodeURIComponent(emailParam))
      if (codeParam) setOtpCode(decodeURIComponent(codeParam))
    }

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(Boolean(session))
    }

    checkSession()

    // Listen for auth state change (e.g. if Supabase handles recovery hash in URL)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || Boolean(session)) {
        setHasSession(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Password Strength Calculation
  const strength = useMemo(() => {
    let score = 0
    if (password.length >= 8) score += 1
    if (password.length >= 12) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1

    let label = 'Too Short'
    let color = 'bg-slate-200'
    let textColor = 'text-slate-500'

    if (score === 1) {
      label = 'Weak'
      color = 'bg-red-500'
      textColor = 'text-red-600'
    } else if (score === 2 || score === 3) {
      label = 'Moderate'
      color = 'bg-amber-500'
      textColor = 'text-amber-600'
    } else if (score === 4) {
      label = 'Strong'
      color = 'bg-blue-600'
      textColor = 'text-blue-600'
    } else if (score >= 5) {
      label = 'Enterprise Secure'
      color = 'bg-emerald-600'
      textColor = 'text-emerald-600'
    }

    return {
      score,
      pct: Math.min(100, Math.max(10, (score / 5) * 100)),
      label,
      color,
      textColor,
      hasLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    }
  }, [password])

  // Redirect countdown on success
  useEffect(() => {
    if (!success) return
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer)
          router.push('/dashboard')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [success, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your entries.')
      return
    }

    setLoading(true)

    try {
      // Flow 1: Manual OTP verification if user does not have an active session yet
      if (!hasSession && otpCode.trim() && email.trim()) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: otpCode.trim(),
          type: 'recovery',
        })

        if (otpError) {
          throw new Error(otpError.message || 'Invalid or expired 6-digit recovery code.')
        }
      }

      // Flow 2: Update the password with Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
    } catch (err: any) {
      console.error('Password reset update error:', err)
      setError(
        err?.message ||
        'Unable to update password. Your recovery link or code may have expired. Please request a new link.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-900 font-sans antialiased select-none">
      
      {/* ── LEFT PANEL: ENTERPRISE ARCHITECTURAL BRANDING ───── */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 bg-slate-950 p-8 sm:p-12 flex-col justify-between border-r border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-25" />
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-60 h-60 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-8">
          <div className="flex items-center justify-between">
            <Logo theme="dark" size="md" href="/" />
            <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded">
              Secure Credential Update
            </span>
          </div>

          <div className="pt-4">
            <h1 className="text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Contractor Command Center Security Clearance.
            </h1>
          </div>

          <div className="divide-y divide-slate-800/80 border-y border-slate-800 my-6">
            <div className="py-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-xs font-bold font-mono">01</span>
                <p className="text-sm font-bold text-white tracking-tight">
                  High-Entropy Password Requirements
                </p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-5">
                Protect sensitive tender estimates, sub-contractor balances, and CPWA measurement sheets with strict entropy.
              </p>
            </div>

            <div className="py-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-xs font-bold font-mono">02</span>
                <p className="text-sm font-bold text-white tracking-tight">
                  Session Revocation On Update
                </p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-5">
                Updating your password automatically invalidates legacy sessions across untrusted devices.
              </p>
            </div>

            <div className="py-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-xs font-bold font-mono">03</span>
                <p className="text-sm font-bold text-white tracking-tight">
                  End-to-End Encrypted Transport
                </p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-5">
                All password transmission is encrypted via TLS 1.3 with forward secrecy.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium flex-wrap">
            <span className="text-slate-300 font-semibold">Security Level:</span>
            <span>Enterprise CPWA-Compliant</span>
            <span>•</span>
            <span>PBKDF2/Argon2</span>
            <span>•</span>
            <span>Zero-Trust</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: ENTERPRISE FORM WORKSPACE ───────────── */}
      <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-center items-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-[420px] space-y-6">
          
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between pb-4 border-b border-slate-100">
            <Logo theme="light" size="sm" href="/" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Contractor OS
            </span>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold mb-3">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Set New Password
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Create a new secure password
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Choose a strong password to safeguard your contracting firm's projects, bank guarantees, and financial records.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-start gap-2.5 shadow-2xs">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="space-y-1">
                <span className="font-semibold block">Password Reset Error</span>
                <span className="font-medium leading-relaxed block">{error}</span>
                <Link href="/forgot-password" className="text-blue-600 hover:underline font-semibold text-[11px] inline-block mt-1">
                  Request a fresh reset link →
                </Link>
              </div>
            </div>
          )}

          {/* Success Screen */}
          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-emerald-950">
                  Password Updated Successfully
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed max-w-sm mx-auto">
                  Your account password has been updated. You are now authenticated with your new credentials.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Proceed to Command Center</span>
                  <span className="text-[10px] font-normal opacity-70">({countdown}s)</span>
                </button>
              </div>
            </div>
          ) : (
            /* New Password Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Optional Manual OTP / Email fields when arriving without session */}
              {hasSession === false && (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Recovery Code Verification</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Registered Work Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@contractorfirm.com"
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      6-Digit Recovery Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={8}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\s+/g, ''))}
                      placeholder="e.g. 123456"
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs uppercase tracking-widest text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* New Password */}
              <div>
                <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New Password <span className="text-blue-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 transition-all"
                    placeholder="Enter new password (min. 8 characters)"
                  />
                  <EyeToggle show={showPassword} onToggle={() => setShowPassword(v => !v)} />
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Strength:</span>
                      <span className={`font-bold ${strength.textColor}`}>{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${strength.color}`}
                        style={{ width: `${strength.pct}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1 pt-1 text-[10.5px]">
                      <span className={strength.hasLength ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                        {strength.hasLength ? '✓' : '•'} 8+ characters
                      </span>
                      <span className={strength.hasNumber ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                        {strength.hasNumber ? '✓' : '•'} At least 1 number
                      </span>
                      <span className={strength.hasUpper ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                        {strength.hasUpper ? '✓' : '•'} Uppercase letter
                      </span>
                      <span className={strength.hasSpecial ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                        {strength.hasSpecial ? '✓' : '•'} Special symbol
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm New Password <span className="text-blue-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 transition-all"
                    placeholder="Repeat new password"
                  />
                  <EyeToggle show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-[11px] text-red-600 font-medium">
                    Passwords do not match
                  </p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="mt-1 text-[11px] text-emerald-600 font-medium">
                    ✓ Passwords match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || password.length < 8 || password !== confirmPassword}
                className="h-11 w-full rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Updating Workspace Credentials…</span>
                  </>
                ) : (
                  <span>Update Password &amp; Sign In</span>
                )}
              </button>
            </form>
          )}

          {/* Back to Sign In */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Sign In</span>
            </Link>

            <Link
              href="/forgot-password"
              className="font-medium text-slate-500 hover:text-slate-800"
            >
              Need a new link?
            </Link>
          </div>

        </div>
      </div>

    </div>
  )
}

