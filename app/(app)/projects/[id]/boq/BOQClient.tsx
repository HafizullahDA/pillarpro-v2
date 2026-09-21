'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { EmptyState } from '@/components/ui/EmptyState'
import { BOQSummaryItem, BOQItem } from '@/lib/types/boq'
import { calculateBOQProgress } from '@/lib/calculations/boq'
import { exportBOQScheduleCSV } from '@/lib/export/csv'
import { NewBOQItemDrawer } from './NewBOQItemDrawer'
import { ImportBOQModal } from './ImportBOQModal'

interface BOQClientProps {
  project: {
    id: string
    name: string
    agency_name?: string | null
    awarded_amount: number
  }
  initialItems: BOQSummaryItem[]
  rawItems: BOQItem[]
}

export function BOQClient({
  project,
  initialItems,
  rawItems,
}: BOQClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  const [items, setItems] = useState<BOQSummaryItem[]>(initialItems)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'unstarted'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Recalculate overall progress
  const progress = useMemo(() => calculateBOQProgress(items), [items])

  // Filtered items list
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search
      const matchesSearch =
        item.item_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.unit.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      // Status
      const pct = Number(item.work_done_percentage) || 0
      if (statusFilter === 'completed') return pct >= 100
      if (statusFilter === 'in_progress') return pct > 0 && pct < 100
      if (statusFilter === 'unstarted') return pct === 0

      return true
    })
  }, [items, searchQuery, statusFilter])

  const handleRefresh = async () => {
    const { data: summaryData, error: summaryErr } = await supabase.rpc(
      'get_project_boq_summary',
      { p_project_id: project.id }
    )
    if (!summaryErr && summaryData) {
      setItems(summaryData)
    } else {
      router.refresh()
    }
  }

  const handleDeleteItem = async (itemId: string, itemNumber: string) => {
    if (!confirm(`Are you sure you want to delete item "${itemNumber}"? This cannot be undone.`)) {
      return
    }

    setDeletingId(itemId)
    try {
      const { error } = await supabase
        .from('boq_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      toast.success(`BOQ Item "${itemNumber}" deleted.`)
      setItems((prev) => prev.filter((i) => i.boq_item_id !== itemId))
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete item. It may be linked to an RA Bill.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleOpenEdit = (summaryItem: BOQSummaryItem) => {
    const raw = rawItems.find((r) => r.id === summaryItem.boq_item_id)
    if (raw) {
      setEditingItem(raw)
    } else {
      setEditingItem({
        id: summaryItem.boq_item_id,
        project_id: project.id,
        organization_id: '',
        item_number: summaryItem.item_number,
        description: summaryItem.description,
        unit: summaryItem.unit,
        tender_quantity: summaryItem.tender_quantity,
        awarded_rate: summaryItem.awarded_rate,
        total_amount: summaryItem.tender_amount,
        created_at: '',
        updated_at: '',
      })
    }
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setEditingItem(null)
  }

  const handleExportCSV = () => {
    exportBOQScheduleCSV(items, project.name)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href={`/projects/${project.id}`} className="hover:text-slate-900 transition-colors">
          ← Back to {project.name}
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">Bill of Quantities (BOQ)</span>
      </div>

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Bill of Quantities (BOQ) & Measurement Book
            </h1>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              e-MB Schedule
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Contract item-rate schedule with real-time executed measurement tracking and work-done %
            {project.agency_name ? ` • Department: ${project.agency_name}` : ''}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            disabled={items.length === 0}
            className="text-xs font-semibold"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Excel (CSV)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            className="text-xs font-semibold"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Bulk Import CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingItem(null)
              setDrawerOpen(true)
            }}
            className="bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs"
          >
            + Add BOQ Item
          </Button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Tender Value */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Tender BOQ Value</p>
          <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
            {formatINR(progress.totalTenderAmount)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {progress.totalItemsCount} scheduled items
          </p>
        </div>

        {/* Executed Value */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Executed Till Date</p>
          <p className="text-lg font-bold text-emerald-700 mt-1 tabular-nums">
            {formatINR(progress.totalExecutedAmount)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Certified via RA bills
          </p>
        </div>

        {/* Physical Work-Done % */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Physical Progress</p>
            <span className="text-xs font-bold text-slate-900">{progress.overallWorkDonePct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden border border-slate-200">
            <div
              className="bg-slate-900 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, progress.overallWorkDonePct)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Overall financial weightage
          </p>
        </div>

        {/* Item Execution Status Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Item Status</p>
          <div className="flex items-center justify-between gap-1 text-xs mt-1">
            <div className="text-center flex-1 p-1 bg-emerald-50 rounded-lg border border-emerald-100">
              <span className="font-bold text-emerald-700">{progress.completedItemsCount}</span>
              <p className="text-[10px] text-emerald-600 font-medium">Done</p>
            </div>
            <div className="text-center flex-1 p-1 bg-amber-50 rounded-lg border border-amber-100">
              <span className="font-bold text-amber-700">{progress.inProgressItemsCount}</span>
              <p className="text-[10px] text-amber-600 font-medium">Active</p>
            </div>
            <div className="text-center flex-1 p-1 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700">{progress.unstartedItemsCount}</span>
              <p className="text-[10px] text-slate-500 font-medium">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search item no, DSR code, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === 'in_progress'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            In Progress ({progress.inProgressItemsCount})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === 'completed'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Completed ({progress.completedItemsCount})
          </button>
          <button
            onClick={() => setStatusFilter('unstarted')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === 'unstarted'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pending ({progress.unstartedItemsCount})
          </button>
        </div>
      </div>

      {/* BOQ Items Schedule Table */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <EmptyState
            title={items.length === 0 ? 'No BOQ Items Added Yet' : 'No Matching BOQ Items'}
            description={
              items.length === 0
                ? 'Add your contract schedule items manually or import your tender CSV to start measuring work-done % and linking to RA bills.'
                : 'Try adjusting your search query or status filter.'
            }
            action={
              items.length === 0 ? (
                <Button
                  onClick={() => {
                    setEditingItem(null)
                    setDrawerOpen(true)
                  }}
                  className="bg-slate-900 hover:bg-black text-white text-xs font-semibold"
                >
                  + Add First BOQ Item
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Item No</th>
                  <th className="p-3 max-w-xs">Description</th>
                  <th className="p-3">Unit</th>
                  <th className="p-3 text-right">Tender Qty</th>
                  <th className="p-3 text-right">Awarded Rate</th>
                  <th className="p-3 text-right">Tender Amount</th>
                  <th className="p-3 text-right">Executed Qty</th>
                  <th className="p-3 text-right">Remaining Qty</th>
                  <th className="p-3 text-right">Executed Amount</th>
                  <th className="p-3 text-center min-w-[120px]">Work-Done %</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const pct = Number(item.work_done_percentage) || 0
                  const isExceeded = Number(item.remaining_qty) < 0

                  return (
                    <tr key={item.boq_item_id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Item No */}
                      <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {item.item_number}
                      </td>

                      {/* Description */}
                      <td className="p-3 text-slate-700 max-w-xs">
                        <p className="line-clamp-2" title={item.description}>
                          {item.description}
                        </p>
                      </td>

                      {/* Unit */}
                      <td className="p-3 text-slate-500 uppercase font-medium">
                        {item.unit}
                      </td>

                      {/* Tender Qty */}
                      <td className="p-3 text-right tabular-nums text-slate-800">
                        {Number(item.tender_quantity).toLocaleString('en-IN')}
                      </td>

                      {/* Awarded Rate */}
                      <td className="p-3 text-right tabular-nums text-slate-600">
                        ₹{Number(item.awarded_rate).toLocaleString('en-IN')}
                      </td>

                      {/* Tender Amount */}
                      <td className="p-3 text-right tabular-nums font-semibold text-slate-900">
                        {formatINR(item.tender_amount)}
                      </td>

                      {/* Executed Qty */}
                      <td className="p-3 text-right tabular-nums font-semibold text-emerald-700">
                        {Number(item.cumulative_executed_qty).toLocaleString('en-IN')}
                      </td>

                      {/* Remaining Qty */}
                      <td
                        className={`p-3 text-right tabular-nums font-medium ${
                          isExceeded ? 'text-amber-700 font-bold' : 'text-slate-600'
                        }`}
                      >
                        {Number(item.remaining_qty).toLocaleString('en-IN')}
                        {isExceeded && (
                          <span className="block text-[10px] text-amber-600">Excess</span>
                        )}
                      </td>

                      {/* Executed Amount */}
                      <td className="p-3 text-right tabular-nums font-semibold text-slate-900">
                        {formatINR(item.cumulative_executed_amount)}
                      </td>

                      {/* Work-Done % with inline bar */}
                      <td className="p-3 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                            <div
                              className={`h-1.5 rounded-full ${
                                pct >= 100 ? 'bg-emerald-600' : pct > 0 ? 'bg-slate-900' : 'bg-transparent'
                              }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-900 tabular-nums">
                            {pct}%
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
                            title="Edit Item"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.boq_item_id, item.item_number)}
                            disabled={deletingId === item.boq_item_id}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                            title="Delete Item"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawers & Modals */}
      <NewBOQItemDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        projectId={project.id}
        itemToEdit={editingItem}
        onSaved={handleRefresh}
      />

      <ImportBOQModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        projectId={project.id}
        onImportSuccess={handleRefresh}
      />
    </div>
  )
}
