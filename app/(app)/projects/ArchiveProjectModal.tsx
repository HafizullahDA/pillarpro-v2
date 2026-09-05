'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface ArchiveProjectModalProps {
  open: boolean
  onClose: () => void
  project: { id: string; name: string; archived?: boolean } | null
  mode: 'archive' | 'unarchive'
  onSuccess?: () => void
}

export function ArchiveProjectModal({
  open,
  onClose,
  project,
  mode,
  onSuccess,
}: ArchiveProjectModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!project) return null

  const isArchive = mode === 'archive'

  const handleConfirm = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const updatePayload = isArchive
        ? {
            archived: true,
            archived_at: new Date().toISOString(),
            archived_by: user?.id || null,
          }
        : {
            archived: false,
            archived_at: null,
            archived_by: null,
          }

      const { error: updateErr } = await supabase
        .from('projects')
        .update(updatePayload)
        .eq('id', project.id)

      if (updateErr) {
        setError(updateErr.message)
        setLoading(false)
        return
      }

      setLoading(false)
      onClose()
      if (onSuccess) onSuccess()
      router.refresh()
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'Failed to update project archive status.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (!loading) onClose() }}
      title={isArchive ? 'Archive Project' : 'Unarchive Project'}
      maxWidth="md"
      footer={
        <div className="flex w-full justify-end gap-3">
          <Button
            variant="secondary"
            disabled={loading}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant={isArchive ? 'danger' : 'primary'}
            loading={loading}
            onClick={handleConfirm}
          >
            {isArchive ? 'Archive Project' : 'Unarchive Project'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {isArchive ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-amber-950">Confirm Soft-Delete Archival</p>
                <p className="text-amber-800/90 mt-0.5">
                  Are you sure you want to archive <strong className="text-amber-950">&quot;{project.name}&quot;</strong>?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will archive the project and hide it from active views (Dashboard, Projects list, and RA Bill dropdown selectors).
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs text-slate-700">
              <p className="font-medium text-slate-900 text-[11px] uppercase tracking-wide">Data Preservation Guarantee:</p>
              <div className="flex items-center gap-2 text-emerald-700">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Linked RA bills, measurements & payments remain intact.</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Supplier transactions and expenses are preserved.</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>You can restore / unarchive this project at any time.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
              <span className="text-xl">📦</span>
              <div>
                <p className="font-semibold text-blue-950">Restore Project to Active Views</p>
                <p className="text-blue-800/90 mt-0.5">
                  Unarchive <strong className="text-blue-950">&quot;{project.name}&quot;</strong>?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will restore the project to all active dropdown selectors, the main Projects directory, and Dashboard financial views.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
