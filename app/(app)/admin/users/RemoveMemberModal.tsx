'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

interface RemoveMemberModalProps {
  open: boolean
  onClose: () => void
  member: {
    id: string
    display_name: string | null
    email?: string | null
  } | null
  roleLabel?: string
  orgName?: string
  onSuccess: () => void
}

export function RemoveMemberModal({
  open,
  onClose,
  member,
  roleLabel = 'Staff Member',
  orgName = 'your firm',
  onSuccess,
}: RemoveMemberModalProps) {
  const supabase = createClient()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!member) return null

  const handleRemove = async () => {
    setLoading(true)
    setError('')

    try {
      // 1. Try atomic remove_team_member RPC
      const { data, error: rpcError } = await supabase.rpc('remove_team_member', {
        p_user_id: member.id,
      })

      if (rpcError) {
        // Fallback: If RPC not yet applied in Supabase, update profile directly
        if (rpcError.code === 'PGRST202' || rpcError.message?.includes('remove_team_member')) {
          const { error: profileErr } = await supabase
            .from('user_profiles')
            .update({ organization_id: null, status: 'pending' })
            .eq('id', member.id)

          if (profileErr) {
            setError(profileErr.message)
            setLoading(false)
            return
          }

          // Reset role
          await supabase.from('roles').update({ role: 'viewer', project_id: null }).eq('user_id', member.id)
        } else {
          setError(rpcError.message || 'Failed to remove team member.')
          setLoading(false)
          return
        }
      }

      setLoading(false)
      toast.success(`Removed ${member.display_name || member.email || 'member'} from ${orgName}`)
      onSuccess()
      onClose()
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'Failed to remove team member.')
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
      title="Remove Team Member"
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
            onClick={handleRemove}
          >
            Remove Member
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-slate-600">
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="font-semibold text-slate-900 text-base">
            {member.display_name || 'Staff Member'}
          </div>
          {member.email && (
            <p className="text-xs text-slate-500">{member.email}</p>
          )}
          <div className="pt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-200/80 text-slate-800">
              Role: {roleLabel}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1.5">
          <div className="flex items-center gap-2 font-medium text-rose-900 text-xs sm:text-sm">
            <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Revoke Workspace Access</span>
          </div>
          <p className="text-xs text-rose-700 leading-relaxed">
            This will immediately remove <strong>{member.display_name || member.email}</strong> from <strong>{orgName}</strong>. They will lose access to all company projects, muster rolls, expenses, and supplier khatas.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

