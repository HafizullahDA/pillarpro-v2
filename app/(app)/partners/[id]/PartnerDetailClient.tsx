'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatINR, formatDate } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { PartnersActions } from '../PartnersActions'

interface ProjectShare {
  project_id: string
  projectName: string
  share_percentage: number
}

interface TransactionItem {
  id: string
  partner_id: string
  project_id: string | null
  projectName: string | null
  transaction_type: string
  purpose: string
  amount: number
  date: string
  mode: string
  reference: string | null
  notes: string | null
}

interface PartnerDetailProps {
  partner: {
    id: string
    name: string
    opening_balance: number
    notes: string | null
    created_at: string
  }
  projects: { id: string; name: string }[]
  shares: ProjectShare[]
  transactions: TransactionItem[]
  organizationName: string
}

export function PartnerDetailClient({
  partner,
  projects,
  shares,
  transactions,
  organizationName,
}: PartnerDetailProps) {
  const [projectFilter, setProjectFilter] = useState<string>('all')

  // Calculate totals
  let totalCapital = 0
  let totalOutOfPocket = 0
  let totalDraws = 0

  transactions.forEach(t => {
    if (t.transaction_type === 'paid_by_partner') {
      if (t.purpose === 'capital_contribution') {
        totalCapital += t.amount
      } else {
        totalOutOfPocket += t.amount
      }
    } else if (t.transaction_type === 'received_by_partner') {
      totalDraws += t.amount
    }
  })

  const openingBalance = Number(partner.opening_balance) || 0
  const closingBalance = openingBalance + totalCapital + totalOutOfPocket - totalDraws

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    if (projectFilter !== 'all' && t.project_id !== projectFilter) return false
    return true
  })

  // Compute running balance chronologically
  let running = openingBalance
  const ledgerRows = filteredTransactions.map(t => {
    const isInflow = t.transaction_type === 'paid_by_partner'
    if (isInflow) {
      running += t.amount
    } else {
      running -= t.amount
    }
    return {
      ...t,
      runningBalance: running,
    }
  })

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 print:p-0 print:max-w-none">
      {/* Top Navigation / Breadcrumbs (Hidden in Print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/partners"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Partners Overview
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <svg
              className="h-4 w-4 mr-1.5 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print / PDF Statement
          </Button>
          <PartnersActions
            projects={projects}
            partners={[{ id: partner.id, name: partner.name }]}
            defaultPartnerId={partner.id}
          />
        </div>
      </div>

      {/* Printable Statement Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs print:border-none print:shadow-none print:p-0">
        <div className="border-b border-slate-200 pb-5 mb-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 print:hidden">
                Partner Ledger
              </span>
              <p className="text-xs text-slate-500">{organizationName}</p>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{partner.name}</h1>
            {partner.notes && (
              <p className="text-xs text-slate-600 mt-1 max-w-md">{partner.notes}</p>
            )}
          </div>

          <div className="text-left md:text-right">
            <p className="text-xs text-slate-400">Statement Generated</p>
            <p className="text-xs font-semibold text-slate-700">{formatDate(new Date().toISOString())}</p>
            <div className="mt-2 inline-block">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  closingBalance >= 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {closingBalance >= 0 ? 'Firm owes partner' : 'Overdrawn from firm'}
              </span>
            </div>
          </div>
        </div>

        {/* Financial KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 print:bg-white print:border-slate-300">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Opening Capital
            </span>
            <span className="text-base font-bold text-slate-900 tabular-nums mt-1 block">
              {formatINR(openingBalance)}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 print:bg-white print:border-slate-300">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Direct Capital In
            </span>
            <span className="text-base font-bold text-emerald-700 tabular-nums mt-1 block">
              +{formatINR(totalCapital)}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 print:bg-white print:border-slate-300">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Site Out-of-Pocket
            </span>
            <span className="text-base font-bold text-blue-700 tabular-nums mt-1 block">
              +{formatINR(totalOutOfPocket)}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 print:bg-white print:border-slate-300">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Personal Draws
            </span>
            <span className="text-base font-bold text-rose-700 tabular-nums mt-1 block">
              −{formatINR(totalDraws)}
            </span>
          </div>
        </div>

        {/* Net Capital Card */}
        <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between print:bg-slate-100 print:text-slate-900 print:border print:border-slate-300">
          <div>
            <p className="text-xs font-semibold text-slate-400 print:text-slate-600 uppercase tracking-wider">
              Net Current Capital Balance
            </p>
            <p className="text-xs text-slate-300 print:text-slate-500 mt-0.5">
              Net settlement obligation between firm & partner
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold tabular-nums text-emerald-400 print:text-emerald-700">
              {formatINR(closingBalance)}
            </span>
          </div>
        </div>

        {/* Project Equity Splits for this Partner */}
        {shares.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Contract Equity & Profit Splits
            </p>
            <div className="flex flex-wrap gap-2">
              {shares.map(sh => (
                <div
                  key={sh.project_id}
                  className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs flex items-center gap-2"
                >
                  <span className="font-semibold text-slate-800">{sh.projectName}:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                    {sh.share_percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs print:border-none print:shadow-none">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 print:bg-transparent print:px-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Chronological Capital Ledger</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Full statement of debits, credits, and running balance
            </p>
          </div>

          <div className="print:hidden">
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">All Projects & Firm Level</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider bg-slate-50/50">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Details / Purpose</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Project</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Mode / Ref</th>
                <th className="text-right px-4 py-3 text-emerald-700">Credit (+)</th>
                <th className="text-right px-4 py-3 text-rose-700">Debit (−)</th>
                <th className="text-right px-4 py-3">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Opening Balance Row */}
              <tr className="bg-slate-50/30 font-medium">
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                  {formatDate(partner.created_at)}
                </td>
                <td className="px-4 py-3 text-slate-700" colSpan={3}>
                  Opening Capital Balance Brought Forward
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600 font-semibold">
                  {openingBalance > 0 ? formatINR(openingBalance) : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                  {openingBalance < 0 ? formatINR(Math.abs(openingBalance)) : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900">
                  {formatINR(openingBalance)}
                </td>
              </tr>

              {ledgerRows.map(row => {
                const isInflow = row.transaction_type === 'paid_by_partner'
                const isCapital = row.purpose === 'capital_contribution'

                return (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isInflow
                              ? isCapital
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isInflow
                            ? isCapital
                              ? 'Capital In'
                              : 'Site Exp'
                            : 'Draw'}
                        </span>
                        <span className="text-slate-800 font-medium truncate max-w-xs">
                          {row.notes || (isCapital ? 'Capital contribution' : 'Personal draw')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      {row.projectName || 'Firm-Level'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell font-mono text-[11px]">
                      {row.reference || row.mode}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-700">
                      {isInflow ? `+${formatINR(row.amount)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-rose-700">
                      {!isInflow ? `−${formatINR(row.amount)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900">
                      {formatINR(row.runningBalance)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CA Audit Signature Section (Visible in Print, unobtrusive on screen) */}
      <div className="hidden print:grid grid-cols-2 gap-12 pt-16 mt-8 border-t border-slate-300">
        <div className="text-center border-t border-slate-400 pt-2">
          <p className="text-xs font-bold text-slate-800">{partner.name}</p>
          <p className="text-[10px] text-slate-500">Partner Signature & Seal</p>
        </div>
        <div className="text-center border-t border-slate-400 pt-2">
          <p className="text-xs font-bold text-slate-800">For {organizationName}</p>
          <p className="text-[10px] text-slate-500">Managing Partner / Chartered Accountant</p>
        </div>
      </div>
    </div>
  )
}
