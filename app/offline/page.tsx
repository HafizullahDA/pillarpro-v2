'use client'

import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { OfflineSnapshotViewer } from './OfflineSnapshotViewer'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      <header className="max-w-md mx-auto w-full pt-6 flex items-center justify-between">
        <Logo theme="dark" size="sm" subtitle="Site Mode" />
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          Offline
        </span>
      </header>

      <main className="max-w-md mx-auto w-full py-12 text-center space-y-5">
        <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 text-3xl flex items-center justify-center mx-auto shadow-xl">
          📡
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            No Internet Connection
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
            You appear to be offline or on a low-signal construction job site. PillarPro will automatically reconnect once your network is restored.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 text-left space-y-2">
          <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <span>💡</span> Site Connectivity Tip:
          </p>
          <p className="text-[11px] text-slate-400 leading-normal">
            Physical receipt captures and muster rolls can be reviewed once connection resumes. Check if mobile data or site Wi-Fi is enabled.
          </p>
        </div>

        <OfflineSnapshotViewer />

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') window.location.reload()
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Try Reconnecting</span>
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </main>

      <footer className="text-center text-[11px] text-slate-600 pb-4">
        © 2026 PillarPro • Offline Service Worker Active
      </footer>
    </div>
  )
}
