'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Default idle timeout: 30 minutes (in milliseconds)
const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000

interface IdleTimeoutProviderProps {
  children: React.ReactNode
  timeoutMs?: number
}

/**
 * IdleTimeoutProvider detects user inactivity across key events.
 * If no activity is registered within timeoutMs (default 30 mins),
 * it signs out the Supabase session to protect shared site/office computers.
 */
export function IdleTimeoutProvider({
  children,
  timeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
}: IdleTimeoutProviderProps) {
  const router = useRouter()
  const supabase = createClient()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const lastActiveRef = useRef<number>(Date.now())

  const handleTimeout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Error during idle timeout sign-out:', err)
    } finally {
      router.push('/sign-in?reason=session_expired')
    }
  }, [supabase, router])

  const resetTimer = useCallback(() => {
    lastActiveRef.current = Date.now()

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      handleTimeout()
    }, timeoutMs)
  }, [handleTimeout, timeoutMs])

  useEffect(() => {
    // Throttled event listener to avoid unnecessary timer resets on micro-movements
    let throttleTimeout: NodeJS.Timeout | null = null

    const onUserActivity = () => {
      if (throttleTimeout) return
      throttleTimeout = setTimeout(() => {
        throttleTimeout = null
      }, 1000) // At most once per second

      resetTimer()
    }

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ]

    events.forEach(eventName => {
      window.addEventListener(eventName, onUserActivity, { passive: true })
    })

    // Initialize timer on mount
    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (throttleTimeout) clearTimeout(throttleTimeout)
      events.forEach(eventName => {
        window.removeEventListener(eventName, onUserActivity)
      })
    }
  }, [resetTimer])

  return <>{children}</>
}

