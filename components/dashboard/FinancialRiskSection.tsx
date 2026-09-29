'use client'

import React from 'react'
import Link from 'next/link'
import { formatINR } from '@/lib/format'
import {
  RawRABillItem,
  SecurityDepositItem,
  ClaimSummary,
  WagePaymentSummary,
} from './types'

interface FinancialRiskProps {
  bills: RawRABillItem[]
  supplierDues: number
  wagePayments: WagePaymentSummary[]
  securityDeposits: SecurityDepositItem[]
  claims: ClaimSummary[]
}

export function FinancialRiskSection({
  bills,
  supplierDues,
  wagePayments,
  securityDeposits,
  claims,
}: FinancialRiskProps) {
  // 1. Outstanding RA Bills
  const unpaidBills = bills.filter(b => {
    const netPassed = b.net_payable_this_bill != null
      ? Number(b.net_payable_this_bill)
      : (b.net_payable_amount != null && !isNaN(Number(b.net_payable_amount))
        ? Number(b.net_payable_amount)
        : (Number(b.work_certified_amount) || 0) - (Number(b.retention_amount) || 0))
    const netBank = b.net_bank_received != null && !isNaN(Number(b.net_bank_received))
      ? Number(b.net_bank_received)
      : (Number(b.amount_received) || 0)
    return (netPassed - netBank) > 1
  })

  const totalOutstandingRA = bills.reduce((sum, b) => {
    const netPassed = b.net_payable_this_bill != null
      ? Number(b.net_payable_this_bill)
      : (b.net_payable_amount != null && !isNaN(Number(b.net_payable_amount))
        ? Number(b.net_payable_amount)
        : (Number(b.work_certified_amount) || 0) - (Number(b.retention_amount) || 0))
    const netBank = b.net_bank_received != null && !isNaN(Number(b.net_bank_received))
      ? Number(b.net_bank_received)
      : (Number(b.amount_received) || 0)
    return sum + Math.max(0, netPassed - netBank)
  }, 0)

  // 2. Labour Payable
  const labourPayable = wagePayments.reduce((sum, w) => {
    const owed = Number(w.amount_owed) || 0
    const paid = Number(w.amount_paid) || 0
    return sum + Math.max(0, owed - paid)
  }, 0)

  // 3. Retention Withheld
  const totalRetention = bills.reduce((sum, b) => sum + (Number(b.retention_amount) || 0), 0)

  // 4. Security Deposits Pledged
  const activeDeposits = securityDeposits.filter(s => s.status === 'active')
  const totalSecurityDeposits = activeDeposits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)

  // 5. BGs Expiring soon (≤ 45 days)
  const now = new Date()
  const fortyFiveDaysLater = new Date(now.getTime() + 45 * 86400000).toISOString().split('T')[0]
  const todayStr = now.toISOString().split('T')[0]

  const expiringDeposits = activeDeposits.filter(
    s => s.expiry_date && s.expiry_date <= fortyFiveDaysLater
  )
  const expiringDepositsAmount = expiringDeposits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)

  // 6. Claims Outstanding
  const outstandingClaims = claims.filter(c => c.status !== 'REJECTED' && c.status !== 'PAID')
  const totalOutstandingClaims = outstandingClaims.reduce((sum, c) => {
    const claimed = Number(c.claimed_amount) || 0
    const paid = Number(c.paid_amount) || 0
    return sum + Math.max(0, claimed - paid)
  }, 0)

  // Total working capital locked (Retention + Security Deposits + Outstanding RA)
  const totalLockedCapital = totalRetention + totalSecurityDeposits + totalOutstandingRA

  return (
    <div id="financial-risk" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 rounded-full bg-red-500 inline-block" />
            <h2 className="text-base font-bold text-slate-900">4. Financial Risk &amp; Liquidity Exposure</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
              Working Capital Health
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 pl-3.5">
            Department receivables aging, trade liabilities, locked retention, and bank guarantee encashment exposure
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 font-medium">Locked Capital (SD + Retention + RA)</span>
          <p className="text-sm font-bold text-slate-900">{formatINR(totalLockedCapital)}</p>
        </div>
      </div>

      {/* 7 Risk Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Outstanding RA Bills */}
        <Link
          href="/ra-bills"
          className="group block p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-white hover:border-amber-500 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 block truncate">
            Outstanding RA
          </span>
          <p className="text-sm font-bold text-amber-900 mt-1 tabular-nums group-hover:text-amber-600 transition-colors truncate">
            {formatINR(totalOutstandingRA)}
          </p>
          <span className="text-[10px] text-amber-700/80 mt-0.5 block truncate">
            {unpaidBills.length} unpaid / partial bill{unpaidBills.length !== 1 ? 's' : ''}
          </span>
        </Link>

        {/* Supplier Payable */}
        <Link
          href="/suppliers"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Supplier Dues
          </span>
          <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums group-hover:text-blue-600 transition-colors truncate">
            {formatINR(supplierDues)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            Vendor khata balance
          </span>
        </Link>

        {/* Labour Payable */}
        <Link
          href="/labour"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-red-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Labour Payable
          </span>
          <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums group-hover:text-red-600 transition-colors truncate">
            {formatINR(labourPayable)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            Unpaid wages liability
          </span>
        </Link>

        {/* Retention Withheld */}
        <Link
          href="/ra-bills"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Retention Withheld
          </span>
          <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums group-hover:text-blue-600 transition-colors truncate">
            {formatINR(totalRetention)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            Deducted by department
          </span>
        </Link>

        {/* Security Deposits Pledged */}
        <Link
          href="/contracts"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Security Deposits
          </span>
          <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums group-hover:text-indigo-600 transition-colors truncate">
            {formatINR(totalSecurityDeposits)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            {activeDeposits.length} active BG / FDR / ASD
          </span>
        </Link>

        {/* BGs Expiring Soon */}
        <Link
          href="/contracts"
          className={`group block p-3.5 rounded-xl border transition-all ${expiringDeposits.length > 0 ? 'border-red-300 bg-red-50/60 hover:bg-white hover:border-red-500' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] uppercase font-bold tracking-wider block truncate ${expiringDeposits.length > 0 ? 'text-red-700' : 'text-slate-500'}`}>
              BGs Expiring
            </span>
            {expiringDeposits.length > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
            )}
          </div>
          <p className={`text-sm font-bold mt-1 tabular-nums truncate ${expiringDeposits.length > 0 ? 'text-red-700' : 'text-slate-900'}`}>
            {formatINR(expiringDepositsAmount)}
          </p>
          <span className={`text-[10px] mt-0.5 block truncate ${expiringDeposits.length > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
            {expiringDeposits.length > 0 ? `${expiringDeposits.length} expiring ≤ 45d` : 'None in next 45d'}
          </span>
        </Link>

        {/* Claims Outstanding */}
        <Link
          href="/claims"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-purple-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Claims Open
          </span>
          <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums group-hover:text-purple-600 transition-colors truncate">
            {formatINR(totalOutstandingClaims)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            {outstandingClaims.length} active dispute{outstandingClaims.length !== 1 ? 's' : ''}
          </span>
        </Link>
      </div>
    </div>
  )
}
