'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/format'
import { ArchiveProjectModal } from '../ArchiveProjectModal'

const statusVariant = {
  active: 'success', completed: 'neutral', on_hold: 'warning', cancelled: 'danger',
} as const

interface ProjectDetailHeaderProps {
  project: {
    id: string
    name: string
    agency_name?: string | null
    status: string
    archived?: boolean
    archived_at?: string | null
  }
  isOwner: boolean
}

export function ProjectDetailHeader({ project, isOwner }: ProjectDetailHeaderProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'archive' | 'unarchive'>('archive')

  const handleOpenModal = (mode: 'archive' | 'unarchive') => {
    setModalMode(mode)
    setModalOpen(true)
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Back Link */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </Link>
      </div>

      {/* Archived Alert Banner */}
      {project.archived && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <span className="text-base shrink-0">⚠️</span>
            <div>
              <p className="font-bold text-amber-950">This Project is Archived</p>
              <p className="text-amber-800/90 mt-0.5">
                Hidden from active selectors, Dashboard, and the default Projects directory.
                {project.archived_at && ` Archived on ${formatDate(project.archived_at)}.`}
                {' '}All linked bills, expenses, and supplier accounts remain safe and preserved.
              </p>
            </div>
          </div>
          {isOwner && (
            <Button
              size="sm"
              variant="secondary"
              className="text-xs py-1 px-3 h-auto shrink-0 bg-white border-amber-300 text-amber-900 hover:bg-amber-100/60"
              onClick={() => handleOpenModal('unarchive')}
            >
              Unarchive Project
            </Button>
          )}
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
            <Badge
              label={project.status?.replace('_', ' ') ?? 'active'}
              variant={statusVariant[project.status as keyof typeof statusVariant] ?? 'default'}
            />
            {project.archived && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                Archived
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">{project.agency_name ?? '—'}</p>
        </div>

        {/* Header Action for Owner */}
        {isOwner && (
          <div className="flex items-center gap-2 shrink-0">
            {!project.archived ? (
              <Button
                size="sm"
                variant="secondary"
                className="text-xs py-1.5 px-3 h-auto text-rose-700 border-rose-200 hover:bg-rose-50"
                onClick={() => handleOpenModal('archive')}
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Archive Project
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                className="text-xs py-1.5 px-3 h-auto text-blue-700 border-blue-200 hover:bg-blue-50"
                onClick={() => handleOpenModal('unarchive')}
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Unarchive Project
              </Button>
            )}
          </div>
        )}
      </div>

      <ArchiveProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        project={project}
        mode={modalMode}
      />
    </div>
  )
}
