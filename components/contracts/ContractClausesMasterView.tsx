'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import {
  ContractClause,
  ContractObligation,
  ClauseCategory,
  ClauseStatus,
  CLAUSE_CATEGORY_CONFIG,
  ALL_CLAUSE_CATEGORIES,
} from '@/lib/types/contractClauses'
import { ContractRecord, ContractDocument } from '@/lib/types/contract'
import {
  filterContractClauses,
  aggregateClauseMetrics,
  aggregateObligationMetrics,
  isClauseApprovedForDeadlines,
} from '@/lib/calculations/contractClauses'
import { ClauseStatusBadge } from './ClauseStatusBadge'
import { NewClauseModal } from './NewClauseModal'
import { AIClauseExtractionModal } from './AIClauseExtractionModal'
import { ClauseDetailModal } from './ClauseDetailModal'
import { formatDate } from '@/lib/format'

interface ContractClausesMasterViewProps {
  contract: ContractRecord
  existingDocuments: ContractDocument[]
  initialClauses: ContractClause[]
  initialObligations?: ContractObligation[]
  onContractUpdated?: (updatedContract: ContractRecord) => void
}

export function ContractClausesMasterView({
  contract,
  existingDocuments,
  initialClauses,
  initialObligations = [],
  onContractUpdated,
}: ContractClausesMasterViewProps) {
  const [clauses, setClauses] = useState<ContractClause[]>(initialClauses)
  const [obligations, setObligations] = useState<ContractObligation[]>(initialObligations)

  const [activeTab, setActiveTab] = useState<'clauses' | 'obligations'>('clauses')
  const [categoryFilter, setCategoryFilter] = useState<ClauseCategory | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<ClauseStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [eotOnly, setEotOnly] = useState(false)
  const [ldOnly, setLdOnly] = useState(false)
  const [escalationOnly, setEscalationOnly] = useState(false)
  const [variationOnly, setVariationOnly] = useState(false)
  const [noticePeriodOnly, setNoticePeriodOnly] = useState(false)

  const [newClauseModalOpen, setNewClauseModalOpen] = useState(false)
  const [clauseToEdit, setClauseToEdit] = useState<ContractClause | null>(null)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [selectedClause, setSelectedClause] = useState<ContractClause | null>(null)

  const clauseMetrics = useMemo(() => aggregateClauseMetrics(clauses), [clauses])
  const obligationMetrics = useMemo(() => aggregateObligationMetrics(obligations), [obligations])

  const filteredClauses = useMemo(() => {
    return filterContractClauses(clauses, {
      category: categoryFilter,
      status: statusFilter,
      search,
      eotOnly,
      ldOnly,
      escalationOnly,
      variationOnly,
      noticePeriodOnly,
    })
  }, [
    clauses,
    categoryFilter,
    statusFilter,
    search,
    eotOnly,
    ldOnly,
    escalationOnly,
    variationOnly,
    noticePeriodOnly,
  ])

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white rounded-2xl p-4 md:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <span>Contract</span>
              <span>&rarr;</span>
              <span>Contract Documents</span>
              <span>&rarr;</span>
              <span className="text-white font-bold underline decoration-blue-400">Clauses</span>
              <span>&rarr;</span>
              <span>Obligations</span>
              <span>&rarr;</span>
              <span>Deadlines</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-white mt-1">
              Contract Clause Management &amp; Obligations
            </h2>
            <p className="text-xs text-slate-300">
              Indexes the contractor&apos;s uploaded contract terms without department hardcoding. Only approved clauses drive automated deadlines.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => setAiModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <span>⚡</span>
              <span>AI Scan Contract</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setClauseToEdit(null)
                setNewClauseModalOpen(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              + Add Clause
            </Button>
          </div>
        </div>

        {clauseMetrics.draftCount > 0 && (
          <div className="bg-amber-500/20 border border-amber-400/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-200">
            <span className="text-base leading-none">⚠️</span>
            <div className="leading-relaxed">
              <span className="font-bold text-amber-100">
                Action Required: {clauseMetrics.draftCount} Unverified Draft Clause{clauseMetrics.draftCount === 1 ? '' : 's'}
              </span>
              <p className="text-amber-200/90 text-[11px] mt-0.5">
                AI extraction is strictly candidate draft data. Please review each clause against your original contract agreement and approve it to activate automated notice deadlines.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Indexed Clauses</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tabular-nums">{clauseMetrics.totalClauses}</span>
            <span className="text-xs font-semibold text-slate-500">Clauses</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 truncate">
            {clauseMetrics.aiExtractedCount} extracted via AI
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Approved &amp; Active</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 tabular-nums">{clauseMetrics.approvedCount}</span>
            <span className="text-xs font-bold text-emerald-800">Verified</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-600 border-t border-slate-100 pt-1.5 truncate font-medium">
            {clauseMetrics.noticeDrivingClausesCount} driving notice rules
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Draft / Unverified</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700 tabular-nums">{clauseMetrics.draftCount}</span>
            <span className="text-xs font-semibold text-amber-800">Pending Review</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-700 border-t border-slate-100 pt-1.5 truncate font-medium">
            Non-authoritative until verified
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Active Obligations</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700 tabular-nums">{obligationMetrics.totalObligations}</span>
            <span className="text-xs font-semibold text-slate-500">Duties</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 truncate">
            {obligationMetrics.overdueCount > 0 ? (
              <span className="text-rose-600 font-bold">{obligationMetrics.overdueCount} Overdue</span>
            ) : (
              <span>All compliance dates current</span>
            )}
          </p>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('clauses')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'clauses'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Contract Clauses Register</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
              {clauses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('obligations')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'obligations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Contractual Obligations &amp; Deadlines</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {obligations.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'clauses' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-700">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value as any)}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:border-blue-600 focus:outline-none"
                >
                  <option value="ALL">All Categories ({clauses.length})</option>
                  {ALL_CLAUSE_CATEGORIES.map(cat => {
                    const count = clauses.filter(c => c.category === cat).length
                    return (
                      <option key={cat} value={cat}>
                        {CLAUSE_CATEGORY_CONFIG[cat].label} ({count})
                      </option>
                    )
                  })}
                </select>

                <span className="font-bold text-slate-700 ml-2">Status:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:border-blue-600 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="APPROVED">Verified &amp; Approved</option>
                  <option value="DRAFT">Draft / Unverified (AI)</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search clause no., title, page..."
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 text-[11px]">
              <span className="text-slate-500 font-medium">Quick Filters:</span>
              <button
                type="button"
                onClick={() => setEotOnly(!eotOnly)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  eotOnly ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                EOT Relevant
              </button>
              <button
                type="button"
                onClick={() => setLdOnly(!ldOnly)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  ldOnly ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                LD Exposure
              </button>
              <button
                type="button"
                onClick={() => setEscalationOnly(!escalationOnly)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  escalationOnly ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Price Escalation
              </button>
              <button
                type="button"
                onClick={() => setVariationOnly(!variationOnly)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  variationOnly ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Variations
              </button>
              <button
                type="button"
                onClick={() => setNoticePeriodOnly(!noticePeriodOnly)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  noticePeriodOnly ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Has Notice Window
              </button>
            </div>
          </div>

          {filteredClauses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredClauses.map(clause => {
                const catConfig = CLAUSE_CATEGORY_CONFIG[clause.category] || CLAUSE_CATEGORY_CONFIG.OTHER
                const drivesDeadlines = isClauseApprovedForDeadlines(clause)

                return (
                  <div
                    key={clause.id}
                    onClick={() => setSelectedClause(clause)}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 font-mono text-sm">
                            {clause.clause_number}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catConfig.badgeColor}`}>
                            {catConfig.icon} {catConfig.label}
                          </span>
                        </div>

                        <ClauseStatusBadge
                          status={clause.status}
                          isAiExtracted={clause.is_ai_extracted}
                          sourcePageRef={clause.source_page_ref}
                          showSafetyNotice={false}
                        />
                      </div>

                      <h3 className="font-bold text-slate-900 text-xs mt-1.5 line-clamp-1">
                        {clause.clause_title}
                      </h3>

                      <p className="text-slate-600 font-mono text-[11px] mt-2 line-clamp-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                        {clause.clause_text}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>
                          Notice:{' '}
                          <b className={drivesDeadlines ? 'text-blue-700' : 'text-slate-800'}>
                            {clause.notice_period_days ? `${clause.notice_period_days} Days` : 'None'}
                          </b>
                        </span>
                        <span className="truncate max-w-[180px] italic">
                          {clause.source_page_ref || clause.source_document_title || 'Contract Agreement'}
                        </span>
                      </div>

                      {clause.is_ai_extracted && clause.status === 'DRAFT' && (
                        <div className="text-[10px] text-amber-800 bg-amber-50 px-2 py-1 rounded font-medium border border-amber-200">
                          AI extracted — verify against original contract.
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
              <span className="text-3xl block">📜</span>
              <h3 className="text-sm font-bold text-slate-900">No Clauses Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No contract clauses match your current filters. Add a clause manually or use the AI Scanner to extract clauses from your contract documents.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => setAiModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  ⚡ AI Scan Contract
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setClauseToEdit(null)
                    setNewClauseModalOpen(true)
                  }}
                  className="text-xs font-semibold"
                >
                  + Add Clause Manually
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'obligations' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Contractual Obligations Matrix
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Contractual duties, compliance windows, and milestone triggers derived from verified contract clauses.
            </p>

            {obligations.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {obligations.map(obl => (
                  <div key={obl.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{obl.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          obl.responsible_party === 'CONTRACTOR'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                        >
                          {obl.responsible_party}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {obl.obligation_type}
                        </span>
                      </div>
                      {obl.description && <p className="text-slate-600 text-[11px]">{obl.description}</p>}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {obl.due_date && (
                        <span className="text-slate-700 font-mono text-[11px]">
                          Due: <b>{formatDate(obl.due_date)}</b>
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        obl.status === 'COMPLIED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : obl.status === 'OVERDUE'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                      >
                        {obl.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No specific recurring obligations recorded yet. Approved clauses with statutory triggers will generate scheduled compliance events.
              </div>
            )}
          </div>
        </div>
      )}

      <NewClauseModal
        open={newClauseModalOpen}
        onClose={() => {
          setNewClauseModalOpen(false)
          setClauseToEdit(null)
        }}
        contractId={contract.id}
        existingDocuments={existingDocuments}
        clauseToEdit={clauseToEdit}
        onSuccess={savedClause => {
          setClauses(prev => {
            const exists = prev.some(c => c.id === savedClause.id)
            if (exists) {
              return prev.map(c => (c.id === savedClause.id ? savedClause : c))
            }
            return [savedClause, ...prev]
          })
        }}
      />

      <AIClauseExtractionModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        contract={contract}
        existingDocuments={existingDocuments}
        onClausesSaved={newClauses => {
          setClauses(prev => [...newClauses, ...prev])
        }}
        onContractUpdated={onContractUpdated}
      />

      <ClauseDetailModal
        open={!!selectedClause}
        onClose={() => setSelectedClause(null)}
        clause={selectedClause}
        onUpdate={updated => {
          setClauses(prev => prev.map(c => (c.id === updated.id ? updated : c)))
          setSelectedClause(updated)
        }}
        onDelete={deletedId => {
          setClauses(prev => prev.filter(c => c.id !== deletedId))
          setSelectedClause(null)
        }}
        onEdit={clause => {
          setClauseToEdit(clause)
          setNewClauseModalOpen(true)
        }}
      />
    </div>
  )
}
