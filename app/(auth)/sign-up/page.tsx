'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/Logo'

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

  const [displayName, setDisplayName]     = useState('')
  const [firmName, setFirmName]           = useState('')
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [confirm, setConfirm]             = useState('')
  const [seedStarter, setSeedStarter]     = useState(true)
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [error, setError]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [successNotice, setSuccessNotice] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessNotice('')

    if (!firmName.trim()) {
      setError('Please enter your Contracting Firm / Company name.')
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
      // 1. Sign up user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: displayName.trim() || email.split('@')[0],
            firm_name: firmName.trim(),
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
          // If email verification is enforced on the Supabase project
          setSuccessNotice(
            'Account created! A confirmation email has been sent. Please check your inbox, click the link, and then sign in.'
          )
          setLoading(false)
          return
        }
      }

      // 2. Call onboard_contractor RPC to create organization & seed starter data
      const { data: rpcData, error: rpcError } = await supabase.rpc('onboard_contractor', {
        p_firm_name: firmName.trim(),
        p_display_name: displayName.trim() || email.split('@')[0],
        p_seed_starter: seedStarter,
      })

      if (rpcError) {
        console.warn('RPC onboarding notice:', rpcError.message)
        // Fallback: Direct organization & profile upsert in case migration hasn't been executed
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

      // 3. Seamlessly route directly to the contractor dashboard
      router.refresh()
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during onboarding.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center">
      <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          
          {/* Left Brand Showcase & Value Proposition Column */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-8">
                <Logo theme="dark" size="md" subtitle="Civil Contractor OS" />
              </div>

              {/* Tagline & 2-3 Line Value Proposition */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                Built for Civil & Highway Infrastructure
              </div>

              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-snug">
                The Financial & Operations OS for Government Contractors
              </h1>

              {/* The 2-3 Lines What PillarPro Does */}
              <div className="mt-6 space-y-4 text-slate-300 text-sm leading-relaxed">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5 text-blue-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p>
                    <strong className="text-white font-semibold">Treasury RA Bill Reconciliation:</strong> Reconcile government bill sanctions vs statutory deductions (retention, TDS, GST TDS, labor cess) and net bank credits for PWD, CPWD & PMGSY.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5 text-blue-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p>
                    <strong className="text-white font-semibold">Site-to-Office Control:</strong> Log field expenses with mobile AI receipt scanning, muster daily-wage labor, and manage supplier khata ledgers without messy spreadsheets.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5 text-blue-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p>
                    <strong className="text-white font-semibold">Capital & BG Protection:</strong> Automated Bank Guarantee expiry alerts, partner equity parity ledgers, and live project cost tracking.
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Footer */}
            <div className="mt-8 pt-6 border-t border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  <span className="inline-block h-7 w-7 rounded-full ring-2 ring-slate-900 bg-blue-600 text-[10px] font-bold text-white flex items-center justify-center">PWD</span>
                  <span className="inline-block h-7 w-7 rounded-full ring-2 ring-slate-900 bg-emerald-600 text-[10px] font-bold text-white flex items-center justify-center">R&B</span>
                  <span className="inline-block h-7 w-7 rounded-full ring-2 ring-slate-900 bg-amber-600 text-[10px] font-bold text-white flex items-center justify-center">NH</span>
                </div>
                <div className="text-xs text-slate-400">
                  Airtight multi-tenant isolation. Each contracting firm operates in its own private encrypted workspace.
                </div>
              </div>
            </div>
          </div>

          {/* Right Self-Serve Onboarding Form Column */}
          <div className="lg:col-span-7 bg-white p-8 lg:p-10 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create your contractor workspace</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Set up your firm in 30 seconds. Start managing RA bills and site finances.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-700 flex items-start gap-2.5">
                  <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {successNotice && (
                <div className="mb-5 rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-sm text-emerald-800 flex items-start gap-2.5">
                  <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{successNotice}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="firmName" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Contracting Firm / Company Name <span className="text-blue-600">*</span>
                  </label>
                  <input
                    id="firmName"
                    type="text"
                    required
                    value={firmName}
                    onChange={e => setFirmName(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-sm font-medium transition-colors"
                    placeholder="e.g. Apex Infratech Pvt. Ltd. or Bhat Constructions"
                  />
                </div>

                <div>
                  <label htmlFor="displayName" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Your Full Name <span className="text-blue-600">*</span>
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    required
                    autoComplete="name"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-sm transition-colors"
                    placeholder="e.g. Rajesh Kumar"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Work Email Address <span className="text-blue-600">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-sm transition-colors"
                    placeholder="you@contractorfirm.com"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
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
                        className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-10 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-sm transition-colors"
                        placeholder="Min. 8 chars"
                      />
                      <EyeToggle show={showPassword} onToggle={() => setShowPassword(v => !v)} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
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
                        className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-10 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-sm transition-colors"
                        placeholder="Re-enter password"
                      />
                      <EyeToggle show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
                    </div>
                  </div>
                </div>

                {/* Interactive Starter Project Checkbox */}
                <div className="pt-2">
                  <label className="relative flex items-start gap-3 p-3 rounded-xl border border-blue-100 bg-blue-50/60 hover:bg-blue-50 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seedStarter}
                      onChange={e => setSeedStarter(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-900 block">
                        Include sample Highway Project & RA bill template (Recommended)
                      </span>
                      <span className="text-slate-600 block mt-0.5">
                        Populates your workspace with a realistic PWD project, sample RA bill, supplier ledger & muster roll so your dashboard is instantly interactive.
                      </span>
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/20 transition-all"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Setting up your workspace…
                    </>
                  ) : (
                    <>
                      Launch Contractor Workspace
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  Already registered?{' '}
                  <Link href="/sign-in" className="font-semibold text-blue-600 hover:text-blue-700">
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
