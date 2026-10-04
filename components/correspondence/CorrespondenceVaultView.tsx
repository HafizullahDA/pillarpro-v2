'use client'

import { useState, useMemo } from 'react'
import {
  CorrespondenceRecord,
  CorrespondenceDirection,
  CorrespondenceCategory,
  CorrespondenceStatus,
  DeadlineUrgency,
  CORRESPONDENCE_CATEGORY_CONFIG,
  ContractNoticeRule,
} from '@/lib/types/correspondence'
import { ContractRecord } from '@/lib/types/contract'
import { BOQItem } from '@/lib/types/boq'
import { ContractEvent, DetailedHindrance } from '@/lib/types/contractDefense'
import {
  aggregateDeadlineMetrics,
  filterCorrespondenceRecords,
} from '@/lib/calculations/correspondenceDeadlines'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DeadlineBadge } from './DeadlineBadge'
import { DeadlineMetricsStrip } from './DeadlineMetricsStrip'
import { NewCorrespondenceModal } from './NewCorrespondenceModal'
import { CorrespondenceDetailModal } from './CorrespondenceDetailModal'

interface CorrespondenceVaultViewProps {
  initialCorrespondence?: CorrespondenceRecord[]
  initialRecords?: CorrespondenceRecord[]
  projects: { id: string; name: string }[]
  contracts: ContractRecord[]
  boqItems?: BOQItem[]
  contractEvents?: ContractEvent[]
  hindrances?: DetailedHindrance[]
  eotApplications?: any[]
  noticeRules?: ContractNoticeRule[]
  selectedProjectId?: string
  initialTab?: 'all' | 'incoming' | 'outgoing' | 'instructions' | 'notices' | 'deadlines'
}

