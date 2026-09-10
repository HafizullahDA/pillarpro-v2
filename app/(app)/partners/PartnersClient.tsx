'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatINR, formatDate } from '@/lib/format'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartnersActions } from './PartnersActions'

export interface PartnerProjectShare {
  project_id: string
  projectName: string
  share_percentage: number
}

export interface PartnerWithFinancials {
  id: string
  name: string
  opening_balance: number
  notes: string | null
  totalCapitalInfused: number
  totalOutOfPocket: number
  totalInjected: number
  totalDraws: number
  balance: number
  lastDate: string | null
  projectShares: PartnerProjectShare[]
}

export interface PartnerTransactionItem {
  id: string
  partner_id: string
  partnerName: string
  project_id: string | null
  projectName: string | null
  transaction_type: 'paid_by_partner' | 'received_by_partner'
  purpose: 'capital_contribution' | 'profit_draw' | 'reimbursement' | 'other'
  amount: number
  date: string
  mode: string
  reference: string | null
  notes: string | null
}

export interface ProjectSummary {
  id: string
  name: string
  awarded_amount: number
}

export interface RawProjectShare {
  id: string
  project_id: string
  partner_id: string
  share_percentage: number
}

export interface PartnersClientProps {
  partners: PartnerWithFinancials[]
  transactions: PartnerTransactionItem[]
  projects: ProjectSummary[]
  rawShares: RawProjectShare[]
}

