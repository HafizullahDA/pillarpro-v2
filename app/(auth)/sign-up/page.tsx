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

  const [mode, setMode]                   = useState<'new_firm' | 'join_firm'>('new_firm')
  const [displayName, setDisplayName]     = useState('')
  const [firmName, setFirmName]           = useState('')
  const [joinCode, setJoinCode]           = useState('')
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [confirm, setConfirm]             = useState('')
  const [seedStarter, setSeedStarter]     = useState(true)
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [error, setError]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [successNotice, setSuccessNotice] = useState('')

  // Check URL parameters for join code
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('join')
      if (code) {
        setJoinCode(code.toUpperCase().trim())
        setMode('join_firm')
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessNotice('')

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
      // 0. Enforce sliding-window rate limit pre-flight (anti-bot & spam protection)
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
        // Continue if pre-flight check fails
      }

      // 1. Sign up user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: displayName.trim() || email.split('@')[0],
            firm_name: mode === 'new_firm' ? firmName.trim() : undefined,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      // If session is not automatically active, sign in with credentials
      if (!authData.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })
        if (signInError) {
          setSuccessNotice(
            'Account created! A confirmation email has been sent. Please check your inbox, click the link, and then sign in.'
          )
          setLoading(false)
          return
        }
      }

      // 2. Provision or Link to Organization
      if (mode === 'new_firm') {
        const { error: rpcError } = await supabase.rpc('onboard_contractor', {
          p_firm_name: firmName.trim(),
          p_display_name: displayName.trim() || email.split('@')[0],
          p_seed_starter: seedStarter,
        })

        if (rpcError) {
          console.warn('RPC onboarding notice:', rpcError.message)
          // Direct fallback
          const { data: orgData } = await supabase
            .from('organizations')
            .insert({
              name: firmName.trim(),
              legal_name: firmName.trim(),
              registration_no: 'Class-A Govt Contractor, PWD / PMGSY',
              email: email.trim().toLowerCase(),
            })
            .select('id')
            .single()

          if (authData.user) {
            await supabase.from('user_profiles').upsert({
              id: authData.user.id,
              email: email.trim().toLowerCase(),
              display_name: displayName.trim() || email.split('@')[0],
              organization_id: orgData?.id ?? null,
              status: 'active',
            }, { onConflict: 'id' })
          }
        }
      } else {
        // Joining existing organization
        const { error: joinError } = await supabase.rpc('join_organization', {
          p_join_code: joinCode.trim().toUpperCase(),
          p_display_name: displayName.trim() || email.split('@')[0],
          p_role: 'site_supervisor',
        })

        if (joinError) {
          setError(joinError.message || 'Invalid invite code. Please check with your firm owner.')
          setLoading(false)
          return
        }
      }

      // 3. Seamlessly route directly to the contractor dashboard
      router.refresh()
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during onboarding.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07090E] flex flex-col justify-center py-8 px-4">
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative rounded-2xl bg-gradient-to-b from-[#0F1626] to-[#0A0E1A] border border-slate-800 shadow-2xl shadow-blue-950/40 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[660px]">
          
          {/* Left Brand Showcase & Value Proposition Column (Unified Deep Slate Surface) */}
          <div className="lg:col-span-5 bg-slate-950/40 p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <Logo theme="dark" size="md" subtitle="Civil Contractor OS" />
              </div>

              {/* Tagline Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                Built for Civil & Highway Infrastructure
              </div>

              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug">
                The Financial & Operations OS for Government Contractors
              </h1>

              {/* 3 Value Proposition Bullets */}
              <div className="mt-7 space-y-3.5 text-xs lg:text-sm text-slate-300 leading-relaxed">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800/60">
                  <div className="h-5 w-5 rounded-md bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    ✓
                  </div>
                  <p>
                    <strong className="text-white font-semibold">Treasury RA Bill Reconciliation:</strong> Reconcile government bill sanctions vs statutory deductions (retention, TDS, GST TDS, labor cess) and net bank credits for PWD, CPWD & PMGSY.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800/60">
                  <div className="h-5 w-5 rounded-md bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    ✓
                  </div>
                  <p>
                    <strong className="text-white font-semibold">Site-to-Office Control:</strong> Log field expenses with mobile AI receipt scanning, muster daily-wage labor, and manage supplier khata ledgers without messy spreadsheets.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800/60">
                  <div className="h-5 w-5 rounded-md bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    ✓
                  </div>
                  <p>
                    <strong className="text-white font-semibold">Capital & BG Protection:</strong> Automated 30-day Bank Guarantee expiry warnings, partner equity parity ledgers, and live project cost tracking.
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Footer */}
            <div className="mt-8 pt-5 border-t border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  <span className="inline-block h-6 w-6 rounded-md bg-blue-600 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-slate-900">PWD</span>
                  <span className="inline-block h-6 w-6 rounded-md bg-emerald-600 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-slate-900">R&B</span>
                  <span className="inline-block h-6 w-6 rounded-md bg-amber-600 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-slate-900">NH</span>
                </div>
                <div className="text-xs text-slate-400 leading-snug">
                  Airtight multi-tenant isolation. Each contracting firm operates in its own private encrypted workspace.
                </div>
              </div>
            </div>
          </div>

          {/* Right Self-Serve Onboarding Form Column (Unified Dark Surface — ZERO Mismatched Panels) */}
          <div className="lg:col-span-7 bg-[#0C111E]/90 p-8 lg:p-10 flex flex-col justify-center relative z-10 text-white">
            <div className="max-w-md w-full mx-auto">
              
              {/* Unified Tab Toggle: Consistent 8px Radius & Brand Blue Active */}
              <div className="flex rounded-lg bg-slate-950/90 p-1 mb-6 text-xs font-semibold border border-slate-800 shadow-inner">
                <button
                  type="button"
                  onClick={() => setMode('new_firm')}
                  className={`flex-1 py-2 rounded-lg transition-all text-center ${
                    mode === 'new_firm'
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white font-medium'
                  }`}
                >
                  Register New Firm
                </button>
                <button
                  type="button"
                  onClick={() => setMode('join_firm')}
                  className={`flex-1 py-2 rounded-lg transition-all text-center ${
                    mode === 'join_firm'
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white font-medium'
                  }`}
                >
                  Join Existing Firm
                </button>
              </div>

              <div className="mb-5">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {mode === 'new_firm' ? 'Create your contractor workspace' : 'Join your firm’s workspace'}
                </h2>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  {mode === 'new_firm'
                    ? 'Set up your firm in 30 seconds. Start managing RA bills and site finances.'
                    : 'Enter your firm’s invite code provided by your contractor owner.'}
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-950/50 border border-red-800/60 p-3 text-xs text-red-300 flex items-start gap-2.5 shadow-sm">
                  <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {successNotice && (
                <div className="mb-4 rounded-lg bg-emerald-950/50 border border-emerald-800/60 p-3 text-xs text-emerald-300 flex items-start gap-2.5 shadow-sm">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{successNotice}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'new_firm' ? (
                  <div>
                    <label htmlFor="firmName" className="block text-xs font-semibold text-slate-300 mb-1">
                      Contracting Firm / Company Name <span className="text-blue-400">*</span>
                    </label>
                    <input
                      id="firmName"
                      type="text"
                      required
                      value={firmName}
                      onChange={e => setFirmName(e.target.value)}
                      className="block w-full rounded-lg border border-slate-800 bg-[#080C16] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                      placeholder="e.g. Apex Infratech Pvt. Ltd. or Bhat Constructions"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="joinCode" className="block text-xs font-semibold text-slate-300 mb-1">
                      Firm Invite Code <span className="text-blue-400">*</span>
                    </label>
                    <input
                      id="joinCode"
                      type="text"
                      required
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      className="block w-full rounded-lg border border-slate-800 bg-[#080C16] px-3.5 py-2.5 text-sm text-white font-mono tracking-wider uppercase placeholder-slate-500 shadow-inner transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                      placeholder="e.g. APEX26"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="displayName" className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Full Name <span className="text-blue-400">*</span>
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    required
                    autoComplete="name"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-[#080C16] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                    placeholder="e.g. Rajesh Kumar"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1">
                    Work Email Address <span className="text-blue-400">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-[#080C16] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                    placeholder="you@contractorfirm.com"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-slate-300 mb-1">
                      Password <span className="text-blue-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="block w-full rounded-lg border border-slate-800 bg-[#080C16] px-3.5 py-2.5 pr-9 text-sm text-white placeholder-slate-500 shadow-inner transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                        placeholder="Min. 8 chars"
                      />
                      <EyeToggle show={showPassword} onToggle={() => setShowPassword(v => !v)} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm" className="block text-xs font-semibold text-slate-300 mb-1">
                      Confirm Password <span className="text-blue-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="confirm"
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        className="block w-full rounded-lg border border-slate-800 bg-[#080C16] px-3.5 py-2.5 pr-9 text-sm text-white placeholder-slate-500 shadow-inner transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                        placeholder="Re-enter password"
                      />
                      <EyeToggle show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
                    </div>
                  </div>
                </div>

                {mode === 'new_firm' && (
                  <div className="pt-1">
                    <label className="relative flex items-start gap-3 p-3.5 rounded-lg border border-slate-800/80 bg-slate-950/50 hover:border-slate-700/80 shadow-inner transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={seedStarter}
                        onChange={e => setSeedStarter(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500/25"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-slate-200 block">
                          Include sample Highway Project & RA bill template (Recommended)
                        </span>
                        <span className="text-slate-400 block mt-0.5 leading-normal">
                          Populates your workspace with a realistic PWD project, sample RA bill, supplier ledger & muster roll so your dashboard is instantly interactive.
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                      {mode === 'new_firm' ? 'Launch Contractor Workspace' : 'Join Firm Workspace'}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
                <p className="text-xs text-slate-400">
                  Already registered?{' '}
                  <Link href="/sign-in" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                    Sign in to your account →
                  </Link>
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
