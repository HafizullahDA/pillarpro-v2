'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import { Logo } from '@/components/ui/Logo'

export default function PendingPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#07090E] flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-md w-full text-center p-8 rounded-2xl bg-gradient-to-b from-[#0F1626] to-[#0A0E1A] border border-slate-800 shadow-2xl shadow-blue-950/40">
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-md w-full text-center p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
        {/* Brand */}
        <div className="flex justify-center mb-6">
          <Logo theme="dark" size="md" subtitle="Civil Contractor OS" />
          <Logo theme="light" size="md" subtitle="Civil Contractor OS" href="/" />
        </div>

        {/* Icon */}
        <div className="mx-auto mb-6 h-14 w-14 flex items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
        <div className="mx-auto mb-5 h-12 w-12 flex items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
          <svg
            className="h-7 w-7 text-amber-400"
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

        <h1 className="text-2xl font-bold text-white tracking-tight">Account Pending Approval</h1>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Account Pending Approval</h1>

        <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
          Your account has been created. The Owner will review and activate it
        <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
          Your account has been created. The Firm Owner will review and activate it
          shortly — no action needed on your end.
        </p>

        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          Once approved, you will be able to access PillarPro based on your
          assigned role and projects.
          assigned role and project sites.
        </p>

        <div className="mt-7 pt-5 border-t border-slate-800/80">
        <div className="mt-7 pt-5 border-t border-slate-100">
          <button
            onClick={handleSignOut}
            className="w-full py-2.5 px-4 rounded-lg border border-slate-800 text-sm font-semibold text-slate-300 bg-slate-900/80 hover:bg-slate-800 hover:text-white active:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer shadow-inner"
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/10 transition-all cursor-pointer shadow-2xs"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
