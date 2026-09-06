'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SummaryTile } from '@/components/ui/SummaryTile'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatINR } from '@/lib/format'
import { SupplierActions } from './SupplierActions'
import { DeleteSupplierModal } from './DeleteSupplierModal'

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

  const isOwner = userRole === 'owner'

  useEffect(() => {
    setSuppliers(initialSuppliers)
  }, [initialSuppliers])

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
    return suppliers.map(s => ({ id: s.id, name: s.name }))
  }, [suppliers])

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header & Drawers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Supplier Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage material suppliers, track site procurements, and record payments
          </p>
        </div>
        <SupplierActions projects={projects} suppliers={supplierOptions} />
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryTile
          label="Total Procured"
          value={formatINR(totals.procured)}
          sub="Materials bought on credit/cash"
          accent="blue"
        />
        <SummaryTile
          label="Total Paid"
          value={formatINR(totals.paid)}
          sub="Settlements to suppliers"
          accent="emerald"
        />
        <SummaryTile
          label="Outstanding Balance"
          value={formatINR(totals.balance)}
          sub="Net payable balance"
          accent={totals.balance > 0 ? 'red' : 'slate'}
        />
      </div>

      {/* Search & List */}
      {!suppliers.length ? (
        <EmptyState
          title="No suppliers yet"
          description="Add your material suppliers to track procurement bills and payments against sites or central stock."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Search bar */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative flex-1 max-w-sm">
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
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400"
              />
            </div>
            <div className="text-xs text-slate-500">
              Showing <span className="font-medium text-slate-700">{filtered.length}</span> of{' '}
              {suppliers.length} suppliers
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Supplier Name</th>
                  <th className="px-4 py-3 hidden md:table-cell">GSTIN</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Contact</th>
                  <th className="px-4 py-3 text-right">Procured</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance Due</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => {
                  const balance = Number(s.outstanding_balance) || 0
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/suppliers/${s.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600 block"
                        >
                          {s.name}
                        </Link>
                        {s.address && (
                          <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">{s.address}</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {s.gst_number ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700">
                            {s.gst_number}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not specified</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 hidden sm:table-cell text-slate-600 tabular-nums">
                        {s.contact_number || <span className="text-slate-400 italic text-xs">—</span>}
                      </td>

                      <td className="px-4 py-3.5 text-right tabular-nums text-slate-700">
                        {formatINR(s.total_procured)}
                      </td>

                      <td className="px-4 py-3.5 text-right tabular-nums text-slate-700">
                        {formatINR(s.total_paid)}
                      </td>

                      <td className="px-4 py-3.5 text-right tabular-nums font-semibold">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            balance > 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {formatINR(balance)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <Link
                            href={`/suppliers/${s.id}`}
                            className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            Statement
                            <svg className="h-3.5 w-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(s)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete supplier (Owner only)"
                              aria-label={`Delete supplier ${s.name}`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
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

