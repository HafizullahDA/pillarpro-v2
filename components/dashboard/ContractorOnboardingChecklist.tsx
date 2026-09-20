'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ContractorOnboardingChecklistProps {
  projectCount: number
  supplierCount: number
  raBillCount: number
  hasExpenseOrLedger: boolean
  orgName?: string | null
}

interface StepItem {
  id: string
  title: string
  description: string
  href: string
  actionLabel: string
  isCompleted: boolean
  icon: string
  badgeText: string
}

const STORAGE_KEY_DISMISSED = 'pillarpro_onboarding_dismissed'
const STORAGE_KEY_COLLAPSED = 'pillarpro_onboarding_collapsed'

export function ContractorOnboardingChecklist({
  projectCount,
  supplierCount,
  raBillCount,
  hasExpenseOrLedger,
  orgName,
}: ContractorOnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState<boolean>(false)
  const [collapsed, setCollapsed] = useState<boolean>(false)
  const [mounted, setMounted] = useState<boolean>(false)

  const steps: StepItem[] = [
    {
      id: 'project',
      title: 'Create Your First Civil Project Site',
      description: 'Setup your tender site, department/agency (PWD, CPWD, NHAI), and sanctioned contract value.',
      href: '/projects',
      actionLabel: projectCount > 0 ? 'Manage Sites' : '+ Create Project',
      isCompleted: projectCount > 0,
      icon: '🏗️',
      badgeText: projectCount > 0 ? `${projectCount} Active Site${projectCount > 1 ? 's' : ''}` : 'Step 1',
    },
    {
      id: 'supplier',
      title: 'Add a Material Supplier or Khata Account',
      description: 'Track cement, steel, quarry aggregates, and track pending credit dues & GSTINs.',
      href: '/suppliers',
      actionLabel: supplierCount > 0 ? 'View Khatas' : '+ Add Supplier',
      isCompleted: supplierCount > 0,
      icon: '🚚',
      badgeText: supplierCount > 0 ? `${supplierCount} Supplier${supplierCount > 1 ? 's' : ''}` : 'Step 2',
    },
    {
      id: 'ra_bill',
      title: 'Draft or Record a Government RA Bill',
      description: 'Generate CPWD/PWD Form 26 cumulative bills with auto-reconciled retention, TDS & labour cess.',
      title: 'Draft or Record an RA Bill',
      description: 'Generate CPWD/PWD Form 26 bills with statutory deductions (Sec 194C TDS, GST TDS, Cess, Retention) & settlement tracking.',
      href: '/ra-bills',
      actionLabel: raBillCount > 0 ? 'View RA Bills' : '+ Record RA Bill',
      isCompleted: raBillCount > 0,
      icon: '📄',
      badgeText: raBillCount > 0 ? `${raBillCount} Bill${raBillCount > 1 ? 's' : ''}` : 'Step 3',
    },
    {
      id: 'expense',
      title: 'Log a Site Expense or Daily Labor Roll',
      description: 'Scan physical fuel slips with AI OCR or muster daily-wage labor for instant project costing.',
      href: hasExpenseOrLedger ? '/expenses' : '/expenses',
      actionLabel: hasExpenseOrLedger ? 'View Cash Book' : '+ Log Expense / Wage',
      isCompleted: hasExpenseOrLedger,
      icon: '📸',
      badgeText: hasExpenseOrLedger ? 'Active Costing' : 'Step 4',
    },
  ]

  const completedCount = steps.filter(s => s.isCompleted).length
  const totalSteps = steps.length
  const progressPercent = Math.round((completedCount / totalSteps) * 100)
  const allCompleted = completedCount === totalSteps

  useEffect(() => {
    setMounted(true)
    try {
      const isDismissed = localStorage.getItem(STORAGE_KEY_DISMISSED) === 'true'
      const isCollapsed = localStorage.getItem(STORAGE_KEY_COLLAPSED) === 'true'
      setDismissed(isDismissed)
      // If all steps are complete, default to collapsed unless explicitly toggled
      setCollapsed(isCollapsed || allCompleted)
    } catch {
      // Ignore localStorage errors (e.g. private mode)
    }
  }, [allCompleted])

  const handleToggleCollapse = () => {
    const nextState = !collapsed
    setCollapsed(nextState)
    try {
      localStorage.setItem(STORAGE_KEY_COLLAPSED, String(nextState))
    } catch {
      // Ignore
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY_DISMISSED, 'true')
    } catch {
      // Ignore
    }
  }

  // Prevent flash before hydration
  if (!mounted || dismissed) {
    return null
  }

  return (
    <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/40 p-4 sm:p-5 shadow-xs transition-all">
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs transition-all">
      {/* ── HEADER & PROGRESS SUMMARY ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">
            {allCompleted ? '🎉' : '🚀'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {allCompleted
                  ? 'Workspace Setup Complete!'
                  : `Get Started with ${orgName || 'Your'} Contractor Workspace`}
              </h2>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  allCompleted
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {completedCount} of {totalSteps} Completed ({progressPercent}%)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {allCompleted
                ? 'All core contracting modules (Projects, Suppliers, RA Bills, Costing) are live and tracking.'
                : 'Follow this quick onboarding checklist to configure your civil projects, supplier khatas, and billing.'}
            </p>
          </div>
        </div>

        {/* Action Controls (Collapse / Dismiss) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-2xs transition-colors"
            title={collapsed ? 'Expand checklist' : 'Collapse checklist'}
          >
            {collapsed ? 'Expand Checklist ▾' : 'Minimize ▴'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            title="Dismiss checklist banner"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── PROGRESS BAR ── */}
      <div className="mt-3.5 pt-1">
        <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allCompleted
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                : 'bg-blue-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── INTERACTIVE STEPS GRID (Visible when not collapsed) ── */}
      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3.5 border-t border-blue-100/80">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3.5 border-t border-slate-100">
          {steps.map((step) => {
            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                  step.isCompleted
                    ? 'bg-slate-50/80 border-slate-200 shadow-2xs'
                    : 'bg-white border-blue-200/80 shadow-xs ring-1 ring-blue-500/10 hover:border-blue-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xl">{step.icon}</span>
                    {step.isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
                        <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Done
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-200">
                        {step.badgeText}
                      </span>
                    )}
                  </div>

                  <h3 className={`text-xs font-bold mt-2.5 leading-snug ${step.isCompleted ? 'text-slate-800 line-through decoration-slate-300' : 'text-slate-900'}`}>
                    {step.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                    {step.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={step.href}
                    className={`text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                      step.isCompleted
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-blue-600 hover:text-blue-800 font-bold'
                    }`}
                  >
                    <span>{step.actionLabel}</span>
                    <span className="text-[10px]">→</span>
                  </Link>
                  {step.isCompleted && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      {step.badgeText}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

