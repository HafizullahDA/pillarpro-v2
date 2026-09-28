'use client'

import { useState, useMemo } from 'react'
import {
  EvidenceRecord,
  EvidenceType,
  EVIDENCE_TYPES,
  EVIDENCE_TYPE_CONFIG,
} from '@/lib/types/evidence'
import { ContractRecord } from '@/lib/types/contract'
import { BOQItem } from '@/lib/types/boq'
import { ContractEvent, DetailedHindrance } from '@/lib/types/contractDefense'
import { filterEvidenceRecords } from '@/lib/calculations/evidenceCompleteness'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { UploadEvidenceModal } from './UploadEvidenceModal'
import { EvidencePreviewModal } from './EvidencePreviewModal'
import { NewVersionModal } from './NewVersionModal'

interface EvidenceVaultViewProps {
  initialEvidence: EvidenceRecord[]
  projects: { id: string; name: string }[]
  contracts: ContractRecord[]
  boqItems?: BOQItem[]
  contractEvents?: ContractEvent[]
  hindrances?: DetailedHindrance[]
  eotApplications?: any[]
  selectedProjectId?: string
}

export function EvidenceVaultView({
  initialEvidence,
  projects,
  contracts,
  boqItems = [],
  contractEvents = [],
  hindrances = [],
  eotApplications = [],
  selectedProjectId = 'all',
}: EvidenceVaultViewProps) {
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>(initialEvidence)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>(selectedProjectId)
  const [filterContract, setFilterContract] = useState<string>('all')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [filterRelated, setFilterRelated] = useState<'all' | 'event' | 'hindrance' | 'measurement' | 'boq' | 'ra_bill' | 'eot'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [newVersionModalOpen, setNewVersionModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<EvidenceRecord | null>(null)

  // Filtered records
  const filteredRecords = useMemo(() => {
    return filterEvidenceRecords(evidenceList, {
      search,
      type: filterType,
      projectId: filterProject,
      contractId: filterContract,
      source: filterSource,
      relatedType: filterRelated,
    })
  }, [evidenceList, search, filterType, filterProject, filterContract, filterSource, filterRelated])

  // Statistics
  const stats = useMemo(() => {
    const total = filteredRecords.length
    const photos = filteredRecords.filter(r => r.type === 'PHOTO' || r.type === 'VIDEO').length
    const letters = filteredRecords.filter(r => r.type === 'LETTER' || r.type === 'EMAIL' || r.type === 'SITE_ORDER').length
    const linked = filteredRecords.filter(
      r =>
        r.related_contract_event_id ||
        r.related_hindrance_id ||
        r.related_measurement_id ||
        r.related_boq_item_id ||
        r.related_ra_bill_id ||
        r.related_eot_id
    ).length
    const totalBytes = filteredRecords.reduce((sum, r) => sum + (Number(r.file_size_bytes) || 0), 0)
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(1)

    return { total, photos, letters, linked, totalMB }
  }, [filteredRecords])

  const handleUploadSuccess = (newRecord: EvidenceRecord) => {
    setEvidenceList(prev => [newRecord, ...prev])
  }

  const handleVersionSuccess = (updatedRecord: EvidenceRecord) => {
    setEvidenceList(prev => prev.map(r => (r.id === updatedRecord.id ? updatedRecord : r)))
    if (selectedRecord?.id === updatedRecord.id) {
      setSelectedRecord(updatedRecord)
    }
  }

  return (
    <div className="space-y-5 text-left text-xs">
      {/* Top Banner & Stats Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                PillarPro Evidence Vault
              </h2>
              <Badge label="Contemporaneous Proof Engine" variant="default" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Securely preserves and links evidentiary proofs across Measurements, Delays, Hindrances, Variations, EOT, and Claims with audit version history.
            </p>
          </div>

          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shrink-0"
            onClick={() => setUploadModalOpen(true)}
          >
            + Upload Evidence &amp; Link
          </Button>
        </div>

        {/* Stats Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Total Evidence</p>
            <p className="text-xl font-black text-slate-900 mt-1 tabular-nums">{stats.total} Files</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Site Photos &amp; Video</p>
            <p className="text-xl font-black text-blue-700 mt-1 tabular-nums">{stats.photos}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Letters &amp; Site Orders</p>
            <p className="text-xl font-black text-indigo-700 mt-1 tabular-nums">{stats.letters}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Linked to Records</p>
            <p className="text-xl font-black text-emerald-700 mt-1 tabular-nums">
              {stats.linked} / {stats.total}
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 col-span-2 md:col-span-1">
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Vault Volume</p>
            <p className="text-xl font-black text-slate-900 mt-1 font-mono">{stats.totalMB} MB</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search evidence by title, reference #, filename, or source..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
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

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Card Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Audit Table
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-medium focus:outline-none"
          >
            <option value="all">All Evidence Types ({EVIDENCE_TYPES.length})</option>
            {EVIDENCE_TYPES.map(t => (
              <option key={t} value={t}>
                {EVIDENCE_TYPE_CONFIG[t].icon} {EVIDENCE_TYPE_CONFIG[t].label}
              </option>
            ))}
          </select>

          <select
            value={filterRelated}
            onChange={e => setFilterRelated(e.target.value as any)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-medium focus:outline-none"
          >
            <option value="all">All Linked Records</option>
            <option value="event">Linked to Contract Events</option>
            <option value="hindrance">Linked to Hindrances</option>
            <option value="measurement">Linked to Measurements (MB)</option>
            <option value="boq">Linked to BOQ Items</option>
            <option value="ra_bill">Linked to RA Bills</option>
            <option value="eot">Linked to EOT Applications</option>
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

          {contracts.length > 0 && (
            <select
              value={filterContract}
              onChange={e => setFilterContract(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-medium focus:outline-none"
            >
              <option value="all">All Contracts</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.agreement_number}: {c.contract_title || 'Contract'}
                </option>
              ))}
            </select>
          )}

          {(search || filterType !== 'all' || filterProject !== 'all' || filterContract !== 'all' || filterRelated !== 'all') && (
            <button
              onClick={() => {
                setSearch('')
                setFilterType('all')
                setFilterProject('all')
                setFilterContract('all')
                setFilterRelated('all')
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
            📁
          </div>
          <h3 className="text-base font-bold text-slate-900">No Evidence Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Upload and link site photographs, official letters, daily reports, measurement sheets, or drawings to substantiate your contractual position.
          </p>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            onClick={() => setUploadModalOpen(true)}
          >
            + Upload First Evidence Record
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map(item => {
            const typeConfig = EVIDENCE_TYPE_CONFIG[item.type] || EVIDENCE_TYPE_CONFIG.OTHER
            const isImage =
              item.type === 'PHOTO' ||
              item.file_type?.startsWith('image/') ||
              item.file_url.match(/\.(jpeg|jpg|png|webp|gif)$/i)

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                {/* Visual Thumbnail */}
                <div
                  onClick={() => {
                    setSelectedRecord(item)
                    setPreviewModalOpen(true)
                  }}
                  className="h-36 bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer relative group border-b border-slate-100"
                >
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.file_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <span className="text-3xl">{typeConfig.icon}</span>
                      <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase">
                        {item.file_type || item.type}
                      </p>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs border backdrop-blur-xs ${typeConfig.badgeColor}`}>
                      {typeConfig.label}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white font-mono backdrop-blur-xs">
                      v{item.version_number || 1}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{item.evidence_number}</span>
                      <span>{formatDate(item.document_date)}</span>
                    </div>

                    <h4
                      onClick={() => {
                        setSelectedRecord(item)
                        setPreviewModalOpen(true)
                      }}
                      className="font-bold text-slate-900 text-xs line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer"
                      title={item.title}
                    >
                      {item.title}
                    </h4>

                    {item.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Relational Links Pills */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap gap-1">
                      {item.related_contract_event_id && (
                        <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-semibold truncate max-w-[150px]">
                          Event: {item.contract_events?.event_number || 'Linked'}
                        </span>
                      )}
                      {item.related_hindrance_id && (
                        <span className="text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-semibold truncate max-w-[150px]">
                          Hindrance #{item.hindrances?.hindrance_number || 'Linked'}
                        </span>
                      )}
                      {item.related_measurement_id && (
                        <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                          MB Entry #{item.measurement_entries?.entry_number || 'Linked'}
                        </span>
                      )}
                      {item.related_boq_item_id && (
                        <span className="text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded font-semibold truncate max-w-[150px]">
                          BOQ: {item.boq_items?.item_number || 'Linked'}
                        </span>
                      )}
                      {item.related_eot_id && (
                        <span className="text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded font-semibold">
                          EOT Claim
                        </span>
                      )}
                      {!item.related_contract_event_id &&
                        !item.related_hindrance_id &&
                        !item.related_measurement_id &&
                        !item.related_boq_item_id &&
                        !item.related_eot_id && (
                          <span className="text-[10px] text-slate-400 italic">Project-level record</span>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
                      <span className="font-mono">
                        {item.file_size_bytes ? `${(item.file_size_bytes / 1024).toFixed(0)} KB` : ''}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedRecord(item)
                            setNewVersionModalOpen(true)
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        >
                          + Version
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRecord(item)
                            setPreviewModalOpen(true)
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors cursor-pointer"
                        >
                          View &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* AUDIT TABLE VIEW */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Evidence # &amp; Type</th>
                  <th className="px-4 py-3">Document Title &amp; Filename</th>
                  <th className="px-4 py-3">Date &amp; Source</th>
                  <th className="px-4 py-3">Linked Records</th>
                  <th className="px-4 py-3">Version &amp; Size</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map(item => {
                  const typeConfig = EVIDENCE_TYPE_CONFIG[item.type] || EVIDENCE_TYPE_CONFIG.OTHER

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-bold text-slate-900 font-mono">{item.evidence_number}</p>
                        <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded border ${typeConfig.badgeColor}`}>
                          {typeConfig.icon} {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <p
                          onClick={() => {
                            setSelectedRecord(item)
                            setPreviewModalOpen(true)
                          }}
                          className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                        >
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                          {item.original_filename || 'document'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-semibold text-slate-900">{formatDate(item.document_date)}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.source || 'Contractor'}</p>
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {item.related_contract_event_id && (
                            <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-semibold truncate">
                              Event: {item.contract_events?.event_number || 'Linked'}
                            </span>
                          )}
                          {item.related_hindrance_id && (
                            <span className="text-[10px] font-mono bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded font-semibold truncate">
                              Hindrance #{item.hindrances?.hindrance_number || 'Linked'}
                            </span>
                          )}
                          {item.related_measurement_id && (
                            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-semibold">
                              MB #{item.measurement_entries?.entry_number || 'Linked'}
                            </span>
                          )}
                          {!item.related_contract_event_id &&
                            !item.related_hindrance_id &&
                            !item.related_measurement_id && (
                              <span className="text-slate-400 italic">Project Level</span>
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                          v{item.version_number || 1}
                        </span>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {item.file_size_bytes ? `${(item.file_size_bytes / 1024).toFixed(0)} KB` : '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => {
                            setSelectedRecord(item)
                            setNewVersionModalOpen(true)
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          + Version
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRecord(item)
                            setPreviewModalOpen(true)
                          }}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Preview &rarr;
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

      {/* MODAL 1: UPLOAD EVIDENCE */}
      <UploadEvidenceModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        projects={projects}
        contracts={contracts}
        boqItems={boqItems}
        contractEvents={contractEvents}
        hindrances={hindrances}
        eotApplications={eotApplications}
        defaultProjectId={filterProject !== 'all' ? filterProject : projects[0]?.id}
        onSuccess={handleUploadSuccess}
      />

      {/* MODAL 2: PREVIEW EVIDENCE */}
      <EvidencePreviewModal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        evidence={selectedRecord}
        onUploadNewVersion={rec => {
          setSelectedRecord(rec)
          setPreviewModalOpen(false)
          setNewVersionModalOpen(true)
        }}
      />

      {/* MODAL 3: NEW VERSION */}
      <NewVersionModal
        open={newVersionModalOpen}
        onClose={() => setNewVersionModalOpen(false)}
        evidence={selectedRecord}
        onSuccess={handleVersionSuccess}
      />
    </div>
  )
}
