'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/format'

type Profile = {
  id: string
  display_name: string | null
  status: string
  created_at: string
}

type Role = {
  user_id: string
  role: string
  project_id: string | null
}

type Project = {
  id: string
  name: string
}

export function UserManagementClient({
  profiles,
  roles,
  projects,
}: {
  profiles: Profile[]
  roles: Role[]
  projects: Project[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const rolesMap = new Map(roles.map(r => [r.user_id, r]))

  const handleApprove = async (userId: string, newRole: 'owner' | 'managing_partner' | 'site_supervisor') => {
    setUpdatingId(userId)
    // 1. Update user_profiles status to active
    await supabase.from('user_profiles').update({ status: 'active' }).eq('id', userId)

    // 2. Upsert role
    await supabase.from('roles').upsert({
      user_id: userId,
      role: newRole,
      project_id: null,
    }, { onConflict: 'user_id' })

    setUpdatingId(null)
    router.refresh()
  }

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    setUpdatingId(userId)
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active'
    await supabase.from('user_profiles').update({ status: nextStatus }).eq('id', userId)
    setUpdatingId(null)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs">
              <th className="text-left px-4 py-3 font-semibold">User</th>
              <th className="text-left px-4 py-3 font-semibold">Joined Date</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Assigned Role</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profiles.map(p => {
              const roleObj = rolesMap.get(p.id)
              const currentRole = roleObj?.role ?? 'None'
              const isLoading = updatingId === p.id

              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{p.display_name ?? 'User'}</p>
                    <p className="text-xs text-slate-400 font-mono">{p.id.slice(0, 8)}...</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      label={p.status}
                      variant={p.status === 'active' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-700 capitalize font-medium">
                    {currentRole.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status === 'pending' ? (
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          loading={isLoading}
                          onClick={() => handleApprove(p.id, 'site_supervisor')}
                        >
                          Approve Supervisor
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={isLoading}
                          onClick={() => handleApprove(p.id, 'managing_partner')}
                        >
                          Approve Partner
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant={p.status === 'active' ? 'secondary' : 'primary'}
                        loading={isLoading}
                        onClick={() => handleStatusToggle(p.id, p.status)}
                      >
                        {p.status === 'active' ? 'Suspend' : 'Activate'}
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
