'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatINR, formatDate } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { BOQItem } from '@/lib/types/boq'
import { ContractRecord } from '@/lib/types/contract'
import {
  MeasurementBook,
  MeasurementEntry,
  MeasurementAdjustment,
  MeasurementDocument,
  MeasurementCertificate,
  MeasurementStatus,
} from '@/lib/types/measurement'
import {
  buildAbstractOfMeasurements,
  formatChainage,
} from '@/lib/calculations/measurement'
import { NewMeasurementEntryModal } from '@/components/measurement/NewMeasurementEntryModal'
import { MeasurementAdjustmentModal } from '@/components/measurement/MeasurementAdjustmentModal'
import { NewMeasurementBookModal } from '@/components/measurement/NewMeasurementBookModal'
import { NewMeasurementCertificateModal } from '@/components/measurement/NewMeasurementCertificateModal'
import { MeasurementPrintSheet } from '@/components/measurement/MeasurementPrintSheet'
import { MeasurementDetailModal } from '@/components/measurement/MeasurementDetailModal'

interface MeasurementClientProps {
  projects: {
    id: string
    name: string
    agency_name?: string | null
    awarded_amount: number
  }[]
  contracts: ContractRecord[]
  boqItems: BOQItem[]
  measurementBooks: MeasurementBook[]
  initialEntries: MeasurementEntry[]
  adjustments: MeasurementAdjustment[]
  documents: MeasurementDocument[]
  certificates: MeasurementCertificate[]
  userRole?: string | null
}

type TabType =
  | 'overview'
  | 'books'
  | 'register'
  | 'progress'
  | 'abstract'
  | 'certificates'
  | 'documents'
  | 'history'

