'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatINR, formatDate } from '@/lib/format'
import { RelatedRecordsPanel, RelatedRecordItem } from '@/components/common/RelatedRecordsPanel'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ContractRecord, ContractDocument, ContractDocumentType, CONTRACT_DOC_TYPES } from '@/lib/types/contract'
import { EditContractModal } from '@/components/contracts/EditContractModal'
import { UploadContractDocumentModal } from '@/components/contracts/UploadContractDocumentModal'
import { canManageContracts } from '@/lib/permissions'
import { ContractClause, ContractObligation } from '@/lib/types/contractClauses'
import { ContractClausesMasterView } from '@/components/contracts/ContractClausesMasterView'

interface ContractDetailClientProps {
  project: {
    id: string
    name: string
    agency_name?: string | null
    status: string
  }
  initialContract: ContractRecord | null
  initialDocuments: ContractDocument[]
  initialClauses?: ContractClause[]
  initialObligations?: ContractObligation[]
  userRole?: string | null
}

export function ContractDetailClient({
  project,
  initialContract,
  initialDocuments,
  initialClauses = [],
  initialObligations = [],
  userRole,
}: ContractDetailClientProps) {
  const [contract, setContract] = useState<ContractRecord | null>(initialContract)
  const [documents, setDocuments] = useState<ContractDocument[]>(initialDocuments)
  const [activeSection, setActiveSection] = useState<'overview' | 'dates' | 'securities' | 'clauses' | 'documents'>('overview')
  const [docFilter, setDocFilter] = useState<string>('All')
  const [docSearch, setDocSearch] = useState('')

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const isEditable = canManageContracts(userRole)

  // Calculate timeline progress
  const getTimelineMetrics = () => {
    if (!contract?.work_commencement_date || !contract?.current_completion_date) {
      return { totalDays: 0, daysElapsed: 0, daysRemaining: 0, pct: 0 }
    }
    const start = new Date(contract.work_commencement_date).getTime()
    const end = new Date(contract.current_completion_date).getTime()
    const now = new Date().getTime()
    const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)))
    const daysElapsed = Math.max(0, Math.round((now - start) / (1000 * 60 * 60 * 24)))
    const daysRemaining = Math.max(0, Math.round((end - now) / (1000 * 60 * 60 * 24)))
    const pct = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)))
    return { totalDays, daysElapsed, daysRemaining, pct }
  }

  const timeline = getTimelineMetrics()

  // Filtered documents
  const filteredDocuments = documents.filter(doc => {
    const matchesFilter = docFilter === 'All' || doc.document_type === docFilter
    const matchesSearch =
      !docSearch ||
      doc.title.toLowerCase().includes(docSearch.toLowerCase()) ||
      (doc.document_number && doc.document_number.toLowerCase().includes(docSearch.toLowerCase())) ||
      (doc.notes && doc.notes.toLowerCase().includes(docSearch.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link href="/projects" className="hover:text-slate-800 transition-colors">
              Projects
            </Link>
            <span>/</span>
            <Link href={`/projects/${project.id}`} className="hover:text-slate-800 transition-colors">
              {project.name}
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">Contract Master</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              {contract?.agreement_number || 'Contract Agreement'}
            </h1>
            <Badge
              label={contract?.status?.replace('_', ' ') || 'active'}
              variant={contract?.status === 'active' ? 'success' : 'neutral'}
            />
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {contract?.contract_type || 'Item Rate'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {contract?.employer_name || project.agency_name || 'Government Employer'} &bull; {contract?.contractor_name || 'Contractor'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setUploadModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Document
          </Button>

          {isEditable && (
            <Button
              size="sm"
              onClick={() => setEditModalOpen(true)}
              className="text-xs gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Contract Master
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Accepted Contract Value */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-xs text-slate-500 font-medium mb-1">Accepted Contract Value</p>
          <p className="text-lg font-bold text-slate-900 tabular-nums">
            {formatINR(contract?.awarded_amount || 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Est: <span className="font-mono">{formatINR(contract?.estimated_cost || 0)}</span>
          </p>
        </div>

        {/* Timeline Progress */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 font-medium">Stipulated Period</p>
            <span className="text-[11px] font-bold text-blue-600">{timeline.pct}% elapsed</span>
          </div>
          <p className="text-lg font-bold text-slate-900 tabular-nums">
            {timeline.daysRemaining > 0 ? `${timeline.daysRemaining} Days Left` : 'Period Completed'}
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                timeline.pct > 90 ? 'bg-rose-500' : timeline.pct > 70 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${timeline.pct}%` }}
            />
          </div>
        </div>

        {/* Security & Retention */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-xs text-slate-500 font-medium mb-1">Guarantees &amp; Retention</p>
          <p className="text-lg font-bold text-slate-900 tabular-nums">
            {formatINR(contract?.performance_security_amount || 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Retention: <span className="font-bold text-blue-700">{contract?.retention_percentage ?? 5}%</span> / bill
          </p>
        </div>

        {/* DLP Validity */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-xs text-slate-500 font-medium mb-1">Defect Liability Period</p>
          <p className="text-lg font-bold text-slate-900 tabular-nums">
            {contract?.dlp_months ? `${contract.dlp_months} Months` : '12 Months'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            End: {formatDate(contract?.dlp_end_date) || 'Post Completion'}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveSection('overview')}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
            activeSection === 'overview'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          General &amp; Parties
        </button>
        <button
          onClick={() => setActiveSection('dates')}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
            activeSection === 'dates'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Dates &amp; Milestones
        </button>
        <button
          onClick={() => setActiveSection('securities')}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
            activeSection === 'securities'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Securities &amp; Taxes
        </button>
        <button
          onClick={() => setActiveSection('clauses')}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
            activeSection === 'clauses'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          GCC, SCC &amp; Clauses
        </button>
        <button
          onClick={() => setActiveSection('documents')}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSection === 'documents'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Document &amp; Drawing Vault</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {documents.length}
          </span>
        </button>
      </div>

      {/* SECTION 1: Overview & Parties */}
      {activeSection === 'overview' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              1. Department &amp; Administrative Hierarchy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Department / Employer</span>
                <span className="font-bold text-slate-900">{contract?.employer_name || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Division</span>
                <span className="font-bold text-slate-900">{contract?.division || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Circle / Zone</span>
                <span className="font-bold text-slate-900">{contract?.circle || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Contracting Authority</span>
                <span className="font-bold text-slate-900">{contract?.contracting_authority || 'Executive Engineer'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Contractor Agency</span>
                <span className="font-bold text-slate-900">{contract?.contractor_name || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Contract Classification</span>
                <span className="font-bold text-slate-900">{contract?.contract_type || 'Item Rate'} &bull; {contract?.tender_type || 'Open Tender'}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              2. Formal Contract Identification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Agreement Number</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{contract?.agreement_number || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Work Order Reference</span>
                <span className="font-bold text-slate-900 font-mono">{contract?.work_order_number || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">NIT / Tender Reference</span>
                <span className="font-bold text-slate-900 font-mono">{contract?.nit_number || '—'}</span>
              </div>
            </div>
            {contract?.contract_title && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mt-3 text-xs">
                <span className="text-slate-500 block mb-0.5">Package Scope / Descriptive Title</span>
                <span className="font-medium text-slate-900">{contract.contract_title}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: Dates & Milestones */}
      {activeSection === 'dates' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              Execution Timeline &amp; Statutory Milestone Dates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Award / LOA Date</span>
                <span className="font-bold text-slate-900">{formatDate(contract?.award_date) || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Agreement Signing Date</span>
                <span className="font-bold text-slate-900">{formatDate(contract?.agreement_date) || '—'}</span>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100">
                <span className="text-blue-700 font-semibold block mb-0.5">Work Commencement (SDOS)</span>
                <span className="font-bold text-slate-900">{formatDate(contract?.work_commencement_date) || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Original Completion (SDOC)</span>
                <span className="font-bold text-slate-900">{formatDate(contract?.original_completion_date) || '—'}</span>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
                <span className="text-amber-800 font-semibold block mb-0.5">Current Extended Completion</span>
                <span className="font-bold text-slate-900">{formatDate(contract?.current_completion_date) || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Original Contract Period</span>
                <span className="font-bold text-slate-900">
                  {contract?.original_contract_period_months ? `${contract.original_contract_period_months} Months` : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              Defect Liability Period (DLP)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">DLP Duration</span>
                <span className="font-bold text-slate-900">{contract?.dlp_months ? `${contract.dlp_months} Months` : '12 Months'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">DLP Start Date</span>
                <span className="font-bold text-slate-900">{formatDate(contract?.dlp_start_date) || 'Post Actual Completion'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">DLP Scheduled End Date</span>
                <span className="font-bold text-slate-900">{formatDate(contract?.dlp_end_date) || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Securities & Taxes */}
      {activeSection === 'securities' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              Guarantees, Deposits &amp; Withholdings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Earnest Money Deposit (EMD)</span>
                <span className="font-bold text-slate-900 tabular-nums">{formatINR(contract?.earnest_money_deposit || 0)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Performance Security (PBG)</span>
                <span className="font-bold text-slate-900 tabular-nums">{formatINR(contract?.performance_security_amount || 0)} ({contract?.performance_security_percent || 5}%)</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Total Security Deposit (SD)</span>
                <span className="font-bold text-slate-900 tabular-nums">{formatINR(contract?.security_deposit_amount || 0)} ({contract?.security_deposit_percent || 2.5}%)</span>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100">
                <span className="text-blue-700 font-semibold block mb-0.5">Retention per RA Bill</span>
                <span className="font-bold text-blue-900 text-sm">{contract?.retention_percentage || 5}% Withheld</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              GST &amp; Statutory Tax Regimes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Contractor GSTIN</span>
                <span className="font-bold text-slate-900 font-mono">{contract?.contractor_gstin || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Employer GSTIN</span>
                <span className="font-bold text-slate-900 font-mono">{contract?.employer_gstin || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">GST Rate Applicable</span>
                <span className="font-bold text-slate-900">{contract?.gst_rate_percent || 18}%</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block mb-0.5">GST Pricing Treatment</span>
                <span className="font-bold text-slate-900 capitalize">{contract?.gst_treatment || 'exclusive'} of GST</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: Contract Clauses & Obligations Master */}
      {activeSection === 'clauses' && contract && (
        <ContractClausesMasterView
          contract={contract}
          existingDocuments={documents}
          initialClauses={initialClauses}
          initialObligations={initialObligations}
          onContractUpdated={updated => setContract(updated)}
        />
      )}

      {/* SECTION 5: Document & Drawing Repository */}
      {activeSection === 'documents' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                onClick={() => setDocFilter('All')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  docFilter === 'All' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({documents.length})
              </button>
              {CONTRACT_DOC_TYPES.map(type => {
                const count = documents.filter(d => d.document_type === type).length
                if (count === 0 && docFilter !== type) return null
                return (
                  <button
                    key={type}
                    onClick={() => setDocFilter(type)}
                    className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                      docFilter === type ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {type} ({count})
                  </button>
                )
              })}
            </div>

            <div className="relative min-w-[200px]">
              <input
                type="text"
                placeholder="Search documents or drawings..."
                value={docSearch}
                onChange={e => setDocSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Document List */}
          {filteredDocuments.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-slate-800">No documents found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload formal contract agreements, work orders, approved drawings, specifications, NIT, or letters.
              </p>
              <Button size="sm" onClick={() => setUploadModalOpen(true)}>
                Upload Document Now
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredDocuments.map(doc => (
                <div
                  key={doc.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                        {doc.document_type}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(doc.issue_date || doc.created_at)}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {doc.title}
                    </h4>

                    {doc.document_number && (
                      <p className="text-[11px] text-slate-500 font-mono">
                        Ref: {doc.document_number}
                      </p>
                    )}

                    {doc.notes && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {doc.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
                    <span className="text-[11px] text-slate-400">
                      {doc.file_size_bytes ? `${(doc.file_size_bytes / 1024).toFixed(0)} KB` : 'Attached Document'}
                    </span>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800"
                    >
                      <span>View File</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* UNIFIED RELATED RECORDS & TRACEABILITY AUDIT TRAIL */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <RelatedRecordsPanel
          title="Contract Master Traceability & Linked Enterprise Modules"
          description="Unified relationships connecting the Contract Agreement to execution, billing, and delay defense."
          records={[
            {
              id: project.id,
              type: 'project' as const,
              title: project.name,
              subtitle: project.agency_name ? `Employer: ${project.agency_name}` : undefined,
              amount: contract?.awarded_amount || null,
              href: `/projects/${project.id}`,
            },
            {
              id: `boq-${project.id}`,
              type: 'boq' as const,
              title: 'Schedule of Quantities (BOQ Master)',
              subtitle: 'Authoritative item-rate schedule & specifications',
              status: 'BOQ',
              href: `/projects/${project.id}/boq`,
            },
            {
              id: `emb-${project.id}`,
              type: 'measurement' as const,
              title: 'Electronic Measurement Books (e-MB)',
              subtitle: 'Contemporary site measurements & test checks',
              status: 'e-MB',
              href: `/measurement?projectId=${project.id}`,
            },
            {
              id: `ra-${project.id}`,
              type: 'ra_bill' as const,
              title: 'Running Account (RA) Bills',
              subtitle: 'Submitted, certified, and passed contractor bills',
              status: 'RA BILLS',
              href: `/ledgers/ra-bills?projectId=${project.id}`,
            },
            {
              id: `var-${project.id}`,
              type: 'variation' as const,
              title: 'Clause 12 Variations & Deviations',
              subtitle: 'Sanctioned quantity variations, extra & substituted items',
              status: 'VARIATIONS',
              href: `/variations?projectId=${project.id}`,
            },
            {
              id: `events-${project.id}`,
              type: 'event' as const,
              title: 'Contract Events & Site Hindrances (Appx 21)',
              subtitle: 'Contemporaneous site delay records & notice tracking',
              status: 'DEFENSE',
              href: `/hindrances?projectId=${project.id}`,
            },
            {
              id: `eot-${project.id}`,
              type: 'eot' as const,
              title: 'Extension of Time (EOT / Form 27)',
              subtitle: 'Statutory delay justifications and completion date revisions',
              status: 'EOT',
              href: `/eot?projectId=${project.id}`,
            },
            {
              id: `claims-${project.id}`,
              type: 'claim' as const,
              title: 'Contractual Claims & Disputes',
              subtitle: 'Idle machinery, prolongation overheads, and price escalation',
              status: 'CLAIMS',
              href: `/claims?projectId=${project.id}`,
            },
            {
              id: `evidence-${project.id}`,
              type: 'evidence' as const,
              title: 'Evidence Vault Repository',
              subtitle: 'Contemporaneous site photos, test results, and correspondence',
              status: 'EVIDENCE',
              href: `/evidence?projectId=${project.id}`,
            },
            {
              id: `security-${project.id}`,
              type: 'security' as const,
              title: 'Bank Guarantees, EMD & Security Deposit',
              subtitle: `Retention: ${contract?.retention_percentage || 5}% • Performance Security: ₹${contract?.performance_security_amount || 0}`,
              status: 'SECURITY',
              href: `/projects/${project.id}/contract`,
            },
            {
              id: `ledger-${project.id}`,
              type: 'payment' as const,
              title: 'Contractor Financial Ledger',
              subtitle: 'Realized bill payments, TDS deductions & bank receipts',
              status: 'LEDGER',
              href: `/ledgers?projectId=${project.id}`,
            },
          ]}
        />
      </div>

      {/* Edit Contract Master Modal */}
      {contract && (
        <EditContractModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          contract={contract}
          projectId={project.id}
          onSaved={updated => setContract(updated)}
        />
      )}

      {/* Upload Contract Document Modal */}
      {contract && (
        <UploadContractDocumentModal
          open={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          contractId={contract.id}
          projectId={project.id}
          onUploaded={newDoc => setDocuments(prev => [newDoc, ...prev])}
        />
      )}
    </div>
  )
}
