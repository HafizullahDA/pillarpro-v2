'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/format'
import { NewItemDrawer } from '@/components/inventory/NewItemDrawer'
import { LogTransactionDrawer } from '@/components/inventory/LogTransactionDrawer'
import { canManageInventory } from '@/lib/permissions'

export interface InventoryItemRow {
  id: string
  item_name: string
  item_code: string | null
  category: string
  unit: string
  current_stock: number
  minimum_stock_alert: number
  wastage_threshold_pct?: number
  notes: string | null
  project_id: string | null
  projects?: { name: string } | null
}

export interface InventoryTrxRow {
  id: string
  item_id: string
  project_id: string | null
  supplier_id: string | null
  transaction_type: 'receipt_in' | 'issue_out' | 'return_in' | 'wastage_adjustment'
  quantity: number
  transaction_date: string
  destination_location: string | null
  issued_to_person: string | null
  challan_number: string | null
  vehicle_number: string | null
  remarks: string | null
  inventory_items?: { item_name: string; unit: string } | null
  projects?: { name: string } | null
  suppliers?: { name: string } | null
}

interface InventoryClientProps {
  initialItems: InventoryItemRow[]
  initialTransactions: InventoryTrxRow[]
  projects: { id: string; name: string }[]
  suppliers: { id: string; name: string }[]
  userRole: string
  isTableMissing?: boolean
}