export function CorrespondenceVaultView({
  initialCorrespondence,
  initialRecords,
  projects,
  contracts,
  boqItems = [],
  contractEvents = [],
  hindrances = [],
  eotApplications = [],
  noticeRules = [],
  selectedProjectId = 'all',
  initialTab = 'all',
}: CorrespondenceVaultViewProps) {
  const [records, setRecords] = useState<CorrespondenceRecord[]>(initialRecords || initialCorrespondence || [])
  const [activeTab, setActiveTab] = useState<'all' | 'incoming' | 'outgoing' | 'instructions' | 'notices' | 'deadlines'>(initialTab)
  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState<string>(selectedProjectId)
  const [filterContract, setFilterContract] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [selectedUrgency, setSelectedUrgency] = useState<'ALL' | DeadlineUrgency>('ALL')

  // Modals
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<CorrespondenceRecord | null>(null)

  // Quick preset parameters for "+ Log" button
  const [modalDirection, setModalDirection] = useState<CorrespondenceDirection>('INCOMING')
  const [modalCategory, setModalCategory] = useState<CorrespondenceCategory>('CORRESPONDENCE')

  // Calculate project-scoped records for metrics
  const projectScopedRecords = useMemo(() => {
    return filterProject === 'all'
      ? records
      : records.filter(r => r.project_id === filterProject)
  }, [records, filterProject])

  // Aggregated deadline and distribution metrics
  const metrics = useMemo(() => {
    return aggregateDeadlineMetrics(projectScopedRecords)
  }, [projectScopedRecords])

  // Filtered dataset for display
  const displayRecords = useMemo(() => {
    let dirFilter: 'ALL' | 'INCOMING' | 'OUTGOING' = 'ALL'
    let catFilter: 'ALL' | CorrespondenceCategory = 'ALL'

    if (activeTab === 'incoming') dirFilter = 'INCOMING'
    if (activeTab === 'outgoing') dirFilter = 'OUTGOING'
    if (activeTab === 'instructions') catFilter = 'SITE_INSTRUCTION'
    if (activeTab === 'notices') catFilter = 'NOTICE'

    let filtered = filterCorrespondenceRecords(projectScopedRecords, {
      search,
      direction: dirFilter,
      category: catFilter,
      status: filterStatus as any,
      projectId: filterProject,
      contractId: filterContract,
      urgency: selectedUrgency,
    })

    if (activeTab === 'deadlines') {
      filtered = filtered.filter(r => r.response_required && r.status !== 'RESPONDED' && r.status !== 'CLOSED')
    }

    return filtered
  }, [projectScopedRecords, activeTab, search, filterStatus, filterProject, filterContract, selectedUrgency])

  const handleCreated = (newRecord: CorrespondenceRecord) => {
    setRecords(prev => [newRecord, ...prev])
  }

  const handleUpdated = (updatedRecord: CorrespondenceRecord) => {
    setRecords(prev => prev.map(r => (r.id === updatedRecord.id ? updatedRecord : r)))
    if (selectedRecord?.id === updatedRecord.id) {
      setSelectedRecord(updatedRecord)
    }
  }

  const openNewModalWith = (dir: CorrespondenceDirection, cat: CorrespondenceCategory) => {
    setModalDirection(dir)
    setModalCategory(cat)
    setNewModalOpen(true)
  }

  return (
    <div className="space-y-5 text-left text-xs">
      {/* Top Banner & Legal Disclaimer */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Correspondence &amp; Contractual Notice Engine
              </h2>
              <Badge label="Clause Deadline Tracker" variant="default" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks incoming/outgoing letters, site instructions, and contractual notices with transparent clause-defined response clocks.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              size="sm"
              variant="secondary"
              className="text-xs"
              onClick={() => openNewModalWith('INCOMING', 'CORRESPONDENCE')}
            >
              + Log Incoming Letter
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
              onClick={() => openNewModalWith('OUTGOING', 'NOTICE')}
            >
              + Draft Statutory Notice
            </Button>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-amber-900 flex items-start gap-2.5">
          <span className="text-sm shrink-0">⚖️</span>
          <p className="text-[11px] leading-relaxed text-amber-950/90">
            <b>Record-Keeping &amp; Deadline Compliance:</b> Transparently calculates response deadlines from event dates and contract notice periods. This system tracks factual records and contractual notice clocks and does not provide legal advice or warrant legal validity.
          </p>
        </div>

        {/* 4 Urgency Cards: OVERDUE, DUE TODAY, DUE IN 7 DAYS, UPCOMING */}
        <DeadlineMetricsStrip
          metrics={metrics}
          selectedUrgency={selectedUrgency}
          onSelectUrgency={setSelectedUrgency}
        />
      </div>

      {/* Sub-tabs Navigation */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex gap-4 md:gap-6 text-xs font-semibold whitespace-nowrap min-w-max pb-px">
          <button
            onClick={() => {
              setActiveTab('all')
              setSelectedUrgency('ALL')
            }}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>All Communications</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
              {metrics.totalRecords}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('incoming')
              setSelectedUrgency('ALL')
            }}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'incoming'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>↓ Incoming Letters</span>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded-full font-mono">
              {metrics.incomingCount}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('outgoing')
              setSelectedUrgency('ALL')
            }}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'outgoing'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>↑ Outgoing Letters</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-full font-mono">
              {metrics.outgoingCount}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('instructions')
              setSelectedUrgency('ALL')
            }}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'instructions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📝 Site Instructions</span>
            <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded-full font-mono">
              {metrics.siteInstructionCount}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('notices')
              setSelectedUrgency('ALL')
            }}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'notices'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>⚠️ Contractual Notices</span>
            <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded-full font-mono">
              {metrics.noticeCount}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('deadlines')
              setSelectedUrgency('ALL')
            }}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'deadlines'
                ? 'border-rose-600 text-rose-600 font-bold'
                : 'border-transparent text-rose-700 hover:text-rose-900 font-semibold'
            }`}
          >
            <span>⏱️ Response Deadlines</span>
            <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full font-mono">
              {metrics.totalActionable}
            </span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search letter #, subject, sender, recipient, or keywords..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-medium focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESPONSE_REQUIRED">RESPONSE REQUIRED</option>
            <option value="RESPONDED">RESPONDED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-medium focus:outline-none"
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Register */}
      {displayRecords.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
            ✉️
          </div>
          <h3 className="text-base font-bold text-slate-900">No Communications Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Log all inward letters, speed post communications, site instructions, and contractual notices to maintain rigorous proof of contemporaneous compliance.
          </p>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            onClick={() => openNewModalWith('INCOMING', 'CORRESPONDENCE')}
          >
            + Log First Letter
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Letter # &amp; Direction</th>
                  <th className="px-4 py-3">Category &amp; Date</th>
                  <th className="px-4 py-3">Subject &amp; Description</th>
                  <th className="px-4 py-3">Sender &amp; Recipient</th>
                  <th className="px-4 py-3">Response Deadline</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRecords.map(item => {
                  const catConfig = CORRESPONDENCE_CATEGORY_CONFIG[item.category as CorrespondenceCategory] || CORRESPONDENCE_CATEGORY_CONFIG.CORRESPONDENCE

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-bold text-slate-900 font-mono">{item.letter_number}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                            item.direction === 'INCOMING'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {item.direction === 'INCOMING' ? '↓ In' : '↑ Out'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.reference_number}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${catConfig.badgeColor}`}>
                          {catConfig.icon} {catConfig.label}
                        </span>
                        <p className="text-[11px] font-semibold text-slate-900 mt-1">
                          {formatDate(item.date)}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <p
                          onClick={() => {
                            setSelectedRecord(item)
                            setDetailModalOpen(true)
                          }}
                          className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer line-clamp-2"
                        >
                          {item.subject}
                        </p>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {item.description}
                          </p>
                        )}
                        {item.clause_reference && (
                          <span className="inline-block mt-1 text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                            {item.clause_reference}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 max-w-[170px]">
                        <p className="text-[11px] text-slate-600 truncate">
                          <span className="font-semibold text-slate-400 text-[10px]">From:</span> {item.sender}
                        </p>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">
                          <span className="font-semibold text-slate-400 text-[10px]">To:</span> {item.recipient}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.response_required ? (
                          <DeadlineBadge
                            deadlineDate={item.response_deadline}
                            status={item.status}
                            eventDate={item.event_date}
                            noticePeriodDays={item.notice_period_days}
                          />
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No reply required</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge label={item.status.replace(/_/g, ' ')} variant="neutral" />
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedRecord(item)
                            setDetailModalOpen(true)
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Inspect &rarr;
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW CORRESPONDENCE MODAL */}
      <NewCorrespondenceModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        projects={projects}
        contracts={contracts}
        boqItems={boqItems}
        contractEvents={contractEvents}
        hindrances={hindrances}
        eotApplications={eotApplications}
        noticeRules={noticeRules}
        defaultProjectId={filterProject !== 'all' ? filterProject : projects[0]?.id}
        defaultDirection={modalDirection}
        defaultCategory={modalCategory}
        onSuccess={handleCreated}
      />

      {/* DETAIL MODAL */}
      <CorrespondenceDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        record={selectedRecord}
        onUpdated={handleUpdated}
      />
    </div>
  )
}
