'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatINR } from '@/lib/format'

interface DeleteWorkerModalProps {
  open: boolean
  onClose: () => void
  worker: {
    id: string
    name: string
    trade: string | null
    daily_wage_rate: number | null
  } | null
  attendanceCount?: number
  onSuccess: () => void
}

export function DeleteWorkerModal({
  open,
  onClose,
  worker,
  attendanceCount = 0,
  onSuccess,
}: DeleteWorkerModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!worker) return null

  const handleDelete = async () => {
    setLoading(true)
    setError('')

    try {
      // 1. Try atomic delete_worker RPC
      const { error: rpcError } = await supabase.rpc('delete_worker', {
        p_worker_id: worker.id,
      })

      if (rpcError) {
        // Fallback: If RPC not yet applied in Supabase, delete directly
        if (rpcError.code === 'PGRST202' || rpcError.message?.includes('delete_worker')) {
          // Clean attendance first to respect foreign keys
          await supabase.from('attendance').delete().eq('worker_id', worker.id)
          await supabase.from('wage_payments').delete().eq('worker_id', worker.id)
          
          const { error: directError } = await supabase
            .from('workers')
            .delete()
            .eq('id', worker.id)

          if (directError) {
            setError(directError.message)
            setLoading(false)
            return
          }
        } else {
          setError(rpcError.message || 'Failed to delete worker.')
          setLoading(false)
          return
        }
      }

      setLoading(false)
      onSuccess()
      onClose()
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'Failed to delete worker.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!loading) {
          setError('')
          onClose()
        }
      }}
      title="Delete Worker"
      maxWidth="md"
      footer={
        <div className="flex w-full justify-end gap-3">
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => {
              setError('')
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={loading}
            onClick={handleDelete}
          >
            Delete Worker
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-slate-600">
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="font-semibold text-slate-900 text-base">
            {worker.name}
          </div>
          <p className="text-xs text-slate-500">
            {worker.trade || 'Helper'} · {formatINR(worker.daily_wage_rate)}/day
          </p>
        </div>

        {attendanceCount > 0 ? (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-2">
            <div className="flex items-center gap-2 font-medium text-rose-900">
              <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Warning: Active Attendance History</span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              This worker has recorded attendance records ({attendanceCount} logged days/shifts). Deleting this worker will permanently remove them and all their attendance and wage ledger entries.
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-500 leading-relaxed">
            Are you sure you want to delete <strong>{worker.name}</strong> from your worker roster? This action cannot be undone.
          </p>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

