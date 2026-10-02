'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { formatINR, formatDate } from '@/lib/format'
import { AddProjectButton } from './AddProjectButton'
import { ArchiveProjectModal } from './ArchiveProjectModal'
import { canArchiveProject, canCreateProject } from '@/lib/permissions'
import { saveOfflineSnapshot } from '@/lib/offline/db'
import { StitchCard } from '@/components/ui/StitchCard'
import { StitchTable, StitchTableHead, StitchTableBody, StitchTableRow, StitchTableCell } from '@/components/ui/StitchTable'

export interface ProjectRow {
  id: string
  name: string
  agency_name: string | null
  advertised_cost: number | null
  awarded_amount: number | null
  start_date: string | null
  end_date: string | null
  status: string
  archived?: boolean
  archived_at?: string | null
  created_at: string
}

const statusVariant = {
  active:    'success',
  completed: 'neutral',
  on_hold:   'warning',
  cancelled: 'danger',
} as const

interface ProjectsClientProps {
  projects: ProjectRow[]
  userRole: string
}

export function ProjectsClient({ projects, userRole }: ProjectsClientProps) {
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalProject, setModalProject] = useState<ProjectRow | null>(null)
  const [modalMode, setModalMode] = useState<'archive' | 'unarchive'>('archive')
  const [seeding, setSeeding] = useState(false)
  const [seedError, setSeedError] = useState('')
  const [seedSuccess, setSeedSuccess] = useState(false)

  const handleSeedStarter = async () => {
    setSeeding(true)
    setSeedError('')
    setSeedSuccess(false)
    try {
      const res = await fetch('/api/organization/seed-starter', {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to seed sample project.')
      }
      setSeedSuccess(true)
      setTimeout(() => {
        window.location.reload()
      }, 700)
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : 'Failed to seed sample project')
      setSeeding(false)
    }
  }

  useEffect(() => {
    if (projects && projects.length > 0) {
      void saveOfflineSnapshot('/projects', { projects })
    }
  }, [projects])

  const canArchive = canArchiveProject(userRole)
  const canCreate = canCreateProject(userRole)

  const activeProjects = useMemo(() => projects.filter(p => !p.archived), [projects])
  const archivedProjects = useMemo(() => projects.filter(p => !!p.archived), [projects])

  const displayedProjects = useMemo(() => {
    const list = tab === 'active' ? activeProjects : archivedProjects
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      p => p.name.toLowerCase().includes(q) || (p.agency_name && p.agency_name.toLowerCase().includes(q))
    )
  }, [tab, activeProjects, archivedProjects, search])

  const handleOpenArchive = (p: ProjectRow) => {
    setModalProject(p)
    setModalMode('archive')
    setModalOpen(true)
  }

  const handleOpenUnarchive = (p: ProjectRow) => {
    setModalProject(p)
    setModalMode('unarchive')
    setModalOpen(true)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contract Projects</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 tabular-nums">
              {projects.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Contract sites, work orders, delay claims, and client department accounts
          </p>
        </div>
        {canCreate && <AddProjectButton />}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="inline-flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 ${
              tab === 'active'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Sites ({activeProjects.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('archived')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 ${
              tab === 'archived'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Archived ({archivedProjects.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects by name or agency..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50/80 border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Directory Table */}
      {!displayedProjects.length ? (
        <div className="space-y-4">
          <EmptyState
            title={tab === 'active' ? 'No active projects found' : 'No archived projects'}
            description={
              tab === 'active'
                ? 'Add your first project to start tracking expenses, attendance, and RA bills.'
                : 'Archived projects will appear here. Linked financial records remain preserved.'
            }
          />
          {tab === 'active' && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 border border-blue-200/80 shadow-2xs text-center max-w-lg mx-auto space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-bold text-blue-950">
                  New to PillarPro? Explore with pre-loaded civil data
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                  PMGSY Package
                </span>
              </div>
              <p className="text-xs text-blue-800/80 leading-relaxed">
                Pre-load the complete 10-module PMGSY Highway civil package (₹1.78 Cr) with Form 26 Measurement Book, RA Bill 01, Clause 5 Delay Defense notices, Partner Equity, and Store Inventory.
              </p>
              <button
                type="button"
                disabled={seeding || seedSuccess}
                onClick={handleSeedStarter}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all shadow-xs"
              >
                {seeding ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Loading PMGSY Highway Package...</span>
                  </>
                ) : seedSuccess ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Civil Package Loaded! Refreshing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Pre-load Sample Highway Project &amp; RA Bill</span>
                  </>
                )}
              </button>
              {seedError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 text-left flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-rose-800">Unable to load sample project</p>
                    <p className="text-[11px] text-rose-600 mt-0.5 leading-relaxed">{seedError}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <StitchTable>
          <table className="w-full text-sm">
            <StitchTableHead>
              <tr>
                <th className="text-left px-4 py-3">Project &amp; Work</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Client Agency</th>
                <th className="text-right px-4 py-3 hidden lg:table-cell">Awarded Amount</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Start Date</th>
                <th className="text-center px-4 py-3">Status</th>
                {canArchive && <th className="text-right px-4 py-3">Action</th>}
              </tr>
            </StitchTableHead>
            <StitchTableBody>
              {displayedProjects.map(p => (
                <StitchTableRow key={p.id}>
                  {/* Project Name */}
                  <StitchTableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/projects/${p.id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition-colors tracking-tight"
                      >
                        {p.name}
                      </Link>
                      {p.archived && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                          Archived
                        </span>
                      )}
                    </div>
                    {p.agency_name && (
                      <p className="text-xs text-slate-400 md:hidden mt-0.5">{p.agency_name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] font-semibold">
                      <Link href={`/projects/${p.id}/hindrances`} className="text-blue-600 hover:underline flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Delay Defense (EOT)</span>
                      </Link>
                      <span className="text-slate-300">&bull;</span>
                      <Link href={`/projects/${p.id}/boq`} className="text-slate-500 hover:text-slate-800 hover:underline">
                        e-MB
                      </Link>
                      <span className="text-slate-300">&bull;</span>
                      <Link href={`/projects/${p.id}/dpr`} className="text-slate-500 hover:text-slate-800 hover:underline">
                        DPR
                      </Link>
                    </div>
                  </StitchTableCell>

                  {/* Agency */}
                  <StitchTableCell className="text-slate-600 hidden md:table-cell">
                    {p.agency_name ?? '—'}
                  </StitchTableCell>

                  {/* Awarded */}
                  <StitchTableCell align="right" className="font-mono text-slate-800 font-semibold hidden lg:table-cell">
                    {formatINR(p.awarded_amount)}
                  </StitchTableCell>

                  {/* Start Date */}
                  <StitchTableCell className="text-slate-500 text-xs tabular-nums hidden md:table-cell">
                    {formatDate(p.start_date)}
                  </StitchTableCell>

                  {/* Status */}
                  <StitchTableCell align="center" className="whitespace-nowrap">
                    <Badge
                      dot
                      label={p.status?.replace('_', ' ') ?? 'active'}
                      variant={statusVariant[p.status as keyof typeof statusVariant] ?? 'default'}
                    />
                  </StitchTableCell>

                  {/* Action (Owner Only) */}
                  {canArchive && (
                    <StitchTableCell align="right" className="whitespace-nowrap">
                      {!p.archived ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs py-1 px-2.5 h-auto text-rose-700 border-rose-200/80 hover:bg-rose-50"
                          onClick={() => handleOpenArchive(p)}
                        >
                          Archive
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs py-1 px-2.5 h-auto text-blue-700 border-blue-200/80 hover:bg-blue-50"
                          onClick={() => handleOpenUnarchive(p)}
                        >
                          Unarchive
                        </Button>
                      )}
                    </StitchTableCell>
                  )}
                </StitchTableRow>
              ))}
            </StitchTableBody>
          </table>
        </StitchTable>
      )}

      {/* Confirmation Modal */}
      <ArchiveProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        project={modalProject}
        mode={modalMode}
      />
    </div>
  )
}
