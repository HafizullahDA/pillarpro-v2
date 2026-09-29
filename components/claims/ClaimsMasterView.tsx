'use client'

import { useState, useMemo } from 'react'
import { formatINR, formatDate } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { ContractClaim, ClaimType, ClaimStatus } from '@/lib/types/claims'
import { ContractRecord } from '@/lib/types/contract'
import { ContractEvent, DetailedHindrance } from '@/lib/types/contractDefense'
import { EOTCase } from '@/lib/types/eot'
import { EvidenceRecord } from '@/lib/types/evidence'
import { CorrespondenceRecord } from '@/lib/types/correspondence'
import { BOQItem } from '@/lib/types/boq'
import { aggregateClaimMetrics, filterClaims } from '@/lib/calculations/claims'
import { ClaimStatusBadge } from './ClaimStatusBadge'
import { ClaimTypeBadge } from './ClaimTypeBadge'
import { ClaimFinancialStrip } from './ClaimFinancialStrip'
import { NewClaimModal } from './NewClaimModal'
import { ClaimDetailModal } from './ClaimDetailModal'
import { ClaimPrintStatementModal } from './ClaimPrintStatementModal'

interface Props {
  initialClaims: ContractClaim[]
  projects: Array<{ id: string; name: string }>
  contracts: ContractRecord[]
  contractEvents: ContractEvent[]
  hindrances: DetailedHindrance[]
  eotCases: EOTCase[]
  evidenceList: EvidenceRecord[]
  correspondenceList: CorrespondenceRecord[]
  boqItems: BOQItem[]
  selectedProjectId?: string
}

export function ClaimsMasterView({
  initialClaims = [],
  projects = [],
  contracts = [],
  contractEvents = [],
  hindrances = [],
  eotCases = [],
  evidenceList = [],
  correspondenceList = [],
  boqItems = [],
  selectedProjectId = 'all',
}: Props) {
  const [claims, setClaims] = useState<ContractClaim[]>(initialClaims)
  const [projectId, setProjectId] = useState<string>(selectedProjectId)
  const [typeFilter, setTypeFilter] = useState<ClaimType | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [inspectingClaim, setInspectingClaim] = useState<ContractClaim | null>(null)
  const [printingClaim, setPrintingClaim] = useState<ContractClaim | null>(null)

  // Filter project claims for summary
  const projectClaims = useMemo(() => {
    if (projectId === 'all') return claims
    return claims.filter(c => c.project_id === projectId)
  }, [claims, projectId])

  // Summary
  const summary = useMemo(() => {
    return aggregateClaimMetrics(projectClaims)
  }, [projectClaims])

  // Table filtered items
  const filteredItems = useMemo(() => {
    return filterClaims(claims, {
      query: searchQuery,
      type: typeFilter,
      status: statusFilter,
      projectId,
    })
  }, [claims, searchQuery, typeFilter, statusFilter, projectId])

  const handleCreated = (newClaim: ContractClaim) => {
    setClaims(prev => [newClaim, ...prev])
  }

  const handleUpdated = (updatedClaim: ContractClaim) => {
    setClaims(prev => prev.map(c => (c.id === updatedClaim.id ? updatedClaim : c)))
    setInspectingClaim(updatedClaim)
  }

  return (
    <div className="space-y-6">
      {/* Top Bar with Project Selector & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Contractual Claims &amp; Dispute Quantification</span>
            <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-bold">
              Substantiated Damages
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Compiles idle resource standing charges, prolongation overheads, escalation, and contractual damages based on contemporaneous site records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projects.length > 1 && (
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
            >
              <option value="all">All Projects Portfolio</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <Button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1.5 font-bold shadow-sm"
          >
            <span>+</span>
            <span>New Claim Dossier</span>
          </Button>
        </div>
      </div>

      {/* Financial Realization Strip */}
      <ClaimFinancialStrip
        summary={summary}
        projectName={
          projectId !== 'all'
            ? projects.find(p => p.id === projectId)?.name
            : 'All Projects Combined'
        }
      />

      {/* Filter Tabs & Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              'ALL',
              'IDLE_MACHINERY',
              'IDLE_LABOUR',
              'PROLONGATION',
              'ESCALATION',
              'DELAY_RELATED',
              'VARIATION',
            ] as const
          ).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t as any)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                typeFilter === t
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL'
                ? 'All Heads'
                : t === 'IDLE_MACHINERY'
                ? 'Idle Plant'
                : t === 'IDLE_LABOUR'
                ? 'Idle Labour'
                : t === 'PROLONGATION'
                ? 'Prolongation'
                : t === 'ESCALATION'
                ? 'Escalation'
                : t === 'DELAY_RELATED'
                ? 'Delay Damages'
                : 'Variations'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl bg-white text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved / Awarded</option>
            <option value="PAID">Paid</option>
            <option value="REJECTED">Disallowed</option>
          </select>
          <input
            type="text"
            placeholder="Search claim number, head, authority..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs text-slate-900 w-full sm:w-64 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Claims Register Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Claim No / Date</th>
                <th className="p-3">Head of Claim</th>
                <th className="p-3">Title &amp; Basis</th>
                <th className="p-3 text-right">Claimed (₹)</th>
                <th className="p-3 text-right">Approved (₹)</th>
                <th className="p-3 text-right">Paid (₹)</th>
                <th className="p-3 text-right">Outstanding (₹)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => setInspectingClaim(item)}
                    >
                      <td className="p-3 font-mono">
                        <span className="font-bold text-slate-900 block">
                          {item.claim_number}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatDate(item.claim_date)}
                        </span>
                      </td>
                      <td className="p-3">
                        <ClaimTypeBadge type={item.claim_type} showClause={false} />
                      </td>
                      <td className="p-3 max-w-xs">
                        <span className="font-semibold text-slate-800 block truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate block">
                          {item.basis_of_claim || 'GCC Provisions'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-purple-900">
                        {formatINR(item.claimed_amount)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-800">
                        {item.approved_amount > 0 ? formatINR(item.approved_amount) : '—'}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-teal-800">
                        {item.paid_amount > 0 ? formatINR(item.paid_amount) : '—'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-900">
                        {formatINR(item.outstanding_amount)}
                      </td>
                      <td className="p-3 text-center">
                        <ClaimStatusBadge status={item.status} />
                      </td>
                      <td className="p-3 text-right space-x-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setInspectingClaim(item)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => setPrintingClaim(item)}
                          className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[11px] font-semibold"
                          title="Print Statement of Claim"
                        >
                          Memorial
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                    No contractual claims found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <NewClaimModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={handleCreated}
        projects={projects}
        contracts={contracts}
        contractEvents={contractEvents}
        hindrances={hindrances}
        eotCases={eotCases}
        evidenceList={evidenceList}
        correspondenceList={correspondenceList}
        boqItems={boqItems}
        preselectedProjectId={projectId}
      />

      <ClaimDetailModal
        claim={inspectingClaim}
        isOpen={!!inspectingClaim}
        onClose={() => setInspectingClaim(null)}
        onUpdate={handleUpdated}
        onPrint={c => {
          setInspectingClaim(null)
          setPrintingClaim(c)
        }}
      />

      <ClaimPrintStatementModal
        claim={printingClaim}
        isOpen={!!printingClaim}
        onClose={() => setPrintingClaim(null)}
      />
    </div>
  )
}
