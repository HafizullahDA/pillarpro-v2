'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/format'
import { ROLES_CONFIG, CanonicalRole, normalizeRole } from '@/lib/permissions'

type Profile = {
  id: string
  email?: string | null
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

type ProjectMember = {
  project_id: string
  user_id: string
}

export function UserManagementClient({
  profiles,
  roles,
  projects,
  projectMembers = [],
  currentUserId,
}: {
  profiles: Profile[]
  roles: Role[]
  projects: Project[]
  projectMembers?: ProjectMember[]
  currentUserId?: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [pendingSelections, setPendingSelections] = useState<Record<string, CanonicalRole>>({})

  const rolesMap = new Map(roles.map(r => [r.user_id, r]))
  const membersMap = new Map(projectMembers.map(m => [m.user_id, m.project_id]))

  const handleRoleChange = async (userId: string, newRole: CanonicalRole) => {
    setUpdatingId(userId)
    const { error } = await supabase.from('roles').upsert(
      {
        user_id: userId,
        role: newRole,
        project_id: null,
      },
      { onConflict: 'user_id' }
    )

    if (error) {
      alert(`Failed to update role: ${error.message}`)
    }

    setUpdatingId(null)
    router.refresh()
  }

  const handleApprove = async (userId: string, roleToAssign: CanonicalRole) => {
    setUpdatingId(userId)
    await supabase.from('user_profiles').update({ status: 'active' }).eq('id', userId)

    await supabase.from('roles').upsert(
      {
        user_id: userId,
        role: roleToAssign,
        project_id: null,
      },
      { onConflict: 'user_id' }
    )

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

  const handleAssignProject = async (userId: string, projectId: string) => {
    setUpdatingId(userId)
    if (!projectId) {
      await supabase.from('project_members').delete().eq('user_id', userId)
    } else {
      await supabase.from('project_members').upsert(
        {
          user_id: userId,
          project_id: projectId,
        },
        { onConflict: 'project_id,user_id' }
      )
    }
    setUpdatingId(null)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs">
              <th className="text-left px-4 py-3 font-semibold">User</th>
              <th className="text-left px-4 py-3 font-semibold">Joined Date</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Role Access</th>
              <th className="text-left px-4 py-3 font-semibold">Assigned Site</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profiles.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 px-4 text-slate-500">
                  <p className="font-semibold text-slate-700">No account requests at the moment</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    When new team members or partners sign up at{' '}
                    <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-mono">/sign-up</code>,
                    their accounts appear here for role assignment and approval.
                  </p>
                </td>
              </tr>
            ) : (
              profiles.map(p => {
                const roleObj = rolesMap.get(p.id)
                const canonicalRole = normalizeRole(roleObj?.role) ?? 'viewer'
                const assignedProjectId = membersMap.get(p.id) ?? ''
                const isLoading = updatingId === p.id
                const isSelf = currentUserId === p.id
                const isPending = p.status === 'pending'
                const selectedPendingRole = pendingSelections[p.id] || 'site_supervisor'

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {p.display_name ?? 'User'}
                            {isSelf && (
                              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{p.email || `${p.id.slice(0, 8)}...`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={p.status}
                        variant={p.status === 'active' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {isPending ? (
                        <select
                          value={selectedPendingRole}
                          onChange={e =>
                            setPendingSelections(prev => ({
                              ...prev,
                              [p.id]: e.target.value as CanonicalRole,
                            }))
                          }
                          disabled={isLoading}
                          className="text-xs font-medium rounded-lg border border-amber-300 bg-amber-50/50 px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          {ROLES_CONFIG.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={canonicalRole}
                          onChange={e => handleRoleChange(p.id, e.target.value as CanonicalRole)}
                          disabled={isLoading || isSelf}
                          title={isSelf ? 'You cannot change your own role' : 'Change user role'}
                          className="text-xs font-medium rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-800 disabled:opacity-60 disabled:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {ROLES_CONFIG.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canonicalRole === 'site_supervisor' ? (
                        <select
                          value={assignedProjectId}
                          onChange={e => handleAssignProject(p.id, e.target.value)}
                          className="text-xs rounded-lg border border-slate-300 px-2 py-1 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={isLoading}
                        >
                          <option value="">All / Unassigned</option>
                          {projects.map(proj => (
                            <option key={proj.id} value={proj.id}>
                              {proj.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-400">All Sites</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isPending ? (
                        <Button
                          size="sm"
                          loading={isLoading}
                          onClick={() => handleApprove(p.id, selectedPendingRole)}
                        >
                          Approve Account
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant={p.status === 'active' ? 'secondary' : 'primary'}
                          loading={isLoading}
                          disabled={isSelf}
                          title={isSelf ? 'You cannot suspend your own account' : undefined}
                          onClick={() => handleStatusToggle(p.id, p.status)}
                        >
                          {p.status === 'active' ? 'Suspend' : 'Activate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
