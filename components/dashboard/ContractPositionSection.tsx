'use client'

import React from 'react'
import Link from 'next/link'
import { formatINR } from '@/lib/format'
import { ContractItem, VariationSummary, RawRABillItem, BOQItemSummary } from './types'

interface ContractPositionProps {
  contracts: ContractItem[]
  variations: VariationSummary[]
  bills: RawRABillItem[]
  boqItems: BOQItemSummary[]
}

export function ContractPositionSection({
  contracts,
  variations,
  bills,
  boqItems,
}: ContractPositionProps) {
  const activeContracts = contracts.filter(c => c.status === 'active')
  const originalContractValue = contracts.reduce((sum, c) => sum + (Number(c.awarded_amount) || 0), 0)

  // Approved variations/extra items and deletions
  const approvedVariationsAmount = variations
    .filter(v => v.status === 'APPROVED' && !v.is_deletion)
    .reduce((sum, v) => sum + (Number(v.approved_amount) || 0), 0)

  const approvedDeletionsAmount = variations
    .filter(v => v.status === 'APPROVED' && v.is_deletion)
    .reduce((sum, v) => sum + (Number(v.deleted_work_amount) || Number(v.approved_amount) || 0), 0)

  // Formula: Current = Original + Approved Variations/Extra Items - Deleted Work
  const currentContractValue = originalContractValue + approvedVariationsAmount - approvedDeletionsAmount

  // Executed value: based on measured BOQ execution or work certified
  const executedValue = boqItems.reduce(
    (sum, b) => sum + ((Number(b.measured_quantity) || 0) * (Number(b.rate) || 0)),
    0
  )

  // Billed value from RA Bills
  const billedValue = bills.reduce((sum, b) => {
    const netPassed = b.net_payable_this_bill != null
      ? Number(b.net_payable_this_bill)
      : (b.net_payable_amount != null && !isNaN(Number(b.net_payable_amount))
        ? Number(b.net_payable_amount)
        : (Number(b.work_certified_amount) || 0) - (Number(b.retention_amount) || 0))
    return sum + (Number(netPassed) || 0)
  }, 0)

  // Paid value from RA Bills
  const paidValue = bills.reduce((sum, b) => {
    const netBank = b.net_bank_received != null && !isNaN(Number(b.net_bank_received))
      ? Number(b.net_bank_received)
      : (Number(b.amount_received) || 0)
    return sum + (Number(netBank) || 0)
  }, 0)

  const outstandingRAAmount = Math.max(0, billedValue - paidValue)

  // Realization %
  const realizationPct = currentContractValue > 0
    ? Math.min(100, Math.round((paidValue / currentContractValue) * 100))
    : 0

  return (
    <div id="contract-position" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 rounded-full bg-blue-600 inline-block" />
            <h2 className="text-base font-bold text-slate-900">1. Contract Position</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Statutory Realization
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 pl-3.5">
            Strict separation between Original, Variations, Executed, Billed, and Paid government entitlements
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 font-medium">Realized to Bank</span>
          <p className="text-sm font-bold text-emerald-600">{realizationPct}% <span className="text-xs font-normal text-slate-400">of Current Value</span></p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Active Contracts */}
        <Link
          href="/contracts"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Active Contracts
          </span>
          <p className="text-lg font-black text-slate-900 mt-1 tabular-nums group-hover:text-blue-600 transition-colors">
            {activeContracts.length}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            Total {contracts.length} registered
          </span>
        </Link>

        {/* Original Contract Value */}
        <Link
          href="/contracts"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Original Value
          </span>
          <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums group-hover:text-blue-600 transition-colors truncate">
            {formatINR(originalContractValue)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            Awarded base price
          </span>
        </Link>

        {/* Current Contract Value */}
        <Link
          href="/variations"
          className="group block p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-white hover:border-blue-500 hover:shadow-xs transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 block truncate">
              Current Value
            </span>
          </div>
          <p className="text-sm font-bold text-blue-900 mt-1 tabular-nums group-hover:text-blue-700 transition-colors truncate">
            {formatINR(currentContractValue)}
          </p>
          <span className="text-[10px] text-blue-600/80 mt-0.5 block truncate">
            Incl. approved VO &amp; Dev
          </span>
        </Link>

        {/* Executed Value */}
        <Link
          href="/measurements"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Executed (e-MB)
          </span>
          <p className="text-sm font-bold text-indigo-950 mt-1 tabular-nums group-hover:text-indigo-600 transition-colors truncate">
            {formatINR(executedValue)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            Site work completed
          </span>
        </Link>

        {/* Billed Value */}
        <Link
          href="/ra-bills"
          className="group block p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
            Billed Value
          </span>
          <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums group-hover:text-blue-600 transition-colors truncate">
            {formatINR(billedValue)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            RA Bills passed
          </span>
        </Link>

        {/* Paid Value */}
        <Link
          href="/ra-bills"
          className="group block p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-white hover:border-emerald-500 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block truncate">
            Paid to Bank
          </span>
          <p className="text-sm font-bold text-emerald-800 mt-1 tabular-nums group-hover:text-emerald-600 transition-colors truncate">
            {formatINR(paidValue)}
          </p>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block truncate">
            Net received credited
          </span>
        </Link>

        {/* Outstanding RA Amount */}
        <Link
          href="/ra-bills"
          className="group block p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-white hover:border-amber-500 hover:shadow-xs transition-all"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 block truncate">
            Outstanding RA
          </span>
          <p className="text-sm font-bold text-amber-900 mt-1 tabular-nums group-hover:text-amber-700 transition-colors truncate">
            {formatINR(outstandingRAAmount)}
          </p>
          <span className="text-[10px] text-amber-600/80 mt-0.5 block truncate">
            Pending department clearance
          </span>
        </Link>
      </div>

      {/* Contract Progress Realization Flow */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
        <div className="flex flex-wrap items-center justify-between text-slate-600 mb-1.5 gap-2">
          <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wide">
            Contract Financial Pipeline
          </span>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Current: <strong>{formatINR(currentContractValue)}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Executed: <strong>{formatINR(executedValue)}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Billed: <strong>{formatINR(billedValue)}</strong></span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 font-semibold">Paid: {formatINR(paidValue)}</span>
          </div>
        </div>
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${currentContractValue > 0 ? Math.min(100, (paidValue / currentContractValue) * 100) : 0}%` }}
            className="bg-emerald-500 h-full transition-all duration-300"
            title={`Paid: ${formatINR(paidValue)}`}
          />
          <div
            style={{ width: `${currentContractValue > 0 ? Math.min(100, (outstandingRAAmount / currentContractValue) * 100) : 0}%` }}
            className="bg-amber-400 h-full transition-all duration-300"
            title={`Outstanding Billed: ${formatINR(outstandingRAAmount)}`}
          />
          <div
            style={{ width: `${currentContractValue > 0 ? Math.max(0, Math.min(100, ((executedValue - billedValue) / currentContractValue) * 100)) : 0}%` }}
            className="bg-indigo-300 h-full transition-all duration-300"
            title={`Executed Unbilled: ${formatINR(Math.max(0, executedValue - billedValue))}`}
          />
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Paid ({realizationPct}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Outstanding RA ({currentContractValue > 0 ? Math.round((outstandingRAAmount / currentContractValue) * 100) : 0}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-300 inline-block" /> Unbilled Measured ({currentContractValue > 0 ? Math.round((Math.max(0, executedValue - billedValue) / currentContractValue) * 100) : 0}%)
          </span>
        </div>
      </div>
    </div>
  )
}
