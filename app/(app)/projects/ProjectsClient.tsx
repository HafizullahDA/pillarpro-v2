'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { formatINR, formatDate } from '@/lib/format'
import { AddProjectButton } from './AddProjectButton'
import { ArchiveProjectModal } from './ArchiveProjectModal'

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

  const isOwner = userRole === 'owner'

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
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Projects</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage contract sites, work orders, and client agency records
          </p>
        </div>
        <AddProjectButton />
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              tab === 'active'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Projects ({activeProjects.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('archived')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              tab === 'archived'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Archived ({archivedProjects.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
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
            placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Directory Table */}
      {!displayedProjects.length ? (
        <EmptyState
          title={tab === 'active' ? 'No active projects found' : 'No archived projects'}
          description={
            tab === 'active'
              ? 'Add your first project to start tracking expenses, attendance, and RA bills.'
              : 'Archived projects will appear here. Linked financial records remain preserved.'
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Project</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Agency</th>
                  <th className="text-right px-4 py-3 hidden lg:table-cell">Awarded Amount</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Start Date</th>
                  <th className="text-center px-4 py-3">Status</th>
                  {isOwner && <th className="text-right px-4 py-3">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedProjects.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/75 transition-colors">
                    {/* Project Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/projects/${p.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {p.name}
                        </Link>
                        {p.archived && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            Archived
                          </span>
                        )}
                      </div>
                      {p.agency_name && (
                        <p className="text-xs text-slate-400 md:hidden mt-0.5">{p.agency_name}</p>
                      )}
                    </td>

                    {/* Agency */}
                    <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell">
                      {p.agency_name ?? '—'}
                    </td>

                    {/* Awarded */}
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-800 font-medium hidden lg:table-cell">
                      {formatINR(p.awarded_amount)}
                    </td>

                    {/* Start Date */}
                    <td className="px-4 py-3.5 text-slate-500 text-xs tabular-nums hidden md:table-cell">
                      {formatDate(p.start_date)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <Badge
                        label={p.status?.replace('_', ' ') ?? 'active'}
                        variant={statusVariant[p.status as keyof typeof statusVariant] ?? 'default'}
                      />
                    </td>

                    {/* Action (Owner Only) */}
                    {isOwner && (
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {!p.archived ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs py-1 px-2.5 h-auto text-rose-700 border-rose-200 hover:bg-rose-50"
                            onClick={() => handleOpenArchive(p)}
                          >
                            Archive
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs py-1 px-2.5 h-auto text-blue-700 border-blue-200 hover:bg-blue-50"
                            onClick={() => handleOpenUnarchive(p)}
                          >
                            Unarchive
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
