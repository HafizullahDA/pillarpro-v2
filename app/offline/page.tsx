'use client'

import { useState } from 'react'
import { Logo } from '@/components/ui/Logo'
import { OfflineSnapshotViewer } from './OfflineSnapshotViewer'
import { flushOfflineQueue } from '@/lib/offline/syncEngine'

export default function OfflinePage() {
  const [reconnecting, setReconnecting] = useState(false)
  const [reconnectStatus, setReconnectStatus] = useState<string | null>(null)

  const handleReconnect = async () => {
    if (typeof window === 'undefined') return
    setReconnecting(true)
    setReconnectStatus(null)

    try {
      if (navigator.onLine) {
        // Attempt flush
        await flushOfflineQueue()
        window.location.href = '/dashboard'
        return
      }

      setReconnectStatus('Device is still offline (airplane mode or no signal). You can continue recording logs below.')
    } catch {
      setReconnectStatus('Could not establish network connection. Stored offline records remain safe.')
    } finally {
      setReconnecting(false)
      setTimeout(() => setReconnectStatus(null), 5000)
    }
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      <header className="max-w-2xl mx-auto w-full pt-4 pb-2 flex items-center justify-between border-b border-slate-800/80">
        <Logo theme="dark" size="sm" subtitle="Site Offline Hub" />
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          Offline Mode
        </span>
      </header>

      <main className="max-w-2xl mx-auto w-full py-6 space-y-5">
        {/* Header alert */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto shadow-xl">
            <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Site Mode Active (Offline)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Low or no cellular coverage detected. You can review cached company records and queue new site expenses, attendance, and fuel logs below.
          </p>
        </div>

        {reconnectStatus && (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold text-center">
            {reconnectStatus}
          </div>
        )}

        {/* Offline Snapshot Viewer & Field Toolkit */}
        <OfflineSnapshotViewer />

        {/* Reconnect and Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleReconnect}
            disabled={reconnecting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <svg className={`w-3.5 h-3.5 ${reconnecting ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{reconnecting ? 'Checking Connection...' : 'Check Internet & Reconnect'}</span>
          </button>
        </div>
      </main>

      <footer className="text-center text-[11px] text-slate-500 py-4 border-t border-slate-900">
        © 2026 PillarPro • Offline Storage & IndexedDB Synchronization Engine Active
      </footer>
    </div>
  )
}
