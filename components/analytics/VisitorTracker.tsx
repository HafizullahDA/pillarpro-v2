'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const STORAGE_KEY_VID = 'pp_visitor_id'
const STORAGE_KEY_SID = 'pp_session_id'

function getOrCreateVisitorId(): string {
  try {
    let vid = localStorage.getItem(STORAGE_KEY_VID)
    if (!vid) {
      vid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'v_' + Math.random().toString(36).substring(2, 15)
      localStorage.setItem(STORAGE_KEY_VID, vid)
    }
    return vid
  } catch {
    return 'anon_' + Math.random().toString(36).substring(2, 10)
  }
}

function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem(STORAGE_KEY_SID)
    if (!sid) {
      sid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 's_' + Math.random().toString(36).substring(2, 15)
      sessionStorage.setItem(STORAGE_KEY_SID, sid)
    }
    return sid
  } catch {
    return 'ses_' + Math.random().toString(36).substring(2, 10)
  }
}

function getDeviceInfo() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { deviceType: 'desktop', browser: 'unknown', os: 'unknown' }
  }

  const ua = navigator.userAgent
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop'
  if (/iPad|Tablet/i.test(ua)) {
    deviceType = 'tablet'
  } else if (/Mobi|Android|iPhone/i.test(ua)) {
    deviceType = 'mobile'
  }

  let browser = 'Other'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome'
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'

  let os = 'Other'
  if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS'
  else if (/Mac OS X/i.test(ua)) os = 'macOS'
  else if (/Linux/i.test(ua)) os = 'Linux'

  return { deviceType, browser, os }
}

export function VisitorTracker() {
  const pathname = usePathname()
  const lastPathRef = useRef<string>(pathname)
  const uncommittedSecondsRef = useRef<number>(0)
  const hasInitializedRef = useRef<boolean>(false)

  const sendTelemetry = (payload: Record<string, unknown>, useBeacon = false) => {
    try {
      const dataStr = JSON.stringify(payload)
      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([dataStr], { type: 'application/json' })
        navigator.sendBeacon('/api/analytics/track', blob)
        return
      }

      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: dataStr,
        keepalive: true,
      }).catch(() => {})
    } catch {
      // Ignore background tracking errors
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const visitorId = getOrCreateVisitorId()
    const sessionId = getOrCreateSessionId()
    const { deviceType, browser, os } = getDeviceInfo()
    const referrer = document.referrer || null

    sendTelemetry({
      visitor_id: visitorId,
      session_id: sessionId,
      path: pathname,
      referrer: hasInitializedRef.current ? null : referrer,
      device_type: deviceType,
      browser,
      os,
      duration_increment: uncommittedSecondsRef.current,
      is_heartbeat: false,
    })

    uncommittedSecondsRef.current = 0
    lastPathRef.current = pathname
    hasInitializedRef.current = true
  }, [pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const visitorId = getOrCreateVisitorId()
    const sessionId = getOrCreateSessionId()
    const { deviceType, browser, os } = getDeviceInfo()

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        uncommittedSecondsRef.current += 1
      }
    }, 1000)

    const heartbeatTimer = setInterval(() => {
      if (uncommittedSecondsRef.current >= 15) {
        sendTelemetry({
          visitor_id: visitorId,
          session_id: sessionId,
          path: lastPathRef.current,
          device_type: deviceType,
          browser,
          os,
          duration_increment: uncommittedSecondsRef.current,
          is_heartbeat: true,
        })
        uncommittedSecondsRef.current = 0
      }
    }, 20000)

    const handleExit = () => {
      if (uncommittedSecondsRef.current > 0) {
        sendTelemetry(
          {
            visitor_id: visitorId,
            session_id: sessionId,
            path: lastPathRef.current,
            device_type: deviceType,
            browser,
            os,
            duration_increment: uncommittedSecondsRef.current,
            is_heartbeat: true,
          },
          true
        )
        uncommittedSecondsRef.current = 0
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleExit()
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handleExit)
    window.addEventListener('beforeunload', handleExit)

    return () => {
      clearInterval(timer)
      clearInterval(heartbeatTimer)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handleExit)
      window.removeEventListener('beforeunload', handleExit)
      handleExit()
    }
  }, [])

  return null
}