export function InventoryClient({
  initialItems,
  initialTransactions,
  projects,
  suppliers,
  userRole,
  isTableMissing = false,
}: InventoryClientProps) {
  const [activeTab, setActiveTab] = useState<'stock' | 'ledger'>('stock')
  const [newItemOpen, setNewItemOpen] = useState(false)
  const [logTrxOpen, setLogTrxOpen] = useState(false)
  const [trxType, setTrxType] = useState<'receipt_in' | 'issue_out'>('receipt_in')
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>()

  const [filterProject, setFilterProject] = useState<string>('all')

  const canManage = canManageInventory(userRole)

  // Metrics & Wastage Analysis
  const metrics = useMemo(() => {
    let lowStockCount = 0
    let highWastageCount = 0
    const totalItems = initialItems.length
    const wastageByItem: Record<string, { issued: number; wasted: number; pct: number; threshold: number; exceeded: boolean }> = {}

    initialItems.forEach(item => {
      if (item.current_stock <= item.minimum_stock_alert) {
        lowStockCount++
      }

      const itemTrx = initialTransactions.filter(t => t.item_id === item.id)
      const issued = itemTrx.filter(t => t.transaction_type === 'issue_out').reduce((sum, t) => sum + Number(t.quantity), 0)
      const wasted = itemTrx.filter(t => t.transaction_type === 'wastage_adjustment').reduce((sum, t) => sum + Number(t.quantity), 0)
      const threshold = item.wastage_threshold_pct != null ? Number(item.wastage_threshold_pct) : 3.0
      const totalCons = issued + wasted
      const pct = totalCons > 0 ? (wasted / totalCons) * 100 : 0
      const exceeded = wasted > 0 && pct > threshold

      if (exceeded) highWastageCount++

      wastageByItem[item.id] = { issued, wasted, pct, threshold, exceeded }
    })

    const totalReceipts = initialTransactions.filter(t => t.transaction_type === 'receipt_in').length
    const totalIssues = initialTransactions.filter(t => t.transaction_type === 'issue_out').length

    return { totalItems, lowStockCount, highWastageCount, totalReceipts, totalIssues, wastageByItem }
  }, [initialItems, initialTransactions])

  // Filtered items
  const filteredItems = useMemo(() => {
    return initialItems.filter(item => {
      if (filterProject !== 'all' && item.project_id !== filterProject) return false
      return true
    })
  }, [initialItems, filterProject])

  // Filtered transactions
  const filteredTrx = useMemo(() => {
    return initialTransactions.filter(trx => {
      if (filterProject !== 'all' && trx.project_id !== filterProject) return false
      return true
    })
  }, [initialTransactions, filterProject])

  const openLogForAction = (type: 'receipt_in' | 'issue_out', itemId?: string) => {
    setTrxType(type)
    setSelectedItemId(itemId)
    setLogTrxOpen(true)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">Physical Store & Inventory</h1>
            <Badge label="Store OS" variant="info" />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track cement bags, TMT steel, sand counts, goods received (GRN), and site consumption issues.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setNewItemOpen(true)}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Material
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={initialItems.length === 0}
              onClick={() => openLogForAction('receipt_in')}
            >
              Receive (GRN)
            </Button>
            <Button
              size="sm"
              disabled={initialItems.length === 0}
              onClick={() => openLogForAction('issue_out')}
            >
              Issue to Site
            </Button>
          </div>
        )}
      </div>

      {/* Missing Table Setup Alert */}
      {isTableMissing && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-4 sm:p-5 text-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Store Inventory Database Migration Required
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  The Store Register table (<code className="font-mono text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded font-semibold">public.inventory_items</code>) has not been initialized in your Supabase database. Please execute migration <strong className="text-slate-800">033_store_inventory.sql</strong> in your Supabase SQL Editor to enable cement, steel, and GRN stock tracking.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setNewItemOpen(true)}
                className="border-amber-400/50 hover:bg-amber-100 text-amber-900 font-semibold"
              >
                Try Adding Material
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tracked Materials</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.totalItems}</span>
            <span className="text-xs text-slate-500">cataloged</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Buffer Alerts</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${metrics.lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {metrics.lowStockCount}
            </span>
            <span className="text-xs text-slate-500">below buffer</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Wastage Alerts</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${metrics.highWastageCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {metrics.highWastageCount}
            </span>
            <span className="text-xs text-slate-500">exceeding threshold</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Goods Receipts (GRN)</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{metrics.totalReceipts}</span>
            <span className="text-xs text-slate-500">deliveries logged</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Site Issue Slips</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{metrics.totalIssues}</span>
            <span className="text-xs text-slate-500">field dispatches</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 ease-out select-none cursor-pointer ${
            activeTab === 'stock'
              ? 'border-blue-600 text-blue-600 hover:-translate-y-0.5'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]'
          }`}
        >
          Stock Register ({initialItems.length})
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 ease-out select-none cursor-pointer ${
            activeTab === 'ledger'
              ? 'border-blue-600 text-blue-600 hover:-translate-y-0.5'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]'
          }`}
        >
          In/Out Ledger ({initialTransactions.length})
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Filter Location:</label>
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Yards & Project Sites</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {activeTab === 'stock' ? `${filteredItems.length} Materials` : `${filteredTrx.length} Transactions`}
        </span>
      </div>

      {/* Tab Content: Stock Register */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <EmptyState
              title="No Store Materials Registered"
              description="Catalog cement, TMT steel rebars, aggregates, and fuel to start tracking physical warehouse stock."
              action={
                canManage ? (
                  <Button size="sm" onClick={() => setNewItemOpen(true)}>
                    Add First Material
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => {
                const isLow = item.current_stock <= item.minimum_stock_alert
                const wastageInfo = metrics.wastageByItem[item.id]

                return (
                  <div
                    key={item.id}
                    className={`bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-between transition-all ${
                      wastageInfo?.exceeded
                        ? 'border-rose-300 bg-rose-50/20'
                        : isLow
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">{item.item_name}</h3>
                          {item.item_code && (
                            <span className="text-[10px] text-slate-400 font-mono">{item.item_code}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {wastageInfo?.exceeded && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                              High Wastage
                            </span>
                          )}
                          <Badge
                            label={isLow ? 'Low Stock' : 'In Stock'}
                            variant={isLow ? 'warning' : 'success'}
                          />
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Current Balance:</span>
                          <span className="text-lg font-bold text-slate-900">
                            {item.current_stock} <span className="text-xs font-medium text-slate-500">{item.unit}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400">Min Buffer Alert:</span>
                          <span className="font-semibold">{item.minimum_stock_alert} {item.unit}</span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400">Wastage / Scrap:</span>
                          <span className={`font-semibold ${wastageInfo?.exceeded ? 'text-rose-700 font-bold' : 'text-slate-700'}`}>
                            {wastageInfo?.wasted ? `${wastageInfo.wasted} ${item.unit} (${wastageInfo.pct.toFixed(1)}%)` : `0 ${item.unit} (0%)`}
                            <span className="text-[10px] text-slate-400 ml-1 font-normal">/ max {item.wastage_threshold_pct ?? 3}%</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400">Yard / Site:</span>
                          <span className="truncate max-w-[160px] font-medium">
                            {item.projects?.name || 'Central Firm Yard'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {canManage && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs py-1 px-2.5 h-auto"
                          onClick={() => openLogForAction('receipt_in', item.id)}
                        >
                          + GRN
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs py-1 px-2.5 h-auto"
                          onClick={() => openLogForAction('issue_out', item.id)}
                        >
                          - Issue
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: In/Out Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {filteredTrx.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No stock receipts or issue slips recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Material</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4">Site / Destination</th>
                    <th className="py-3 px-4">Supplier / Challan</th>
                    <th className="py-3 px-4">Issued To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTrx.map(trx => {
                    const isReceipt = trx.transaction_type === 'receipt_in' || trx.transaction_type === 'return_in'

                    return (
                      <tr key={trx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                          {formatDate(trx.transaction_date)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 font-semibold ${
                            isReceipt ? 'text-emerald-700' : 'text-amber-700'
                          }`}>
                            {isReceipt ? 'Stock In (GRN)' : 'Issue Out'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">
                            {trx.inventory_items?.item_name || 'Material'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums">
                          <span className={isReceipt ? 'text-emerald-600' : 'text-amber-600'}>
                            {isReceipt ? `+${trx.quantity}` : `-${trx.quantity}`}
                          </span>{' '}
                          <span className="text-[10px] text-slate-400 font-normal">
                            {trx.inventory_items?.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span>{trx.projects?.name || 'Central Yard'}</span>
                          {trx.destination_location && (
                            <span className="block text-[10px] text-slate-400">{trx.destination_location}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span>{trx.suppliers?.name || '—'}</span>
                          {trx.challan_number && (
                            <span className="block text-[10px] text-slate-400 font-mono">Challan: {trx.challan_number}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {trx.issued_to_person || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Drawers */}
      <NewItemDrawer
        open={newItemOpen}
        onClose={() => setNewItemOpen(false)}
        projects={projects}
      />

      <LogTransactionDrawer
        open={logTrxOpen}
        onClose={() => setLogTrxOpen(false)}
        items={initialItems.map(i => ({
          id: i.id,
          item_name: i.item_name,
          unit: i.unit,
          current_stock: i.current_stock,
          minimum_stock_alert: i.minimum_stock_alert,
        }))}
        projects={projects}
        suppliers={suppliers}
        initialType={trxType}
        preselectedItemId={selectedItemId}
      />
    </div>
  )
}

