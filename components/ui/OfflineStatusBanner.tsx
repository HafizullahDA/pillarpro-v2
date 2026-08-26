'use client'

import { useState, useEffect } from 'react'
import { getOfflineQueue } from '@/lib/offline/db'
import { flushOfflineQueue } from '@/lib/offline/syncEngine'

export function OfflineStatusBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [queuedCount, setQueuedCount] = useState<number>(0)
  const [syncMessage, setSyncMessage] = useState<string>('')

  const checkQueue = async () => {
    try {
      const q = await getOfflineQueue()
      setQueuedCount(q.length)
    } catch {
      // IndexedDB fallback
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)
    checkQueue()

    const handleOnline = async () => {
      setIsOnline(true)
      const res = await flushOfflineQueue()
      if (res.synced > 0) {
        setSyncMessage(`✓ Reconnected: Synced ${res.synced} offline entries to cloud`)
        setTimeout(() => setSyncMessage(''), 5000)
      }
      checkQueue()
    }

    const handleOffline = () => {
      setIsOnline(false)
      checkQueue()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const interval = setInterval(checkQueue, 4000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

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
        <span>Working Offline — {queuedCount > 0 ? `${queuedCount} entries queued locally` : 'Entries will save locally & sync on reconnect'}</span>
      </div>
    )
  }

  return null
}
