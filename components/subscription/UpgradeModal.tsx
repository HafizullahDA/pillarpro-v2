'use client'

import Link from 'next/link'
import { PLAN_CONFIGS, PlanTier } from '@/lib/subscription'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  requiredPlan?: PlanTier
  currentPlan?: PlanTier
}

export function UpgradeModal({
  open,
  onClose,
  title = 'Subscription Required',
  description = 'Your workspace is currently in Read-Only mode. Please reactivate or upgrade your subscription to create new records, log hindrances, and access full contractor capabilities.',
  requiredPlan = 'growth',
  currentPlan = 'bootstrap',
}: UpgradeModalProps) {
  if (!open) return null

  const targetPlan = PLAN_CONFIGS[requiredPlan] || PLAN_CONFIGS.growth

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-5 h-5 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Read-Only Restriction
            </span>
            <h3 id="upgrade-modal-title" className="text-base font-bold text-slate-900 mt-0.5">
              {title}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 leading-relaxed mb-5">
          {description}
        </p>

        {/* Plan Recommendation Box */}
        <div className="p-4 rounded-xl bg-slate-900 text-white mb-6 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">Recommended Plan</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
              {targetPlan.name}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold font-mono text-white">
              ₹{targetPlan.monthlyPrice.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-400 font-semibold">/ month</span>
            <span className="text-[10px] text-slate-400 ml-auto">
              (or ₹{targetPlan.annualPrice.toLocaleString('en-IN')}/yr)
            </span>
          </div>

          <p className="text-[11px] text-slate-300">
            Up to <strong>{targetPlan.maxActiveSites} Active Sites</strong> &bull; <strong>Unlimited Users</strong> &bull; CPWD / PWD Compliance
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <Link
            href="/pricing"
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <span>View Plans & Reactivate</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Keep Read-Only
          </button>
        </div>

        {/* Security / Historical Note */}
        <p className="text-[10px] text-slate-400 text-center mt-4">
          All existing RA bills, muster rolls, and measurement books remain 100% permanently exportable for government audits.
        </p>
      </div>
    </div>
  )
}

