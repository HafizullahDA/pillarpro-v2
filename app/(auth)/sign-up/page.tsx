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
      if (roleParam && ['site_supervisor', 'accountant', 'partner', 'viewer'].includes(roleParam)) {
        setJoinRole(roleParam as any)
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
    <div className="min-h-dvh w-full grid lg:grid-cols-12 bg-white antialiased selection:bg-blue-600 selection:text-white">
      {/* ── LEFT PANEL: DARK INSTITUTIONAL SHOWCASE ──── */}
      <div className="hidden lg:flex lg:flex-col lg:justify-between lg:col-span-5 xl:col-span-5 p-10 xl:p-14 bg-slate-900 text-white relative overflow-hidden border-r border-slate-800 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem]">
        {/* Subtle radial glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Top Logo & Enterprise Trial Badge */}
          <div className="flex items-center justify-between gap-3">
            <Logo theme="dark" size="md" subtitle="Civil Contractor OS" href="/" />
            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-3 py-1 rounded-md tracking-wide shadow-xs shrink-0 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              7-DAY FULL ENTERPRISE TRIAL • NO CREDIT CARD
            </span>
          </div>

          {planLabel && (
            <div className="text-[11px] font-bold tracking-wide uppercase text-blue-400 bg-blue-950/70 px-2.5 py-1 rounded-md border border-blue-800/80 inline-block">
              Configuring Plan: {planLabel}
            </div>
          )}

          {/* Headline */}
          <div className="pt-2">
            <h1 className="text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-tight">
              The Statutory &amp; Financial OS for Indian Civil Contractors.
            </h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Protect contract margins, stop unfair liquidated damages, and reconcile multi-agency Running Account bills down to the exact rupee.
            </p>
          </div>

          {/* Live Contract Telemetry Preview Card (Dark Glass Card) */}
          <div className="rounded-xl bg-slate-800/90 border border-slate-700 p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-[11px] text-slate-200 font-semibold truncate max-w-[180px]">
                  NH-44 Bypass Package
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                RA-04 Certified
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Gross Work Passed</span>
                <span className="font-bold text-white tabular-nums tracking-tight text-xs">₹54,00,000</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Net Bank Disbursed</span>
                <span className="font-bold text-emerald-400 tabular-nums tracking-tight text-xs">₹48,60,000</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-[10px] text-slate-400">
              <span>Clause 5 LD Protected: <b className="text-white tabular-nums tracking-tight">₹50,00,000</b></span>
              <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                TDS / Cess Reconciled
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </div>
          </div>

          {/* Structured 4-Item Capability Checklist (2x2 Grid) */}
          <div className="pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              All-in-One Enterprise Infra Suite
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium text-slate-300 leading-snug">Multi-Agency RA Bills &amp; Form 26</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium text-slate-300 leading-snug">Clause 5 Delay Defense &amp; EOT</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium text-slate-300 leading-snug">PillarVision™ Slip OCR Scanner</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium text-slate-300 leading-snug">Supplier Khata &amp; Partner Equity</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Agency & Confidentiality Footer */}
        <div className="relative z-10 pt-6 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium flex-wrap">
            <span className="text-slate-300 font-semibold">Engineered For:</span>
            <span>CPWD</span>
            <span>•</span>
            <span>State PWD</span>
            <span>•</span>
            <span>PMGSY</span>
            <span>•</span>
            <span>NHAI</span>
            <span>•</span>
            <span>NHPC</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
            <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Airtight multi-tenant isolation. Tender rates and margins remain 100% confidential.</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: CRISP WORKSPACE CREATION FORM ─────── */}
      <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-center items-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-[480px] space-y-5">
          
          {/* Mobile Header (Visible only on <lg) */}
          <div className="lg:hidden flex items-center justify-between pb-4 border-b border-slate-100">
            <Logo theme="light" size="sm" href="/" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              7-Day Free Trial
            </span>
          </div>

          {step === 'form' ? (
            <>
              {/* Mode Switcher: Segmented Control */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg border border-slate-200/80 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMode('new_firm')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-md transition-all text-center ${
                    mode === 'new_firm'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
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
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-md transition-all text-center ${
                    mode === 'join_firm'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Join Existing Firm</span>
                </button>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {mode === 'new_firm' ? 'Create your contractor workspace' : 'Join your firm’s workspace'}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {mode === 'new_firm'
                    ? 'Instant access to all modules during your 7-day free trial. Setup takes under 30 seconds.'
                    : 'Enter your firm’s invite code provided by your contractor administrator.'}
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-start gap-2.5 shadow-2xs">
                  <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'new_firm' ? (
                  <div>
                    <label htmlFor="firmName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Contracting Firm / Company Name <span className="text-blue-600">*</span>
                    </label>
                    <input
                      id="firmName"
                      type="text"
                      required
                      value={firmName}
                      onChange={e => setFirmName(e.target.value)}
                      className="h-10 sm:h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 transition-all"
                      placeholder="e.g. Apex Infratech Pvt. Ltd. or Lone Constructions"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="joinCode" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Firm Invite Code <span className="text-blue-600">*</span>
                      </label>
                      <input
                        id="joinCode"
                        type="text"
                        required
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                        className="h-10 sm:h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 tabular-nums tracking-widest uppercase placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 transition-all"
                        placeholder="e.g. APEX26"
                      />
                    </div>
                    <div>
                      <label htmlFor="joinRole" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Your Role at Firm
                      </label>
                      <select
                        id="joinRole"
                        value={joinRole}
                        onChange={e => setJoinRole(e.target.value as any)}
                        className="h-10 sm:h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 transition-all"
                      >
                        <option value="site_supervisor">Site Supervisor / Field Engineer</option>
                        <option value="accountant">Firm Accountant / Billing Engineer</option>
                        <option value="partner">Managing Partner / Director</option>
                        <option value="viewer">Site Auditor / Viewer</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="displayName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Your Full Name <span className="text-blue-600">*</span>
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    required
                    autoComplete="name"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="h-10 sm:h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 transition-all"
                    placeholder="e.g. Rajesh Kumar"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Work Email Address <span className="text-blue-600">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-10 sm:h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 transition-all"
                    placeholder="you@contractorfirm.com"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                        className="h-10 sm:h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 transition-all"
                        placeholder="Min. 8 chars"
                      />
                      <EyeToggle show={showPassword} onToggle={() => setShowPassword(v => !v)} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm" className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                        className="h-10 sm:h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 transition-all"
                        placeholder="Re-enter password"
                      />
                      <EyeToggle show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
                    </div>
                  </div>
                </div>

                {/* Pre-load Sample Highway Project & RA Bill (Clean 2x2 Grid) */}
                {mode === 'new_firm' && (
                  <div className="pt-1">
                    <label
                      className={`group relative flex flex-col p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                        seedStarter
                          ? 'border-blue-400 bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={seedStarter}
                          onChange={e => setSeedStarter(e.target.checked)}
                          className="sr-only"
                        />
                        
                        {/* Custom Checkbox */}
                        <div
                          className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all duration-200 ${
                            seedStarter
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'border-slate-300 bg-white text-transparent'
                          }`}
                        >
                          <svg
                            className={`w-3 h-3 transition-transform duration-200 ${
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

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              Pre-load Sample Highway Project &amp; RA Bill
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                              Recommended
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed text-xs">
                            Populates a full-scale PMGSY civil package so you can test certified billing, hindrance defenses, and equipment logs immediately.
                          </p>
                        </div>
                      </div>

                      {/* Clean 2x2 Summary Grid */}
                      <div className="mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <span className="text-emerald-600 font-bold shrink-0">✓</span>
                          <span className="font-medium truncate">₹1.78 Cr PMGSY Package &amp; BOQ</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <span className="text-emerald-600 font-bold shrink-0">✓</span>
                          <span className="font-medium truncate">Certified Form 26 RA Bill &amp; e-MB</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <span className="text-emerald-600 font-bold shrink-0">✓</span>
                          <span className="font-medium truncate">Clause 5 Hindrance &amp; EOT Claim</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <span className="text-emerald-600 font-bold shrink-0">✓</span>
                          <span className="font-medium truncate">JCB Diesel Log &amp; Supplier Khata</span>
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {/* Unified Enterprise Primary Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      {mode === 'new_firm' ? 'Setting up workspace…' : 'Joining firm workspace…'}
                    </>
                  ) : (
                    <>
                      <span>{mode === 'new_firm' ? 'Create Firm Workspace & Start Trial' : 'Join Firm Workspace'}</span>
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>

                {/* Single Legal Agreement Line */}
                <p className="text-[11px] text-center text-slate-500 leading-relaxed">
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
                <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-start gap-2.5 shadow-2xs">
                  <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium leading-relaxed">{verifyError}</span>
                </div>
              )}

              {resendNotice && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 flex items-start gap-2.5 shadow-2xs">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">{resendNotice}</span>
                </div>
              )}

              {/* Form: Enter 6-digit OTP code */}
              <form onSubmit={handleVerifyOtp} className="space-y-3.5 bg-slate-50/80 rounded-xl p-4 border border-slate-200">
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
                    className="block h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-center text-xl tabular-nums tracking-widest text-slate-900 placeholder:text-slate-300 shadow-2xs transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 uppercase"
                    placeholder="123456"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifyLoading || !otpCode.trim()}
                  className="h-11 w-full rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifyLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Verifying…
                    </>
                  ) : (
                    <>
                      <span>Verify Code &amp; Launch Workspace</span>
                      <span aria-hidden="true">→</span>
                    </>
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-xs font-semibold text-slate-700 shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendLoading ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
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
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-600 space-y-1 leading-relaxed">
                <p className="font-semibold text-slate-700">Check these common points:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-500">
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

          {/* Bottom Footer */}
          <div className="border-t border-slate-200 pt-5 text-center">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link href="/sign-in" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Sign in to your workspace →
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