export function PartnersClient({
  partners,
  transactions,
  projects,
  rawShares,
}: PartnersClientProps) {
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState<string>('all')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all')

  // Aggregate totals
  const totalCapitalContributed = partners.reduce((sum, p) => sum + p.totalCapitalInfused, 0)
  const totalOutOfPocket = partners.reduce((sum, p) => sum + p.totalOutOfPocket, 0)
  const totalDraws = partners.reduce((sum, p) => sum + p.totalDraws, 0)
  const netFirmObligation = partners.reduce((sum, p) => sum + p.balance, 0)

  // Filtered transactions
  const filteredTransactions = transactions.filter(tx => {
    if (selectedPartnerFilter !== 'all' && tx.partner_id !== selectedPartnerFilter) return false
    if (selectedTypeFilter !== 'all') {
      if (selectedTypeFilter === 'capital' && !(tx.transaction_type === 'paid_by_partner' && tx.purpose === 'capital_contribution')) return false
      if (selectedTypeFilter === 'out_of_pocket' && !(tx.transaction_type === 'paid_by_partner' && tx.purpose !== 'capital_contribution')) return false
      if (selectedTypeFilter === 'draw' && !(tx.transaction_type === 'received_by_partner' && tx.purpose === 'profit_draw')) return false
      if (selectedTypeFilter === 'reimbursement' && !(tx.transaction_type === 'received_by_partner' && tx.purpose === 'reimbursement')) return false
    }
    return true
  })

  // Two-partner parity comparison (if 2 partners exist, e.g. Hafizullah & Habibullah)
  const hasTwoPartners = partners.length === 2
  const partner1 = partners[0]
  const partner2 = partners[1]

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Partners & Capital Ledger</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Track capital infusions, out-of-pocket site expenses, drawings, and project profit equity.
          </p>
        </div>
        <PartnersActions
          projects={projects}
          partners={partners.map(p => ({ id: p.id, name: p.name }))}
          projectShares={rawShares}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Capital Contributed</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
            {formatINR(totalCapitalContributed)}
          </p>
          <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
            <span>↑</span> Direct partner equity injections
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Out-of-Pocket Expenses</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
            {formatINR(totalOutOfPocket)}
          </p>
          <p className="text-[11px] text-blue-600 mt-1 flex items-center gap-1 font-medium">
            <span>★</span> Paid from personal UPI / Cash
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Draws Taken</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
            {formatINR(totalDraws)}
          </p>
          <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
            <span>↓</span> Profit withdrawals cleared
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Due to Partners</p>
          <p className={`text-xl md:text-2xl font-bold mt-1.5 tabular-nums ${netFirmObligation >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatINR(netFirmObligation)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {netFirmObligation >= 0 ? 'Firm owes partners combined' : 'Partners drawn in excess'}
          </p>
        </div>
      </div>

      {/* Inter-Partner Parity Card ("Are we even?") */}
      {hasTwoPartners && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 md:p-6 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs uppercase tracking-widest font-bold text-indigo-300">
                  Inter-Partner Parity Scorecard
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white mt-1">
                {partner1.name} vs. {partner2.name}
              </h2>
            </div>
            <div className="bg-white/10 px-3.5 py-1.5 rounded-lg border border-white/15 text-xs text-indigo-100 flex items-center gap-2">
              <span>Net Gap:</span>
              <strong className="font-bold text-white text-sm tabular-nums">
                {formatINR(Math.abs(partner1.balance - partner2.balance))}
              </strong>
              <span className="text-slate-300">
                ({partner1.balance >= partner2.balance ? `${partner1.name} leading` : `${partner2.name} leading`})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            {/* Partner 1 Box */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base">{partner1.name}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Balance: {formatINR(partner1.balance)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="bg-white/5 p-2 rounded-lg">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Capital</p>
                  <p className="text-xs md:text-sm font-semibold text-white mt-0.5 tabular-nums">
                    {formatINR(partner1.totalCapitalInfused)}
                  </p>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Site Exp</p>
                  <p className="text-xs md:text-sm font-semibold text-white mt-0.5 tabular-nums">
                    {formatINR(partner1.totalOutOfPocket)}
                  </p>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Draws</p>
                  <p className="text-xs md:text-sm font-semibold text-rose-300 mt-0.5 tabular-nums">
                    {formatINR(partner1.totalDraws)}
                  </p>
                </div>
              </div>
            </div>

            {/* Partner 2 Box */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base">{partner2.name}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Balance: {formatINR(partner2.balance)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="bg-white/5 p-2 rounded-lg">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Capital</p>
                  <p className="text-xs md:text-sm font-semibold text-white mt-0.5 tabular-nums">
                    {formatINR(partner2.totalCapitalInfused)}
                  </p>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Site Exp</p>
                  <p className="text-xs md:text-sm font-semibold text-white mt-0.5 tabular-nums">
                    {formatINR(partner2.totalOutOfPocket)}
                  </p>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Draws</p>
                  <p className="text-xs md:text-sm font-semibold text-rose-300 mt-0.5 tabular-nums">
                    {formatINR(partner2.totalDraws)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Partner Profile Cards */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">Partner Capital Accounts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partners.map(p => {
            const owesPartner = p.balance >= 0
            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{p.name}</h3>
                      {p.notes && <p className="text-xs text-slate-500 mt-0.5">{p.notes}</p>}
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        owesPartner
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {owesPartner ? 'Firm owes partner' : 'Overdrawn from firm'}
                    </span>
                  </div>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Current Net Balance
                    </span>
                    <span
                      className={`text-2xl font-bold tabular-nums ${
                        owesPartner ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {formatINR(p.balance)}
                    </span>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Capital In</span>
                      <span className="font-semibold text-slate-800 tabular-nums">
                        {formatINR(p.totalCapitalInfused)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Out-of-Pocket</span>
                      <span className="font-semibold text-slate-800 tabular-nums">
                        {formatINR(p.totalOutOfPocket)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Personal Draws</span>
                      <span className="font-semibold text-rose-600 tabular-nums">
                        {formatINR(p.totalDraws)}
                      </span>
                    </div>
                  </div>

                  {/* Project Shares List */}
                  {p.projectShares && p.projectShares.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Agreed Project Splits
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {p.projectShares.map(sh => (
                          <span
                            key={sh.project_id}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                          >
                            <span className="truncate max-w-[140px]">{sh.projectName}:</span>
                            <strong className="text-blue-700 font-bold">{sh.share_percentage}%</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {p.lastDate ? `Last active: ${formatDate(p.lastDate)}` : 'No transactions recorded'}
                  </span>
                  <Link
                    href={`/partners/${p.id}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    View Statement & Ledger →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Project Equity Splits Matrix */}
      {projects.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Project-Specific Equity Splits</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Profit and risk sharing ratios defined per active construction contract
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Project</th>
                  <th className="text-right px-4 py-3">Award Value</th>
                  {partners.map(p => (
                    <th key={p.id} className="text-center px-4 py-3">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map(pr => {
                  return (
                    <tr key={pr.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{pr.name}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700 tabular-nums">
                        {formatINR(pr.awarded_amount)}
                      </td>
                      {partners.map(p => {
                        const share = rawShares.find(
                          s => s.project_id === pr.id && s.partner_id === p.id
                        )
                        const pct = share ? share.share_percentage : 50
                        return (
                          <td key={p.id} className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 tabular-nums">
                              {pct}%
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Transactions Feed */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Partner Financial Activity</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Audit log of capital additions, personal drawings, and site expense repayments
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedPartnerFilter}
              onChange={e => setSelectedPartnerFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">All Partners</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={selectedTypeFilter}
              onChange={e => setSelectedTypeFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="capital">Capital Contributions</option>
              <option value="out_of_pocket">Out-of-Pocket Expenses</option>
              <option value="draw">Personal Draws</option>
              <option value="reimbursement">Reimbursements</option>
            </select>
          </div>
        </div>

        {!filteredTransactions.length ? (
          <EmptyState
            title="No transactions found"
            description="Record a capital infusion or partner draw using the buttons above."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50/40">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Partner</th>
                  <th className="text-left px-4 py-3">Type & Details</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Project / Reference</th>
                  <th className="text-right px-4 py-3">Flow & Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map(t => {
                  const isInflow = t.transaction_type === 'paid_by_partner'
                  const isCapital = t.purpose === 'capital_contribution'

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {formatDate(t.date)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {t.partnerName}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                              isInflow
                                ? isCapital
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isInflow
                              ? isCapital
                                ? '+ Capital In'
                                : '+ Site Expense'
                              : '− Partner Draw'}
                          </span>
                          {t.notes && (
                            <span className="text-xs text-slate-600 truncate max-w-xs">{t.notes}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">
                        <p className="font-medium text-slate-700">{t.projectName || 'Firm-Level'}</p>
                        {t.reference && <p className="text-[11px] text-slate-400 font-mono">{t.reference}</p>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold">
                        <span className={isInflow ? 'text-emerald-700' : 'text-rose-700'}>
                          {isInflow ? '+' : '−'}{formatINR(t.amount)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