export function MeasurementClient({
  projects,
  contracts,
  boqItems,
  measurementBooks: initialBooks,
  initialEntries,
  adjustments: initialAdjustments,
  documents: initialDocuments,
  certificates: initialCertificates,
  userRole,
}: MeasurementClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  // Selected Project Filter
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '')

  // Tab
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Live collections
  const [books, setBooks] = useState<MeasurementBook[]>(initialBooks)
  const [entries, setEntries] = useState<MeasurementEntry[]>(initialEntries)
  const [adjustments, setAdjustments] = useState<MeasurementAdjustment[]>(initialAdjustments)
  const [documents, setDocuments] = useState<MeasurementDocument[]>(initialDocuments)
  const [certificates, setCertificates] = useState<MeasurementCertificate[]>(initialCertificates)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [bookFilter, setBookFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [bookModalOpen, setBookModalOpen] = useState(false)
  const [certModalOpen, setCertModalOpen] = useState(false)
  const [adjModalOpen, setAdjModalOpen] = useState(false)
  const [adjustingEntry, setAdjustingEntry] = useState<MeasurementEntry | null>(null)
  const [printMode, setPrintMode] = useState<'register' | 'abstract' | null>(null)
  const [inspectingEntry, setInspectingEntry] = useState<MeasurementEntry | null>(null)

  // Filtered context
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || projects[0]
  }, [projects, selectedProjectId])

  const projectContracts = useMemo(() => {
    return contracts.filter(c => c.project_id === selectedProjectId)
  }, [contracts, selectedProjectId])

  const projectBOQ = useMemo(() => {
    return boqItems.filter(b => b.project_id === selectedProjectId)
  }, [boqItems, selectedProjectId])

  const projectBooks = useMemo(() => {
    return books.filter(b => b.project_id === selectedProjectId)
  }, [books, selectedProjectId])

  const projectEntries = useMemo(() => {
    return entries.filter(e => e.project_id === selectedProjectId)
  }, [entries, selectedProjectId])

  const projectAdjustments = useMemo(() => {
    return adjustments.filter(a => a.project_id === selectedProjectId)
  }, [adjustments, selectedProjectId])

  const projectDocuments = useMemo(() => {
    return documents.filter(d => d.project_id === selectedProjectId)
  }, [documents, selectedProjectId])

  const projectCertificates = useMemo(() => {
    return certificates.filter(c => c.project_id === selectedProjectId)
  }, [certificates, selectedProjectId])

  // Abstract of Measurements calculation
  const abstractItems = useMemo(() => {
    return buildAbstractOfMeasurements(projectBOQ, projectEntries)
  }, [projectBOQ, projectEntries])

  // Dashboard Aggregates
  const stats = useMemo(() => {
    const totalEntries = projectEntries.length
    const draftCount = projectEntries.filter(e => e.status === 'DRAFT').length
    const submittedCount = projectEntries.filter(e => e.status === 'SUBMITTED').length
    const checkedCount = projectEntries.filter(e => e.status === 'CHECKED').length
    const certifiedCount = projectEntries.filter(e => e.status === 'CERTIFIED').length
    const overrunsCount = projectEntries.filter(e => e.is_exceeded).length

    const measuredValue = abstractItems.reduce((acc, i) => acc + i.cumulative_amount, 0)
    const certifiedValue = abstractItems.reduce((acc, i) => acc + i.certified_amount, 0)

    return {
      totalEntries,
      draftCount,
      submittedCount,
      checkedCount,
      certifiedCount,
      overrunsCount,
      measuredValue,
      certifiedValue,
    }
  }, [projectEntries, abstractItems])

  // Filtered Register Entries
  const filteredEntries = useMemo(() => {
    return projectEntries.filter(e => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      if (bookFilter !== 'all' && e.measurement_book_id !== bookFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const descMatch = e.description?.toLowerCase().includes(q)
        const itemMatch = e.boq_items?.item_number?.toLowerCase().includes(q)
        const numMatch = e.entry_number?.toLowerCase().includes(q)
        const locMatch = e.location?.toLowerCase().includes(q)
        if (!descMatch && !itemMatch && !numMatch && !locMatch) return false
      }
      return true
    })
  }, [projectEntries, statusFilter, bookFilter, searchQuery])

  // Fast inline status updater
  const handleUpdateStatus = async (entryId: string, newStatus: MeasurementStatus) => {
    try {
      const { data: updated, error } = await supabase
        .from('measurement_entries')
        .update({
          status: newStatus,
          checked_at: newStatus === 'CHECKED' ? new Date().toISOString() : undefined,
          certified_at: newStatus === 'CERTIFIED' ? new Date().toISOString() : undefined,
        })
        .eq('id', entryId)
        .select('*, boq_items:boq_item_id(*)')
        .single()

      if (error) throw error

      setEntries(prev => prev.map(e => (e.id === entryId ? (updated as MeasurementEntry) : e)))
      toast.showToast(`Measurement entry status updated to ${newStatus}.`, 'success')
    } catch (err: any) {
      console.error('Failed to update status:', err)
      toast.showToast(err.message || 'Status transition failed.', 'error')
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar / Project Selector & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 5v4m4-4v2m4-2v4m4-4v2" />
              </svg>
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Electronic Measurement Book (e-MB)</h1>
              <p className="text-xs text-slate-500">
                Statutory Government Public Works Measurement, Level Books, and Abstract System
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Project Switcher */}
          <div className="w-64">
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setBookModalOpen(true)}
            className="text-xs h-9 border-slate-300 hover:bg-slate-50"
          >
            + Allot e-MB Volume
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setEntryModalOpen(true)}
            className="text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
          >
            + Record Measurement
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-semibold">
        {[
          { id: 'overview', label: 'Dashboard & Lifecycle' },
          { id: 'books', label: `Measurement Books (${projectBooks.length})` },
          { id: 'register', label: `Measurement Register (${projectEntries.length})` },
          { id: 'progress', label: `BOQ Item Progress (${projectBOQ.length})` },
          { id: 'abstract', label: 'Abstract of Measurements' },
          { id: 'certificates', label: `Certificates (${projectCertificates.length})` },
          { id: 'documents', label: `Evidence & Photos (${projectDocuments.length})` },
          { id: 'history', label: `Audit Trail (${projectAdjustments.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Cumulative Measured Value</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">{formatINR(stats.measuredValue)}</p>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                <span>Total Recorded Entries:</span>
                <span className="font-semibold text-slate-800">{stats.totalEntries}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Certified Value (EE)</span>
                <p className="text-xl font-bold font-mono text-emerald-700 mt-1">{formatINR(stats.certifiedValue)}</p>
                <div className="mt-2 text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                  <span>{stats.certifiedCount} Certified Entries</span>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/ledgers/ra-bills?projectId=${currentProject.id}`}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Bill in RA Bill &rarr;
                </Link>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Allotted e-MB Books</span>
              <p className="text-xl font-bold font-mono text-indigo-700 mt-1">{projectBooks.length} Volumes</p>
              <div className="mt-2 text-[11px] text-slate-500">
                Across division &amp; field engineers
              </div>
            </div>

            <div className={`p-4 rounded-2xl border shadow-sm ${
              stats.overrunsCount > 0
                ? 'bg-rose-50/50 border-rose-200 text-rose-900'
                : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <span className="text-[11px] font-bold uppercase tracking-wider block">Overruns / Excess Items</span>
              <p className={`text-xl font-bold font-mono mt-1 ${stats.overrunsCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {stats.overrunsCount} Warnings
              </p>
              <div className="mt-2 text-[11px]">
                {stats.overrunsCount > 0 ? 'Exceeds BOQ limit (requires deviation)' : '100% within contractual limits'}
              </div>
            </div>
          </div>

          {/* e-MB Verification Lifecycle Funnel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Statutory e-MB Measurement Verification Funnel</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">1. Drafts</span>
                  <span className="text-xs font-mono font-bold bg-slate-200 px-2 py-0.5 rounded-full">{stats.draftCount}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Under preparation by site surveyor</p>
              </div>

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-900">2. Submitted</span>
                  <span className="text-xs font-mono font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">{stats.submittedCount}</span>
                </div>
                <p className="text-[11px] text-blue-800/80 mt-1">Pending Field Inspection / AE Check</p>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-900">3. Checked (AE)</span>
                  <span className="text-xs font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">{stats.checkedCount}</span>
                </div>
                <p className="text-[11px] text-amber-800/80 mt-1">Verified on site &amp; ready for certification</p>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-900">4. Certified (EE)</span>
                  <span className="text-xs font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">{stats.certifiedCount}</span>
                </div>
                <p className="text-[11px] text-emerald-800/80 mt-1">Legally locked &amp; ready for RA Bill inclusion</p>
              </div>
            </div>
          </div>

          {/* Quick Abstract Summary & Recent Entries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* BOQ Progress Snapshot */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Top BOQ Items Progress</h3>
                <button
                  onClick={() => setActiveTab('progress')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  View All ({projectBOQ.length}) &rarr;
                </button>
              </div>
              <div className="space-y-3">
                {abstractItems.slice(0, 5).map(item => {
                  const pct = item.contract_quantity > 0
                    ? Math.min(100, Math.round((item.cumulative_quantity / item.contract_quantity) * 100))
                    : 0
                  return (
                    <div key={item.boq_item_id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">Item {item.item_number}: {item.description.slice(0, 40)}...</span>
                        <span className="font-mono font-bold text-slate-700">{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full rounded-full ${item.is_exceeded ? 'bg-rose-500' : 'bg-indigo-600'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                        <span>Measured: {item.cumulative_quantity} {item.unit}</span>
                        <span>Contract: {item.contract_quantity} {item.unit}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick Actions & Department Compliance */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Department Public Works Compliance (e-MB)</h3>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-slate-700">
                <p className="font-semibold text-slate-900">CPWD / State PWD Rules on Measurement Books</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                  <li>Measurements must be entered in ink or digitally signed e-MB without silent erasures.</li>
                  <li>Assistant Engineers must test-check at least 50% and Executive Engineers at least 10% value.</li>
                  <li>Overrun entries beyond contractual quantity must be covered by a formal Deviation/Variation Order.</li>
                  <li>Certified measurements are immutable; adjustments must be documented through audit memos.</li>
                </ul>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setPrintMode('abstract')
                  }}
                  className="w-full text-xs"
                >
                  Print Abstract Sheet (CPWD Form 26)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setPrintMode('register')
                  }}
                  className="w-full text-xs"
                >
                  Print Full e-MB Register
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEASUREMENT BOOKS (e-MB REGISTER) */}
      {activeTab === 'books' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Allotted Measurement Books (e-MB Volumes)</h2>
              <p className="text-xs text-slate-500">Physical and Electronic Registers registered for this project</p>
            </div>
            <Button size="sm" variant="primary" onClick={() => setBookModalOpen(true)}>
              + Allot New Book
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projectBooks.map(book => {
              const bookEntries = projectEntries.filter(e => e.measurement_book_id === book.id)
              const maxPage = bookEntries.reduce((max, e) => Math.max(max, e.page_number || 1), 1)

              return (
                <div key={book.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-sm text-slate-900 block">{book.book_number}</span>
                      <h4 className="text-xs font-semibold text-slate-700 mt-0.5">{book.title}</h4>
                    </div>
                    <Badge
                      label={book.status}
                      variant={book.status === 'ACTIVE' ? 'success' : 'neutral'}
                    />
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">In-Charge:</span>
                      <span className="font-medium text-slate-800">{book.issued_to_name || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Designation:</span>
                      <span className="text-slate-700">{book.issued_to_designation || 'Field Eng'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Division:</span>
                      <span className="text-slate-700">{book.division || '—'}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 font-mono">
                      <span className="text-slate-500">Page Utilization:</span>
                      <span className="font-bold text-slate-900">{maxPage} / {book.total_pages} Pages</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500 font-medium">{bookEntries.length} Recorded Entries</span>
                    <button
                      onClick={() => {
                        setBookFilter(book.id)
                        setActiveTab('register')
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      View Entries &rarr;
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 3: MEASUREMENT REGISTER */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search description, item #, entry #, location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="CHECKED">Checked (AE)</option>
                <option value="CERTIFIED">Certified (EE)</option>
              </select>

              <select
                value={bookFilter}
                onChange={e => setBookFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-700 focus:outline-none"
              >
                <option value="all">All e-MB Volumes</option>
                {projectBooks.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.book_number}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPrintMode('register')}>
                Print Register
              </Button>
              <Button size="sm" variant="primary" onClick={() => setEntryModalOpen(true)}>
                + New Entry
              </Button>
            </div>
          </div>

          {/* Register Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Entry # / Date</th>
                    <th className="p-3">BOQ Item &amp; Details</th>
                    <th className="p-3">Location / Chainage</th>
                    <th className="p-3 text-right">Dimensions (Nos × L × B × D)</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No measurement entries found matching filters. Record a new measurement entry.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map(entry => {
                      const isCertified = entry.status === 'CERTIFIED'
                      const isChecked = entry.status === 'CHECKED'

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3">
                            <span className="font-mono font-bold text-slate-900 block">{entry.entry_number}</span>
                            <span className="text-[11px] text-slate-500">{formatDate(entry.measurement_date)}</span>
                            {entry.page_number && (
                              <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded ml-1 font-mono">
                                p.{entry.page_number}
                              </span>
                            )}
                          </td>
                          <td className="p-3 max-w-xs">
                            <span className="font-bold text-slate-900 block">
                              {entry.boq_items?.item_number}: {entry.boq_items?.description?.slice(0, 45)}...
                            </span>
                            <span className="text-slate-500 text-[11px] block mt-0.5">{entry.description}</span>
                            {entry.is_exceeded && (
                              <span className="inline-block mt-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                Overrun ({entry.deviation_order_type || 'Exceeded'})
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-slate-800 block">{entry.location || '—'}</span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {formatChainage(entry.chainage_km, entry.chainage_m)}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-[11px]">
                            {entry.calculation_mode === 'manual' ? (
                              <span className="text-slate-500">Manual Direct</span>
                            ) : (
                              <span>
                                {entry.number_of_units || 1} × {entry.length || 0} × {entry.breadth || 0} × {entry.depth_height || 0}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-mono font-bold text-slate-900 block">
                              {entry.calculated_quantity} {entry.unit}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Cum: {entry.cumulative_quantity}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              label={entry.status}
                              variant={
                                entry.status === 'CERTIFIED'
                                  ? 'success'
                                  : entry.status === 'CHECKED'
                                  ? 'warning'
                                  : entry.status === 'SUBMITTED'
                                  ? 'default'
                                  : 'neutral'
                              }
                            />
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <button
                              onClick={() => setInspectingEntry(entry)}
                              className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-semibold"
                            >
                              Inspect
                            </button>
                            {isCertified ? (
                              <button
                                onClick={() => {
                                  setAdjustingEntry(entry)
                                  setAdjModalOpen(true)
                                }}
                                className="px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 text-[11px] font-semibold"
                              >
                                Record Adjustment
                              </button>
                            ) : isChecked ? (
                              <button
                                onClick={() => handleUpdateStatus(entry.id, 'CERTIFIED')}
                                className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 text-[11px] font-semibold"
                              >
                                Certify (EE)
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(entry.id, 'CHECKED')}
                                className="px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-300 hover:bg-blue-100 text-[11px] font-semibold"
                              >
                                Check (AE)
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BOQ ITEM PROGRESS */}
      {activeTab === 'progress' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Contract BOQ vs Measured vs Balance</h3>
              <p className="text-xs text-slate-500">Live quantity ledger derived from active e-MB records</p>
            </div>
            <Link
              href={`/projects/${currentProject.id}/boq`}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Open BOQ Master &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Item #</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-center">Unit</th>
                  <th className="p-3 text-right">Contract Qty</th>
                  <th className="p-3 text-right">Cumulative Measured</th>
                  <th className="p-3 text-right">Certified Qty</th>
                  <th className="p-3 text-right">Balance Qty</th>
                  <th className="p-3 text-center w-36">Execution Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {abstractItems.map(item => {
                  const pct = item.contract_quantity > 0
                    ? Math.round((item.cumulative_quantity / item.contract_quantity) * 100)
                    : 0

                  return (
                    <tr key={item.boq_item_id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-slate-900">{item.item_number}</td>
                      <td className="p-3 max-w-md font-medium text-slate-800">
                        {item.description}
                        {item.is_exceeded && (
                          <span className="block text-[10px] text-rose-700 font-bold uppercase mt-0.5">
                            * Overrun: Exceeds Contract Quantity
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">{item.unit}</td>
                      <td className="p-3 text-right font-mono font-semibold">{item.contract_quantity}</td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-700">{item.cumulative_quantity}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">{item.certified_quantity}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        <span className={item.balance_quantity < 0 ? 'text-rose-600' : 'text-slate-900'}>
                          {item.balance_quantity}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.is_exceeded ? 'bg-rose-500' : 'bg-emerald-600'}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-bold text-slate-700 w-10 text-right">{pct}%</span>
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

      {/* TAB 5: ABSTRACT OF MEASUREMENTS */}
      {activeTab === 'abstract' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Official Abstract of Measurements (CPWD / PWD Format)</h3>
              <p className="text-xs text-slate-500">Summary bill of quantities executed and certified for invoicing</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/ledgers/ra-bills?projectId=${currentProject.id}`}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                + Prepare RA Bill
              </Link>
              <Button size="sm" variant="secondary" onClick={() => setCertModalOpen(true)}>
                + Issue Measurement Certificate
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setPrintMode('abstract')}>
                Print / Export Abstract
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 text-center">Item #</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-center">Unit</th>
                    <th className="p-3 text-right">Contract Qty</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">Measured Qty</th>
                    <th className="p-3 text-right">Measured Amount</th>
                    <th className="p-3 text-right">Certified Qty</th>
                    <th className="p-3 text-right">Certified Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {abstractItems.map(item => (
                    <tr key={item.boq_item_id} className="hover:bg-slate-50/70">
                      <td className="p-3 text-center font-mono font-bold text-slate-900">{item.item_number}</td>
                      <td className="p-3 font-medium text-slate-800">{item.description}</td>
                      <td className="p-3 text-center">{item.unit}</td>
                      <td className="p-3 text-right font-mono">{item.contract_quantity}</td>
                      <td className="p-3 text-right font-mono">{formatINR(item.contract_rate)}</td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-700">{item.cumulative_quantity}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{formatINR(item.cumulative_amount)}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">{item.certified_quantity}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-800">{formatINR(item.certified_amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                  <tr>
                    <td colSpan={6} className="p-3 text-right uppercase">Total Abstract Value:</td>
                    <td className="p-3 text-right font-mono text-indigo-900">
                      {formatINR(abstractItems.reduce((acc, i) => acc + i.cumulative_amount, 0))}
                    </td>
                    <td></td>
                    <td className="p-3 text-right font-mono text-emerald-900">
                      {formatINR(abstractItems.reduce((acc, i) => acc + i.certified_amount, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: MEASUREMENT CERTIFICATES */}
      {activeTab === 'certificates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Official Measurement Certificates</h3>
              <p className="text-xs text-slate-500">Statutory compliance certificates issued by authorized engineers</p>
            </div>
            <Button size="sm" variant="primary" onClick={() => setCertModalOpen(true)}>
              + Issue Certificate
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectCertificates.length === 0 ? (
              <div className="col-span-2 p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No measurement certificates issued yet. Issue a certificate for checked entries.
              </div>
            ) : (
              projectCertificates.map(cert => (
                <div key={cert.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-sm text-slate-900">{cert.certificate_number}</span>
                      <p className="text-xs text-slate-500 mt-0.5">Date: {formatDate(cert.certificate_date)}</p>
                    </div>
                    <Badge label={cert.status} variant="success" />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Period:</span>
                      <span className="font-medium text-slate-800">{formatDate(cert.period_from)} to {formatDate(cert.period_to)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Items Certified:</span>
                      <span className="font-bold text-slate-800">{cert.total_items_measured} Items</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Certified Amount:</span>
                      <span className="font-mono font-bold text-emerald-700">{formatINR(cert.total_certified_value)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Authorized Signatory:</span>
                      <span className="font-medium text-slate-900">{cert.certified_by_name} ({cert.certified_by_designation || 'EE'})</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 italic bg-amber-50/50 p-2.5 rounded-lg border border-amber-200">
                    &ldquo;{cert.statutory_declaration}&rdquo;
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 7: EVIDENCE VAULT */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Measurement Evidence &amp; Level Sheets Vault</h3>
              <p className="text-xs text-slate-500">Photos, cross-sections, level sheets, and test check inspection memos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projectDocuments.length === 0 ? (
              <div className="col-span-3 p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No supporting documents or site inspection photos uploaded yet.
              </div>
            ) : (
              projectDocuments.map(doc => (
                <div key={doc.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate">{doc.file_name}</span>
                    <Badge label={doc.document_category} variant="neutral" />
                  </div>
                  {doc.caption && <p className="text-xs text-slate-600">{doc.caption}</p>}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <span>Uploaded {formatDate(doc.created_at)}</span>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      View &rarr;
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 8: AUDIT TRAIL / ADJUSTMENT HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Immutable Measurement Adjustment &amp; Reversal Audit Log</h3>
            <p className="text-xs text-slate-500">Permanent record of all modifications, EE 10% test-check reductions, and corrections</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Timestamp / Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Previous Qty</th>
                  <th className="p-3 text-right">Adjusted Qty</th>
                  <th className="p-3 text-right">Net Difference</th>
                  <th className="p-3">Authorizing Officer</th>
                  <th className="p-3">Official Reason / Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No adjustments or reversals recorded. All certified measurements remain intact and unaltered.
                    </td>
                  </tr>
                ) : (
                  projectAdjustments.map(adj => (
                    <tr key={adj.id} className="hover:bg-slate-50/70">
                      <td className="p-3 text-slate-500">{formatDate(adj.created_at)}</td>
                      <td className="p-3">
                        <Badge
                          label={adj.adjustment_type}
                          variant={adj.adjustment_type.includes('reduction') ? 'danger' : 'warning'}
                        />
                      </td>
                      <td className="p-3 text-right font-mono">{adj.previous_quantity}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{adj.adjusted_quantity}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        <span className={adj.difference_quantity < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {adj.difference_quantity > 0 ? `+${adj.difference_quantity}` : adj.difference_quantity}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{adj.authorized_by}</td>
                      <td className="p-3 text-slate-600 max-w-sm">{adj.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {entryModalOpen && (
        <NewMeasurementEntryModal
          open={entryModalOpen}
          onClose={() => setEntryModalOpen(false)}
          projectId={selectedProjectId}
          contractId={projectContracts[0]?.id}
          measurementBooks={projectBooks}
          boqItems={projectBOQ}
          existingEntries={projectEntries}
          onSuccess={newEntry => {
            setEntries(prev => [newEntry, ...prev])
          }}
        />
      )}

      {bookModalOpen && (
        <NewMeasurementBookModal
          open={bookModalOpen}
          onClose={() => setBookModalOpen(false)}
          projectId={selectedProjectId}
          contractId={projectContracts[0]?.id}
          onSuccess={newBook => {
            setBooks(prev => [newBook, ...prev])
          }}
        />
      )}

      {certModalOpen && (
        <NewMeasurementCertificateModal
          open={certModalOpen}
          onClose={() => setCertModalOpen(false)}
          projectId={selectedProjectId}
          contractId={projectContracts[0]?.id}
          checkedEntries={projectEntries}
          onSuccess={newCert => {
            setCertificates(prev => [newCert, ...prev])
            setEntries(prev =>
              prev.map(e => (e.status === 'CHECKED' || e.status === 'SUBMITTED' ? { ...e, status: 'CERTIFIED' } : e)),
            )
          }}
        />
      )}

      {adjModalOpen && adjustingEntry && (
        <MeasurementAdjustmentModal
          open={adjModalOpen}
          onClose={() => {
            setAdjModalOpen(false)
            setAdjustingEntry(null)
          }}
          entry={adjustingEntry}
          onSuccess={(updatedEntry, adjustment) => {
            setEntries(prev => prev.map(e => (e.id === updatedEntry.id ? updatedEntry : e)))
            setAdjustments(prev => [adjustment, ...prev])
          }}
        />
      )}

      
      {/* Measurement Detail & Related Records Modal */}
      {inspectingEntry && (
        <MeasurementDetailModal
          entry={inspectingEntry}
          isOpen={!!inspectingEntry}
          onClose={() => setInspectingEntry(null)}
          boqItem={boqItems.find(b => b.id === inspectingEntry.boq_item_id) || null}
          project={projects.find(p => p.id === inspectingEntry.project_id) || null}
          contract={contracts.find(c => c.id === inspectingEntry.contract_id) || null}
        />
      )}

      {printMode && currentProject && (
        <MeasurementPrintSheet
          project={currentProject}
          measurementBook={projectBooks[0]}
          entries={filteredEntries}
          abstractItems={abstractItems}
          mode={printMode}
          onClose={() => setPrintMode(null)}
        />
      )}
    </div>
  )
}
