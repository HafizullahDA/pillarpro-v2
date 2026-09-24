'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { clearOfflineData, getOfflineQueue } from '@/lib/offline/db'
import { flushOfflineQueue } from '@/lib/offline/syncEngine'
import { createClient } from '@/lib/supabase/client'

export function OfflineStatusBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [queuedCount, setQueuedCount] = useState<number>(0)
  const [syncMessage, setSyncMessage] = useState<string>('')
  const [syncing, setSyncing] = useState(false)
  const syncInProgressRef = useRef(false)

  const checkQueue = useCallback(async () => {
    try {
      const q = await getOfflineQueue()
      setQueuedCount(q.length)
    } catch {
      // IndexedDB fallback
    }
  }, [])

  const syncQueue = useCallback(async (showResult = false) => {
    if (typeof window === 'undefined' || !navigator.onLine || syncInProgressRef.current) return

    syncInProgressRef.current = true
    setSyncing(true)
    try {
      const res = await flushOfflineQueue()
      if (res.synced > 0) {
        setSyncMessage(`Reconnected: Synced ${res.synced} offline entr${res.synced === 1 ? 'y' : 'ies'} to cloud`)
        setTimeout(() => setSyncMessage(''), 5000)
      } else if (showResult && res.errors > 0) {
        setSyncMessage('Some offline entries could not sync. They will be retried automatically.')
      } else if (showResult) {
        setSyncMessage('Everything is already synced.')
        setTimeout(() => setSyncMessage(''), 3000)
      }
    } finally {
      syncInProgressRef.current = false
      setSyncing(false)
      checkQueue()
    }
  }, [checkQueue])

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)
    checkQueue()
    if (navigator.onLine) void syncQueue()

    const handleOnline = async () => {
      setIsOnline(true)
      await syncQueue()
    }

    const handleOffline = () => {
      setIsOnline(false)
      checkQueue()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cached business data must never be available to the next account that
    // signs into this browser profile.
    const { data: { subscription } } = createClient().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        void clearOfflineData()
        setQueuedCount(0)
      }
    })

    // Retry queued mutations while the app is open. This also recovers from a
    // reconnect that did not emit a browser `online` event.
    const interval = setInterval(() => {
      checkQueue()
      if (navigator.onLine) void syncQueue()
    }, 30_000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [checkQueue, syncQueue])

  if (syncMessage) {
    return (
      <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 text-center shadow-md flex items-center justify-center gap-2">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {syncMessage}
      </div>
    )
  }

  if (!isOnline) {
    return (
      <div className="bg-amber-500 text-white text-xs font-semibold px-4 py-2 text-center shadow-md flex items-center justify-center gap-2">
        <svg className="h-4 w-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>Working Offline — {queuedCount > 0 ? `${queuedCount} entries queued locally` : 'Attendance and expenses save locally & sync on reconnect'}</span>
      </div>
    )
  }

  if (queuedCount > 0) {
    return (
      <div className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 text-center shadow-md flex items-center justify-center gap-3">
        <span>{syncing ? 'Syncing offline entries…' : `${queuedCount} offline entr${queuedCount === 1 ? 'y is' : 'ies are'} waiting to sync`}</span>
        <button
          type="button"
          onClick={() => void syncQueue(true)}
          disabled={syncing}
          className="rounded bg-white/15 px-2 py-1 hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>
    )
  }

  return null
}
