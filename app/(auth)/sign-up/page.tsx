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

export default function SignUpPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]                   = useState<'form' | 'verification'>('form')
  const [mode, setMode]                   = useState<'new_firm' | 'join_firm'>('new_firm')
  const [displayName, setDisplayName]     = useState('')
  const [firmName, setFirmName]           = useState('')
  const [joinCode, setJoinCode]           = useState('')
  const [joinRole, setJoinRole]           = useState<'site_supervisor' | 'accountant' | 'partner' | 'viewer'>('site_supervisor')
  const [selectedPlan, setSelectedPlan]   = useState<string | null>(null)
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [confirm, setConfirm]             = useState('')
  const [seedStarter, setSeedStarter]     = useState(true)
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [error, setError]                 = useState('')
  const [loading, setLoading]             = useState(false)

  // Verification & OTP state
  const [otpCode, setOtpCode]             = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyError, setVerifyError]     = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendNotice, setResendNotice]   = useState('')
  const [resendLoading, setResendLoading] = useState(false)

  // Check URL parameters for join code and selected plan
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('join')
      const plan = params.get('plan')
      const roleParam = params.get('role')
      if (code) {
        setJoinCode(code.toUpperCase().trim())
        setMode('join_firm')
      }
      if (plan) {
        setSelectedPlan(plan.toLowerCase().trim())
      }
    }
  }, [])

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown(c => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const provisionUser = async (userId?: string) => {
    if (mode === 'new_firm') {
      const { error: rpcError } = await supabase.rpc('onboard_contractor', {
        p_firm_name: firmName.trim(),
        p_display_name: displayName.trim() || email.split('@')[0],
        p_seed_starter: seedStarter,
      })

      if (rpcError) {
        console.warn('RPC onboarding notice:', rpcError.message)
        const { data: orgData } = await supabase
          .from('organizations')
          .insert({
            name: firmName.trim(),
            legal_name: firmName.trim(),
            registration_no: 'Class-A Govt Contractor, PWD / PMGSY',
            email: email.trim().toLowerCase(),
            plan_tier: selectedPlan || 'growth',
            subscription_status: 'trialing',
          })
          .select('id')
          .single()

        if (userId) {
          await supabase.from('user_profiles').upsert({
            id: userId,
            email: email.trim().toLowerCase(),
            display_name: displayName.trim() || email.split('@')[0],
            organization_id: orgData?.id ?? null,
            status: 'active',
          }, { onConflict: 'id' })
        }
      }
    } else {
      const { error: joinError } = await supabase.rpc('join_organization', {
        p_join_code: joinCode.trim().toUpperCase(),
        p_display_name: displayName.trim() || email.split('@')[0],
        p_role: joinRole,
      })

      if (joinError) {
        throw new Error(joinError.message || 'Invalid invite code. Please check with your firm owner.')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setVerifyError('')

    if (mode === 'new_firm' && !firmName.trim()) {
      setError('Please enter your Contracting Firm / Company name.')
      return
    }

    if (mode === 'join_firm' && !joinCode.trim()) {
      setError('Please enter your Firm’s Invite Code.')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      try {
        const rlRes = await fetch('/api/auth/rate-limit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sign-up' }),
        })
        const rlData = await rlRes.json().catch(() => ({}))

        if (rlRes.status === 429 || rlData.ok === false) {
          setError(rlData.error || 'Too many registration attempts from this IP. Please wait before trying again.')
          setLoading(false)
          return
        }
      } catch {
        // Continue if rate limit check fails
      }

      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName.trim() || email.split('@')[0],
            firm_name: mode === 'new_firm' ? firmName.trim() : undefined,
            join_code: mode === 'join_firm' ? joinCode.trim().toUpperCase() : undefined,
            join_role: mode === 'join_firm' ? joinRole : undefined,
            seed_starter: seedStarter,
            preferred_plan: selectedPlan || 'growth',
          },
        },
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (authData.session) {
        await provisionUser(authData.user?.id)
        router.refresh()
        router.push('/dashboard')
        return
      }

      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (signInData?.session) {
        await provisionUser(signInData.user?.id)
        router.refresh()
        router.push('/dashboard')
        return
      }

      setStep('verification')
      setResendCooldown(60)
      setResendNotice('Confirmation email sent! Please check your inbox and spam folder.')
      setLoading(false)
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during onboarding.')
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode.trim()) return

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

      await provisionUser(verifyData.user?.id)
      router.refresh()
      router.push('/dashboard')
    } catch (err: any) {
      setVerifyError(err?.message || 'Verification failed. Please try again.')
      setVerifyLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || resendLoading) return

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
        setResendNotice('Confirmation email resent! Please check your inbox and spam folder.')
      }
    } catch (err: any) {
      setVerifyError(err?.message || 'Failed to resend confirmation email.')
    } finally {
      setResendLoading(false)
    }
  }

  const planLabel = selectedPlan === 'enterprise'
    ? 'Enterprise Infra (₹3,999/mo)'
    : selectedPlan === 'bootstrap'
    ? 'Bootstrap (₹999/mo)'
    : selectedPlan === 'growth'
    ? 'Growth Contractor (₹1,999/mo)'
    : null

  return (
    <div className="min-h-screen bg-[#F8F9FA] bg-enterprise-grid flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative rounded-2xl bg-white shadow-xl border border-slate-200/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
          
          {/* ── Left Brand Showcase Column (Refined Executive Slate Theme) ── */}
          <div className="order-2 lg:order-1 lg:col-span-5 bg-slate-50/90 p-7 sm:p-9 lg:p-10 flex flex-col justify-between border-t lg:border-t-0 lg:border-r border-slate-200/80 text-slate-900 relative overflow-hidden">
            {/* Subtle background ambient wash */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="hidden lg:flex items-center gap-3 mb-8">
                <Logo theme="light" size="md" subtitle="Civil Contractor OS" href="/" />
              </div>

              {/* Free Trial Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold mb-4 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                14-Day Free Trial • No Credit Card Required
              </div>

              {planLabel && (
                <div className="mb-3 text-[11px] font-bold tracking-wide uppercase text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 inline-block">
                  Configuring Plan: {planLabel}
                </div>
              )}

              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
                The Statutory &amp; Financial OS for Indian Civil Contractors
              </h1>
              
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Protect contract margins, stop unfair liquidated damages, and reconcile multi-agency Running Account bills down to the exact rupee.
              </p>

              {/* Live Contract Audit Preview Card */}
              <div className="mt-6 rounded-2xl bg-white border border-slate-200/90 p-4 shadow-2xs hover:border-blue-300/80 hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200 space-y-3 cursor-default">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    <span className="text-[11px] font-mono text-slate-700 font-semibold truncate max-w-[180px]">
                      NH-44 Bypass Package
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    RA-04 Certified
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Gross Work Passed</span>
                    <span className="font-bold text-slate-900 font-mono text-xs">₹54,00,000</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Net Bank Disbursed</span>
                    <span className="font-bold text-emerald-700 font-mono text-xs">₹48,60,000</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Clause 5 LD Protected: <b className="text-slate-900 font-mono">₹50,00,000</b></span>
                  <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                    TDS / Cess Reconciled
                    <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Replaces 4 Disconnected Apps Ticker */}
              <div className="mt-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  All-in-One: Replaces Disconnected Apps &amp; Spreadsheets
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Multi-Agency RA Bills',
                    'Clause 5 Delay Defense',
                    'Form 26 e-MB',
                    'PillarVision™ Slip Scanner',
                    'Labor Muster Roll',
                    'Machinery & Diesel HSD',
                    'Supplier Khatas',
                    'Partner Capital Parity',
                  ].map((feat, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white text-slate-700 border border-slate-200/80 shadow-2xs hover:border-blue-300 hover:text-blue-700 hover:-translate-y-0.5 transition-all duration-150 cursor-default"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Trust Authorities Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200/80 text-[11px] text-slate-500 relative z-10">
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span className="font-semibold text-slate-700">Engineered for:</span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-700">CPWD</span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-700">State PWD</span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-700">PMGSY</span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-700">NHAI</span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-700">NHPC</span>
              </div>
              <span className="text-[10px] text-slate-400">
                Airtight multi-tenant isolation. Your tender rates and margins remain 100% confidential.
              </span>
            </div>
          </div>

          {/* ── Right Column: Clean, Frictionless Onboarding Form ── */}
          <div className="order-1 lg:order-2 lg:col-span-7 bg-white p-7 sm:p-9 lg:p-12 flex flex-col justify-center relative z-10 text-slate-900">
            <div className="max-w-md w-full mx-auto">
              
              <div className="lg:hidden flex items-center justify-between pb-5 mb-5 border-b border-slate-100">
                <Logo theme="light" size="md" subtitle="Civil Contractor OS" href="/" />
              </div>

              {step === 'form' ? (
                <>
                  {/* Mode Selector Tab */}
                  <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 mb-6 text-xs font-semibold border border-slate-200/80 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setMode('new_firm')}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all text-center ${
                        mode === 'new_firm'
                          ? 'bg-white text-slate-900 shadow-sm font-bold'
                          : 'text-slate-600 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>Register New Firm</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('join_firm')}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all text-center ${
                        mode === 'join_firm'
                          ? 'bg-white text-slate-900 shadow-sm font-bold'
                          : 'text-slate-600 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>Join Existing Firm</span>
                    </button>
                  </div>

                  <div className="mb-5">
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {mode === 'new_firm' ? 'Create your contractor workspace' : 'Join your firm’s workspace'}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      {mode === 'new_firm'
                        ? 'Instant access to all modules during your 14-day free trial. Setup takes under 30 seconds.'
                        : 'Enter your firm’s invite code provided by your contractor administrator.'}
                    </p>
                  </div>

                  {error && (
                    <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 flex items-start gap-2.5 shadow-2xs">
                      <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium leading-relaxed">{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    {mode === 'new_firm' ? (
                      <div>
                        <label htmlFor="firmName" className="block text-xs font-semibold text-slate-700 mb-1">
                          Contracting Firm / Company Name <span className="text-blue-600">*</span>
                        </label>
                        <input
                          id="firmName"
                          type="text"
                          required
                          value={firmName}
                          onChange={e => setFirmName(e.target.value)}
                          className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-2xs transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
                          placeholder="e.g. Apex Infratech Pvt. Ltd. or Lone Constructions"
                        />
                      </div>
                    ) : (
                      <div>
                        <label htmlFor="joinCode" className="block text-xs font-semibold text-slate-700 mb-1">
                          Firm Invite Code <span className="text-blue-600">*</span>
                        </label>
                        <input
                          id="joinCode"
                          type="text"
                          required
                          value={joinCode}
                          onChange={e => setJoinCode(e.target.value.toUpperCase())}
                          className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 font-mono tracking-wider uppercase placeholder-slate-400 shadow-2xs transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
                          placeholder="e.g. APEX26"
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="displayName" className="block text-xs font-semibold text-slate-700 mb-1">
                        Your Full Name <span className="text-blue-600">*</span>
                      </label>
                      <input
                        id="displayName"
                        type="text"
                        required
                        autoComplete="name"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-2xs transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
                        placeholder="e.g. Rajesh Kumar"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                        Work Email Address <span className="text-blue-600">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-2xs transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
                        placeholder="you@contractorfirm.com"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
                          Password <span className="text-blue-600">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-9 text-sm text-slate-900 placeholder-slate-400 shadow-2xs transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
                            placeholder="Min. 8 chars"
                          />
                          <EyeToggle show={showPassword} onToggle={() => setShowPassword(v => !v)} />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="confirm" className="block text-xs font-semibold text-slate-700 mb-1">
                          Confirm Password <span className="text-blue-600">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="confirm"
                            type={showConfirm ? 'text' : 'password'}
                            autoComplete="new-password"
                            required
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-9 text-sm text-slate-900 placeholder-slate-400 shadow-2xs transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
                            placeholder="Re-enter password"
                          />
                          <EyeToggle show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
                        </div>
                      </div>
                    </div>

                    {mode === 'new_firm' && (
                      <div className="pt-1">
                        <label
                          className={`group relative flex flex-col p-4 rounded-2xl border transition-all duration-300 ease-out cursor-pointer select-none ${
                            seedStarter
                              ? 'border-blue-400 bg-gradient-to-br from-blue-50/90 via-white to-blue-50/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-blue-500'
                              : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-2xs hover:-translate-y-0.5'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={seedStarter}
                              onChange={e => setSeedStarter(e.target.checked)}
                              className="sr-only"
                            />
                            
                            {/* Animated Custom Checkbox */}
                            <div
                              className={`mt-0.5 h-5 w-5 rounded-lg border flex items-center justify-center shrink-0 transition-all duration-200 ${
                                seedStarter
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs scale-105 group-hover:scale-110'
                                  : 'border-slate-300 bg-white text-transparent group-hover:border-slate-400'
                              }`}
                            >
                              <svg
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                  seedStarter ? 'scale-100' : 'scale-0'
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>

                            <div className="flex-1 min-w-0 text-xs">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-bold text-slate-900 group-hover:text-blue-900 transition-colors text-xs sm:text-sm">
                                  Pre-load Sample Highway Project &amp; RA Bill
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-2xs group-hover:scale-105 transition-transform duration-200">
                                  Recommended
                                </span>
                              </div>
                              <p className="text-slate-600 leading-relaxed text-[11px] sm:text-xs">
                                Populates a full-scale 10-module PMGSY civil package (₹1.78 Cr) with Form 26 Measurement Book, Clause 5 Delay Defense claim, 60/40 Partner Equity, JCB POL diesel log, and Store inventory so you can test all features immediately.
                              </p>
                            </div>
                          </div>

                          {/* Interactive Animated Feature Showcase Chips */}
                          <div
                            className={`mt-3 pt-3 border-t border-blue-100/80 grid grid-cols-2 sm:grid-cols-3 gap-1.5 transition-all duration-300 ${
                              seedStarter ? 'opacity-100 max-h-40' : 'opacity-60 max-h-40'
                            }`}
                          >
                            {[
                              'PMGSY Highway (₹1.78 Cr)',
                              'RA Bill 01 & Form 26 e-MB',
                              'Clause 5 Delay Defense',
                              '60/40 Partner Equity',
                              'JCB & Excavator POL Log',
                              'OPC Cement & Steel Stock',
                              'Daily Muster Roll & OT',
                              '₹8.9L PBG Deposit Radar',
                              'Supplier Khata & GST TDS',
                            ].map((text, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium bg-white/90 text-slate-700 border border-slate-200/80 shadow-2xs hover:border-blue-300 hover:text-blue-700 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-150 cursor-pointer"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                                <span className="truncate">{text}</span>
                              </div>
                            ))}
                          </div>
                        </label>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 active:scale-[0.98] shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          {mode === 'new_firm' ? 'Setting up workspace…' : 'Joining firm workspace…'}
                        </>
                      ) : (
                        <>
                          {mode === 'new_firm' ? 'Start 14-Day Free Trial' : 'Join Firm Workspace'}
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </>
                      )}
                    </button>

                    <p className="mt-3 text-[11px] text-center text-slate-500 leading-relaxed">
                      By registering, you agree to PillarPro&apos;s{' '}
                      <Link href="/terms" target="_blank" className="underline hover:text-slate-700 transition-colors">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" target="_blank" className="underline hover:text-slate-700 transition-colors">
                        Privacy Policy
                      </Link>.
                    </p>
                  </form>
                </>
              ) : (
                /* ── Verification Step ── */
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 flex items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 shadow-xs">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                      Confirm your email address
                    </h2>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      We sent a confirmation link &amp; verification code to:
                    </p>
                    <p className="mt-1 inline-block px-3 py-1 rounded-lg bg-slate-100 font-semibold text-slate-900 text-xs sm:text-sm border border-slate-200">
                      {email}
                    </p>
                  </div>

                  {verifyError && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 flex items-start gap-2.5 shadow-2xs">
                      <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">{verifyError}</span>
                    </div>
                  )}

                  {resendNotice && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 flex items-start gap-2.5 shadow-2xs">
                      <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">{resendNotice}</span>
                    </div>
                  )}

                  {/* Form 1: Enter 6-digit OTP code */}
                  <form onSubmit={handleVerifyOtp} className="space-y-3.5 bg-slate-50/80 rounded-2xl p-4 border border-slate-200">
                    <div>
                      <label htmlFor="otpCode" className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                        Enter 6-Digit Code (from confirmation email)
                      </label>
                      <input
                        id="otpCode"
                        type="text"
                        required
                        maxLength={8}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\s+/g, ''))}
                        className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-center text-lg font-mono tracking-widest text-slate-900 placeholder-slate-300 shadow-2xs transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 uppercase"
                        placeholder="123456"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={verifyLoading || !otpCode.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 active:scale-[0.98] shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifyLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Verifying…
                        </>
                      ) : (
                        'Verify Code & Launch Workspace'
                      )}
                    </button>
                  </form>

                  {/* Resend Confirmation Section */}
                  <div className="pt-2 text-center">
                    <p className="text-xs text-slate-500 mb-2">
                      Didn&apos;t receive the email or link?
                    </p>
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={resendCooldown > 0 || resendLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-xs font-semibold text-slate-700 shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendLoading ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Sending email…
                        </>
                      ) : resendCooldown > 0 ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Resend email in {resendCooldown}s
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Resend Confirmation Email
                        </>
                      )}
                    </button>
                  </div>

                  {/* Troubleshooting Guidance Card */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-[11px] text-slate-500 space-y-1 leading-relaxed">
                    <p className="font-semibold text-slate-700">Check these common points:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Check your <strong>Spam / Junk</strong> folder in case your mail provider flagged it.</li>
                      <li>Standard delivery from the shared verification gateway usually takes 30–60 seconds.</li>
                      <li>You can also click the link directly inside the email on your phone or PC.</li>
                    </ul>
                  </div>

                  {/* Change Email or Sign In */}
                  <div className="pt-2 text-center space-y-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('form')
                        setVerifyError('')
                      }}
                      className="text-slate-600 hover:text-slate-900 font-medium underline"
                    >
                      ← Need to edit your email address?
                    </button>
                    <div>
                      <span className="text-slate-500">Already confirmed? </span>
                      <Link href="/sign-in" className="font-semibold text-blue-600 hover:text-blue-700">
                        Sign in here →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-slate-100 text-center space-y-2.5">
                <p className="text-xs text-slate-600">
                  Already have an account?{' '}
                  <Link href="/sign-in" className="font-bold text-slate-900 hover:underline transition-colors">
                    Sign in to your workspace →
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

