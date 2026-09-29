'use client'

import React from 'react'
import Link from 'next/link'
import { formatINR } from '@/lib/format'
import {
  ContractEventSummary,
  HindranceSummary,
  CorrespondenceSummary,
  EOTCaseSummary,
  VariationSummary,
  ClaimSummary,
} from './types'

interface ContractDefenseProps {
  events: ContractEventSummary[]
  hindrances: HindranceSummary[]
  correspondence: CorrespondenceSummary[]
  eotCases: EOTCaseSummary[]
  variations: VariationSummary[]
  claims: ClaimSummary[]
}

export function ContractDefenseSection({
  events,
  hindrances,
  correspondence,
  eotCases,
  variations,
  claims,
}: ContractDefenseProps) {
  const todayStr = new Date().toISOString().split('T')[0]
  const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  // Open events
  const openEvents = events.filter(e => ['OPEN', 'UNDER_REVIEW', 'DISPUTED'].includes(e.status))
  const openEventsFinancialImpact = openEvents.reduce((sum, e) => sum + (Number(e.financial_impact) || 0), 0)

  // Open hindrances
  const openHindrances = hindrances.filter(h =>
    h.status === 'active' || h.status === 'disputed' || !h.end_date
  )

  // Notice Deadlines (response required, not yet responded, not closed)
  const pendingNotices = correspondence.filter(
    c => c.response_required && !c.responded_date && c.status !== 'CLOSED' && c.response_deadline
  )

  const overdueNotices = pendingNotices.filter(c => (c.response_deadline ?? '') < todayStr)
  const upcomingNotices = pendingNotices.filter(
    c => (c.response_deadline ?? '') >= todayStr && (c.response_deadline ?? '') <= sevenDaysLater
  )

  // EOT Pending vs Approved
  const pendingEOT = eotCases.filter(e =>
    ['DRAFT', 'PREPARING', 'SUBMITTED', 'UNDER_REVIEW'].includes(e.status)
  )
  const pendingEOTDays = pendingEOT.reduce((sum, e) => sum + (Number(e.claimed_days) || Number(e.pending_days) || 0), 0)

  const approvedEOT = eotCases.filter(e =>
    ['APPROVED', 'PARTIALLY_APPROVED'].includes(e.status)
  )
  const approvedEOTDays = approvedEOT.reduce((sum, e) => sum + (Number(e.approved_days) || 0), 0)

  // Claims Pending
  const pendingClaims = claims.filter(c =>
    ['DRAFT', 'PREPARING', 'SUBMITTED', 'UNDER_REVIEW'].includes(c.status)
  )
  const pendingClaimsAmount = pendingClaims.reduce((sum, c) => sum + (Number(c.claimed_amount) || 0), 0)

  // Variation Approvals Pending
  const pendingVariations = variations.filter(v =>
    ['PROPOSED', 'UNDER_APPROVAL'].includes(v.status)
  )
  const pendingVariationsAmount = pendingVariations.reduce((sum, v) => sum + (Number(v.proposed_amount) || 0), 0)

  return (
    <div id="contract-defense" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 rounded-full bg-amber-500 inline-block" />
            <h2 className="text-base font-bold text-slate-900">3. Contract Defense &amp; Claims Matrix</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              Contemporaneous Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 pl-3.5">
            Protection against Liquidated Damages (LD), statutory notices, EOT claims, and variation orders
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {overdueNotices.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-semibold border border-red-200 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              {overdueNotices.length} Overdue Notice{overdueNotices.length > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Notice Shield Intact
            </span>
          )}
        </div>
      </div>

      {/* 8 Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Open Events */}
        <Link
          href="/contract-events"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-amber-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Open Events
          </span>
          <p className="text-xl font-black text-slate-900 mt-1 tabular-nums group-hover:text-amber-600 transition-colors">
            {openEvents.length}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            {formatINR(openEventsFinancialImpact)} impact
          </span>
        </Link>

        {/* Open Hindrances */}
        <Link
          href="/hindrances"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-amber-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Open Hindrances
          </span>
          <p className="text-xl font-black text-amber-700 mt-1 tabular-nums group-hover:text-amber-600 transition-colors">
            {openHindrances.length}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            Site impediments
          </span>
        </Link>

        {/* Upcoming Notices (≤ 7 days) */}
        <Link
          href="/correspondence"
          className="group block p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-white hover:border-blue-500 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 block truncate">
            Upcoming Notices
          </span>
          <p className="text-xl font-black text-blue-900 mt-1 tabular-nums group-hover:text-blue-600 transition-colors">
            {upcomingNotices.length}
          </p>
          <span className="text-[10px] text-blue-600/80 mt-0.5 block truncate">
            Due in ≤ 7 days
          </span>
        </Link>

        {/* Overdue Notices */}
        <Link
          href="/correspondence"
          className={`group block p-3.5 rounded-xl border transition-all ${overdueNotices.length > 0 ? 'border-red-300 bg-red-50/60 hover:bg-white hover:border-red-500' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}
        >
          <span className={`text-[10px] uppercase font-bold tracking-wider block truncate ${overdueNotices.length > 0 ? 'text-red-700' : 'text-slate-500'}`}>
            Overdue Notices
          </span>
          <p className={`text-xl font-black mt-1 tabular-nums truncate ${overdueNotices.length > 0 ? 'text-red-700' : 'text-slate-900'}`}>
            {overdueNotices.length}
          </p>
          <span className={`text-[10px] mt-0.5 block truncate ${overdueNotices.length > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
            {overdueNotices.length > 0 ? 'Critical response!' : 'None overdue'}
          </span>
        </Link>

        {/* EOT Pending */}
        <Link
          href="/eot"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-amber-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            EOT Pending
          </span>
          <p className="text-xl font-black text-slate-900 mt-1 tabular-nums group-hover:text-amber-600 transition-colors">
            {pendingEOTDays} <span className="text-xs font-normal text-slate-500">days</span>
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            {pendingEOT.length} case{pendingEOT.length !== 1 ? 's' : ''} under review
          </span>
        </Link>

        {/* EOT Approved */}
        <Link
          href="/eot"
          className="group block p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-white hover:border-emerald-500 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block truncate">
            EOT Approved
          </span>
          <p className="text-xl font-black text-emerald-800 mt-1 tabular-nums group-hover:text-emerald-600 transition-colors">
            {approvedEOTDays} <span className="text-xs font-normal text-emerald-700">days</span>
          </p>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block truncate">
            {approvedEOT.length} sanction{approvedEOT.length !== 1 ? 's' : ''} granted
          </span>
        </Link>

        {/* Claims Pending */}
        <Link
          href="/claims"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-purple-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Claims Pending
          </span>
          <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums group-hover:text-purple-600 transition-colors truncate">
            {formatINR(pendingClaimsAmount)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            {pendingClaims.length} claim{pendingClaims.length !== 1 ? 's' : ''} under review
          </span>
        </Link>

        {/* Variations Pending */}
        <Link
          href="/variations"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            VO Pending
          </span>
          <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums group-hover:text-blue-600 transition-colors truncate">
            {formatINR(pendingVariationsAmount)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            {pendingVariations.length} proposed item{pendingVariations.length !== 1 ? 's' : ''}
          </span>
        </Link>
      </div>
    </div>
  )
}
