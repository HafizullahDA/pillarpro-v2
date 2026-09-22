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
    getClientOrganization()
      .then((org: OrganizationProfile) => {
        if (mounted) {
          setSub(getEffectiveSubscription(org))
        }
      })
      .catch(() => {
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
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-rose-950/40 to-slate-950 text-rose-100 border-b border-rose-500/30 px-4 py-2 text-xs shadow-xs">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-wider shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
              Workspace Read-Only
            </span>
            <span className="text-slate-300 text-xs truncate">
              Your 14-day trial has concluded. Past bills and ledgers are preserved, but adding new entries is paused.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-xs hover:scale-[1.02]"
            >
              <span>Reactivate Plan</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 2. Active Trialing (Executive Ambient Bar)
  if (sub.isTrialing) {
    const isUrgent = sub.trialDaysRemaining <= 3

    return (
      <div
        className={`relative overflow-hidden px-4 py-2 text-xs font-medium border-b shadow-xs transition-colors ${
          isUrgent
            ? 'bg-gradient-to-r from-slate-950 via-amber-950/40 to-slate-950 text-amber-100 border-amber-500/30'
            : 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-slate-100 border-slate-800/80'
        }`}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${
            isUrgent ? 'via-amber-400/50' : 'via-emerald-500/30'
          } to-transparent`}
        />
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                isUrgent
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isUrgent ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isUrgent ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
              </span>
              {isUrgent ? 'Trial Ending Soon' : '14-Day Free Trial'}
            </span>

            <div className="flex items-center gap-1.5 min-w-0 text-xs">
              <span className="text-slate-300">
                <strong className="text-white font-semibold">
                  {sub.trialDaysRemaining} {sub.trialDaysRemaining === 1 ? 'day' : 'days'} remaining
                </strong>{' '}
                on <span className="text-amber-300 font-semibold">{sub.planConfig.name}</span>.
              </span>
              <span className="hidden lg:inline text-slate-400">
                • All CPWD Form 26, Clause 5 Delay Defense & PillarVision™ features unlocked.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-xs transition-all transform hover:scale-[1.02]"
            >
              <span>Choose Plan</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>

            {!isUrgent && (
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
                aria-label="Dismiss banner"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Active paid subscription without issues: Zero visual clutter
  return null
}
