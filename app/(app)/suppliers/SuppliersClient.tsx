'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SummaryTile } from '@/components/ui/SummaryTile'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatINR } from '@/lib/format'
import { SupplierActions } from './SupplierActions'
import { DeleteSupplierModal } from './DeleteSupplierModal'
import { canDeleteSupplier, canCreateSupplier } from '@/lib/permissions'
import { exportSuppliersSummary } from '@/lib/export/csv'
import { saveOfflineSnapshot } from '@/lib/offline/db'
import { StitchMetric } from '@/components/ui/StitchMetric'
import { StitchTable, StitchTableHead, StitchTableBody, StitchTableRow, StitchTableCell } from '@/components/ui/StitchTable'

export type SupplierSummaryRow = {
  id: string
  name: string
  contact_number: string | null
  gst_number: string | null
  address: string | null
  created_at: string
  updated_at: string
  total_procured: number
  total_paid: number
  outstanding_balance: number
  credit_limit?: number | null
  credit_utilization_percent?: number | null
}

type Project = { id: string; name: string }

interface SuppliersClientProps {
  initialSuppliers: SupplierSummaryRow[]
  projects: Project[]
  userRole?: string
}

export function SuppliersClient({ initialSuppliers, projects, userRole }: SuppliersClientProps) {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<SupplierSummaryRow[]>(initialSuppliers)
  const [search, setSearch] = useState('')
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierSummaryRow | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const canDelete = canDeleteSupplier(userRole)
  const canCreate = canCreateSupplier(userRole)

  useEffect(() => {
    setSuppliers(initialSuppliers)
  }, [initialSuppliers])

  useEffect(() => {
    if (navigator.onLine) {
      void saveOfflineSnapshot('/suppliers', { suppliers: initialSuppliers, projects })
    }
  }, [initialSuppliers, projects])

  const handleOpenDelete = (s: SupplierSummaryRow) => {
    setSupplierToDelete(s)
    setDeleteModalOpen(true)
  }

  const handleDeleteSuccess = () => {
    if (supplierToDelete) {
      setSuppliers(prev => prev.filter(s => s.id !== supplierToDelete.id))
    }
    router.refresh()
  }

  // Compute overall KPI metrics
  const totals = useMemo(() => {
    return suppliers.reduce(
      (acc, s) => {
        acc.procured += Number(s.total_procured) || 0
        acc.paid += Number(s.total_paid) || 0
        acc.balance += Number(s.outstanding_balance) || 0
        return acc
      },
      { procured: 0, paid: 0, balance: 0 }
    )
  }, [suppliers])

  // Filtered suppliers based on search query
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return suppliers
    return suppliers.filter(s => {
      const nameMatch = s.name.toLowerCase().includes(q)
      const phoneMatch = s.contact_number?.toLowerCase().includes(q) ?? false
      const gstMatch = s.gst_number?.toLowerCase().includes(q) ?? false
      const addrMatch = s.address?.toLowerCase().includes(q) ?? false
      return nameMatch || phoneMatch || gstMatch || addrMatch
    })
  }, [suppliers, search])

  const supplierOptions = useMemo(() => {
    return suppliers.map(s => ({
      id: s.id,
      name: s.name,
      contact_number: s.contact_number,
      credit_limit: s.credit_limit,
    }))
  }, [suppliers])

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header & Drawers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Supplier Khata &amp; Accounts</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 tabular-nums">
              {suppliers.length} Suppliers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Material suppliers, site procurements, credit tracking, and settlement payments
          </p>
        </div>
        {canCreate && <SupplierActions projects={projects} suppliers={supplierOptions} />}
      </div>

      {/* Stitch KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StitchMetric
          label="Total Procured"
          value={formatINR(totals.procured)}
          sub="Materials bought on credit/cash"
          tone="indigo"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StitchMetric
          label="Total Paid"
          value={formatINR(totals.paid)}
          sub="Settlements to suppliers"
          tone="emerald"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StitchMetric
          label="Outstanding Balance Due"
          value={formatINR(totals.balance)}
          sub={totals.balance > 0 ? 'Net payable to suppliers' : 'All accounts settled'}
          tone={totals.balance > 0 ? 'rose' : 'default'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Search & List */}
      {!suppliers.length ? (
        <EmptyState
          title="No suppliers yet"
          description="Add your material suppliers to track procurement bills and payments against sites or central stock."
        />
      ) : (
        <div className="space-y-3">
          {/* Search bar & Export */}
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by supplier name, GSTIN, phone..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50/80 border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => exportSuppliersSummary(filtered)}
                title="Export Supplier Directory & Balances for CA Audit / GSTR-2B (Excel & CSV)"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300/80 hover:bg-emerald-100/70 hover:border-emerald-400 transition-all shadow-2xs"
              >
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Directory (CSV)
              </button>
              <div className="text-xs text-slate-500 hidden sm:block">
                Showing <span className="font-bold text-slate-700 tabular-nums">{filtered.length}</span> of{' '}
                <span className="tabular-nums">{suppliers.length}</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <StitchTable>
            <table className="w-full text-sm">
              <StitchTableHead>
                <tr>
                  <th className="px-4 py-3 text-left">Supplier Name</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">GSTIN</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Contact</th>
                  <th className="px-4 py-3 text-right">Procured</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance Due</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </StitchTableHead>
              <StitchTableBody>
                {filtered.map(s => {
                  const balance = Number(s.outstanding_balance) || 0
                  return (
                    <StitchTableRow key={s.id}>
                      <StitchTableCell>
                        <Link
                          href={`/suppliers/${s.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors block"
                        >
                          {s.name}
                        </Link>
                        {s.address && (
                          <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">{s.address}</span>
                        )}
                      </StitchTableCell>

                      <StitchTableCell className="hidden md:table-cell">
                        {s.gst_number ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                            {s.gst_number}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not specified</span>
                        )}
                      </StitchTableCell>

                      <StitchTableCell className="hidden sm:table-cell text-slate-600 tabular-nums">
                        {s.contact_number || <span className="text-slate-400 italic text-xs">—</span>}
                      </StitchTableCell>

                      <StitchTableCell align="right" className="font-mono text-slate-700">
                        {formatINR(s.total_procured)}
                      </StitchTableCell>

                      <StitchTableCell align="right" className="font-mono text-slate-700">
                        {formatINR(s.total_paid)}
                      </StitchTableCell>

                      <StitchTableCell align="right" className="font-semibold">
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold font-mono tabular-nums ${
                              balance > 0
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            }`}
                          >
                            {formatINR(balance)}
                          </span>
                          {s.credit_limit && s.credit_limit > 0 ? (
                            <div className="flex items-center gap-1.5 text-[10px] font-medium">
                              <span className="text-slate-400">Limit: {formatINR(s.credit_limit)}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded font-semibold ${
                                  (s.credit_utilization_percent ?? (balance / s.credit_limit) * 100) >= 100
                                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                    : (s.credit_utilization_percent ?? (balance / s.credit_limit) * 100) >= 85
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                }`}
                              >
                                {Math.round(s.credit_utilization_percent ?? (balance / s.credit_limit) * 100)}%
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </StitchTableCell>

                      <StitchTableCell align="right">
                        <div className="flex items-center justify-end gap-2.5">
                          <Link
                            href={`/suppliers/${s.id}`}
                            className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            Statement
                            <svg className="h-3.5 w-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(s)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete supplier (Owner only)"
                              aria-label={`Delete supplier ${s.name}`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span className="hidden lg:inline">Delete</span>
                            </button>
                          )}
                        </div>
                      </StitchTableCell>
                    </StitchTableRow>
                  )
                })}
              </StitchTableBody>
            </table>
          </StitchTable>
        </div>
      )}

      {/* Delete Supplier Confirmation Modal (Owner Only) */}
      <DeleteSupplierModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        supplier={supplierToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  )
}
