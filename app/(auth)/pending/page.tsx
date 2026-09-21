'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/Logo'

export default function PendingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading]       = useState(true)
  const [activating, setActivating] = useState(false)
  const [firmName, setFirmName]     = useState('')
  const [error, setError]           = useState('')
  const [userEmail, setUserEmail]   = useState('')

  useEffect(() => {
    let isMounted = true

    async function checkAndAutoActivate() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/sign-in')
          return
        }

        if (isMounted) setUserEmail(user.email || '')

        // Check if profile is already active
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('status, organization_id')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.status === 'active' && profile?.organization_id) {
          router.push('/dashboard')
          router.refresh()
          return
        }

        // Check user_metadata for firm_name or join_code
        const meta = user.user_metadata || {}

        if (meta.firm_name) {
          if (isMounted) setActivating(true)
          const { error: onboardErr } = await supabase.rpc('onboard_contractor', {
            p_firm_name: meta.firm_name,
            p_display_name: meta.display_name || user.email?.split('@')[0],
            p_seed_starter: meta.seed_starter !== false,
          })

          if (!onboardErr) {
            router.push('/dashboard')
            router.refresh()
            return
          } else {
            console.warn('Auto-onboard notice:', onboardErr.message)
          }
        } else if (meta.join_code) {
          if (isMounted) setActivating(true)
          const { error: joinErr } = await supabase.rpc('join_organization', {
            p_join_code: meta.join_code,
            p_display_name: meta.display_name || user.email?.split('@')[0],
            p_role: 'site_supervisor',
          })

          if (!joinErr) {
            router.push('/dashboard')
            router.refresh()
            return
          }
        }
      } catch (err: any) {
        console.warn('Pending check notice:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
          setActivating(false)
        }
      }
    }

    checkAndAutoActivate()

    return () => {
      isMounted = false
    }
  }, [router, supabase])

  const handleManualActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firmName.trim()) return

    setError('')
    setActivating(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/sign-in')
        return
      }

      const { error: rpcErr } = await supabase.rpc('onboard_contractor', {
        p_firm_name: firmName.trim(),
        p_display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
        p_seed_starter: true,
      })

      if (rpcErr) {
        // Direct fallback
        const { data: orgData, error: orgErr } = await supabase
          .from('organizations')
          .insert({
            name: firmName.trim(),
            legal_name: firmName.trim(),
            registration_no: 'Class-A Govt Contractor, PWD / PMGSY',
            email: user.email,
          })
          .select('id')
          .single()

        if (!orgErr && orgData) {
          await supabase.from('user_profiles').upsert({
            id: user.id,
            email: user.email,
            display_name: user.email?.split('@')[0],
            organization_id: orgData.id,
            status: 'active',
          }, { onConflict: 'id' })

          await supabase.from('roles').upsert({
            user_id: user.id,
            role: 'owner',
          }, { onConflict: 'user_id' })
        } else {
          throw new Error(rpcErr.message)
        }
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Failed to activate workspace. Please try again.')
      setActivating(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-md w-full text-center p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
        {/* Brand */}
        <div className="flex justify-center mb-6">
          <Logo theme="light" size="md" subtitle="Civil Contractor OS" href="/" />
        </div>

        {activating || loading ? (
          <div className="py-8 space-y-4">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
              <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Activating your contractor workspace…</h2>
            <p className="text-xs text-slate-500">Setting up your projects, ledger accounts, and audit permissions.</p>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div className="mx-auto mb-4 h-12 w-12 flex items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
              <svg
                className="h-6 w-6 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Complete Firm Setup</h1>

            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Signed in as <span className="font-semibold text-slate-900">{userEmail}</span>. Enter your contracting firm name to activate your workspace:
            </p>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleManualActivate} className="mt-5 space-y-3 text-left">
              <div>
                <label htmlFor="firmName" className="block text-xs font-semibold text-slate-700 mb-1">
                  Contracting Firm Name
                </label>
                <input
                  id="firmName"
                  type="text"
                  required
                  value={firmName}
                  onChange={e => setFirmName(e.target.value)}
                  placeholder="e.g. Apex Infratech Pvt. Ltd."
                  className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 shadow-2xs"
                />
              </div>

              <button
                type="submit"
                disabled={activating || !firmName.trim()}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {activating ? 'Activating…' : 'Launch Contractor Workspace →'}
              </button>
            </form>

            <div className="mt-7 pt-5 border-t border-slate-100">
              <button
                onClick={handleSignOut}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/10 transition-all cursor-pointer shadow-2xs"
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
