'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { EOTCase, EOTStatus } from '@/lib/types/eot'
import { EOTStatusBadge } from './EOTStatusBadge'
import { NewEOTCaseModal } from './NewEOTCaseModal'
import { EOTCaseDetailModal } from './EOTCaseDetailModal'
import { EOTPrintSummaryModal } from './EOTPrintSummaryModal'
import { ContractRecord } from '@/lib/types/contract'
import { ContractEvent, DetailedHindrance } from '@/lib/types/contractDefense'
import { EvidenceRecord } from '@/lib/types/evidence'
import { CorrespondenceRecord } from '@/lib/types/correspondence'
import { filterEOTCases, aggregateEOTMetrics } from '@/lib/calculations/eot'
import { formatDate } from '@/lib/format'

interface EOTMasterViewProps {
  initialCases: EOTCase[]
  projects: Array<{ id: string; name: string; agency_name?: string | null; end_date?: string | null }>
  contracts: ContractRecord[]
  contractEvents: ContractEvent[]
  hindrances: DetailedHindrance[]
  evidenceList: EvidenceRecord[]
  correspondenceList: CorrespondenceRecord[]
  selectedProjectId?: string
}

export function EOTMasterView({
  initialCases,
  projects,
  contracts,
  contractEvents,
  hindrances,
  evidenceList,
  correspondenceList,
  selectedProjectId = 'all',
}: EOTMasterViewProps) {
  const [cases, setCases] = useState<EOTCase[]>(initialCases)
  const [filterProject, setFilterProject] = useState<string>(selectedProjectId)
  const [filterStatus, setFilterStatus] = useState<EOTStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')

  // Modals
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [selectedCase, setSelectedCase] = useState<EOTCase | null>(null)

  // Filtered dataset
  const filteredCases = useMemo(() => {
    return filterEOTCases(cases, {
      projectId: filterProject,
      status: filterStatus,
      search,
    })
  }, [cases, filterProject, filterStatus, search])

  // Portfolio metrics
  const metrics = useMemo(() => aggregateEOTMetrics(filteredCases), [filteredCases])

  const getProjectName = (pId: string) => {
    return projects.find(p => p.id === pId)?.name || 'Project'
  }

  const getContract = (cId?: string | null) => {
    if (!cId) return null
    return contracts.find(c => c.id === cId) || null
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Strict Factual Tone */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900">
                Extension of Time (EOT) &amp; Form 27 Engine
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 uppercase font-mono">
                CPWD GCC Clause 5
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Compiles contemporaneous delay records, hindrance logs, and official correspondence into formal EOT applications without duplicating records.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setNewModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0"
          >
            <span>+</span>
            <span>Draft EOT Application</span>
          </Button>
        </div>

        {/* Non-Entitlement Factual Disclaimer */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2">
          <span className="text-sm leading-none">🛡️</span>
          <div>
            <span className="font-bold text-slate-800">Contemporaneous Record Tracker: </span>
            PillarPro records potential EOT events, days claimed, days approved, and pending decisions. The system does not predict claim success or assert legal entitlement; all time extensions remain subject to the Employer&apos;s contractual scrutiny.
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Applications</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tabular-nums">{metrics.totalCases}</span>
            <span className="text-xs font-semibold text-slate-500">Dossiers</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 truncate">
            {metrics.submittedCount + metrics.underReviewCount} pending determination
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Days Claimed</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700 tabular-nums">{metrics.totalClaimedDays}</span>
            <span className="text-xs font-semibold text-blue-800">Days</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 truncate">
            Contemporaneous site delay claimed
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Days Approved</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 tabular-nums">{metrics.totalApprovedDays}</span>
            <span className="text-xs font-bold text-emerald-800">Sanctioned</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-600 border-t border-slate-100 pt-1.5 truncate font-medium">
            Formal extension granted by Dept
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending Decision</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700 tabular-nums">{metrics.totalPendingDays}</span>
            <span className="text-xs font-semibold text-amber-800">Days</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 truncate">
            Awaiting employer determination
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-700">Project:</span>
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:border-blue-600 focus:outline-none"
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <span className="font-bold text-slate-700 ml-2">Status:</span>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:border-blue-600 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft Case</option>
            <option value="PREPARING">Preparing Dossier</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="PARTIALLY_APPROVED">Partially Approved</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search EOT reference, cause..."
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* EOT Cases Table */}
      {filteredCases.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">EOT Reference</th>
                  <th className="px-4 py-3">Project &amp; Cause</th>
                  <th className="px-4 py-3">Days Claimed</th>
                  <th className="px-4 py-3">Days Approved</th>
                  <th className="px-4 py-3">Pending Decision</th>
                  <th className="px-4 py-3">Revised Completion</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCases.map(item => {
                  const ctr = getContract(item.contract_id)

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-bold text-slate-900 font-mono text-sm">{item.eot_reference}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Filed: {formatDate(item.submission_date)}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="font-semibold text-slate-900 truncate">{getProjectName(item.project_id)}</p>
                        <p className="text-slate-500 text-[11px] truncate mt-0.5 italic">&ldquo;{item.cause}&rdquo;</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                          <span>{item.event_ids?.length || 0} Events</span>
                          <span>&bull;</span>
                          <span>{item.hindrance_ids?.length || 0} Hindrances</span>
                          <span>&bull;</span>
                          <span>{item.evidence_ids?.length || 0} Proofs</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-slate-900 tabular-nums">
                        {item.claimed_days} Days
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-emerald-700 tabular-nums">
                        {item.approved_days} Days
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-amber-700 tabular-nums">
                        {item.pending_days} Days
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap font-mono">
                        <p className="font-bold text-slate-900">{formatDate(item.revised_completion_date)}</p>
                        <p className="text-[10px] text-slate-400">Orig: {formatDate(item.current_completion_date)}</p>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <EOTStatusBadge status={item.status} />
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedCase(item)
                            setDetailModalOpen(true)
                          }}
                          className="text-[11px] h-auto py-1 px-2.5"
                        >
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedCase(item)
                            setPrintModalOpen(true)
                          }}
                          className="text-[11px] h-auto py-1 px-2.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
                        >
                          Print PDF
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
            ⏳
          </div>
          <h3 className="text-base font-bold text-slate-900">No Extension of Time Cases Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Create an EOT dossier linking your potential contract events, hindrance records, and supporting documentary proofs to shield against liquidated damages.
          </p>
          <Button
            size="sm"
            onClick={() => setNewModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
          >
            + Draft EOT Application
          </Button>
        </div>
      )}

      {/* MODALS */}
      <NewEOTCaseModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        projects={projects}
        contracts={contracts}
        contractEvents={contractEvents}
        hindrances={hindrances}
        evidenceList={evidenceList}
        correspondenceList={correspondenceList}
        defaultProjectId={filterProject !== 'all' ? filterProject : projects[0]?.id}
        onSuccess={newCase => {
          setCases(prev => [newCase, ...prev])
        }}
      />

      <EOTCaseDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        eotCase={selectedCase}
        contracts={contracts}
        contractEvents={contractEvents}
        hindrances={hindrances}
        evidenceList={evidenceList}
        correspondenceList={correspondenceList}
        onUpdate={updatedCase => {
          setCases(prev => prev.map(c => (c.id === updatedCase.id ? updatedCase : c)))
          setSelectedCase(updatedCase)
        }}
        onPrint={caseToPrint => {
          setSelectedCase(caseToPrint)
          setPrintModalOpen(true)
        }}
      />

      <EOTPrintSummaryModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        eotCase={selectedCase}
        contract={selectedCase ? getContract(selectedCase.contract_id) : null}
        linkedEvents={contractEvents.filter(e => selectedCase?.event_ids?.includes(e.id))}
        linkedHindrances={hindrances.filter(h => selectedCase?.hindrance_ids?.includes(h.id))}
        linkedEvidence={evidenceList.filter(ev => selectedCase?.evidence_ids?.includes(ev.id))}
        linkedCorrespondence={correspondenceList.filter(c => selectedCase?.correspondence_ids?.includes(c.id))}
      />
    </div>
  )
}
