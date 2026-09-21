'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getClientOrganization, OrganizationProfile } from '@/lib/organization'
import { getEffectiveSubscription, EffectiveSubscription } from '@/lib/subscription'

export function SubscriptionStatusBanner() {
  const [sub, setSub] = useState<EffectiveSubscription | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let mounted = true
    getClientOrganization().then((org: OrganizationProfile) => {
      if (mounted) {
        setSub(getEffectiveSubscription(org))
      }
    }).catch(() => {
      // Graceful silence if organization loading fails
    })
    return () => {
      mounted = false
    }
  }, [])

  if (!sub || dismissed) return null

  // 1. Expired / Lapsed Subscription (Highest Priority Warning)
  if (sub.isExpired) {
    return (
      <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold shadow-xs flex flex-wrap items-center justify-between gap-2 border-b border-amber-600/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm">⚠️</span>
          <span className="truncate">
            <strong>Workspace in Read-Only Mode:</strong> Your subscription has ended. Past bills and reports remain safe, but new creations are paused.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/pricing"
            className="px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
          >
            Reactivate Plan &rarr;
          </Link>
        </div>
      </div>
    )
  }

  // 2. Active Trialing (Friendly Countdown)
  if (sub.isTrialing) {
    const isUrgent = sub.trialDaysRemaining <= 3

    return (
      <div
        className={`px-4 py-1.5 text-xs font-medium flex flex-wrap items-center justify-between gap-2 border-b ${
          isUrgent
            ? 'bg-amber-50 text-amber-900 border-amber-200'
            : 'bg-slate-900 text-slate-100 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="truncate text-[11px] sm:text-xs">
            <strong>14-Day Free Trial:</strong> {sub.trialDaysRemaining}{' '}
            {sub.trialDaysRemaining === 1 ? 'day' : 'days'} remaining on {sub.planConfig.name}.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/pricing"
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-colors ${
              isUrgent
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Choose Plan
          </Link>
          {!isUrgent && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-slate-400 hover:text-white text-xs p-0.5"
              aria-label="Dismiss banner"
            >
              &times;
            </button>
          )}
        </div>
      </div>
    )
  }

  // Active paid subscription without issues: Zero visual clutter
  return null
}

