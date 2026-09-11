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
  orgName,
  joinCode,
}: {
  profiles: Profile[]
  roles: Role[]
  projects: Project[]
  projectMembers?: ProjectMember[]
  currentUserId?: string
  orgName?: string
  joinCode?: string | null
}) {
  const router = useRouter()
  const supabase = createClient()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [pendingSelections, setPendingSelections] = useState<Record<string, CanonicalRole>>({})
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const rolesMap = new Map(roles.map(r => [r.user_id, r]))
  const membersMap = new Map(projectMembers.map(m => [m.user_id, m.project_id]))

  const handleCopyCode = () => {
    if (!joinCode) return
    navigator.clipboard.writeText(joinCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleCopyLink = () => {
    if (!joinCode) return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const inviteUrl = `${origin}/sign-up?join=${encodeURIComponent(joinCode)}`
    navigator.clipboard.writeText(inviteUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

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
    <div className="space-y-6">
      {/* Firm Invite Banner */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-slate-50 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <h2 className="text-sm font-bold text-slate-900">
                {orgName ? `${orgName} Team Access` : 'Firm Team Access'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">
              Site supervisors, accountants, and partners can join your workspace directly using your firm’s unique invite code.
            </p>
          </div>

          {joinCode && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-medium text-slate-400">Join Code:</span>
                <span className="font-mono font-bold text-sm text-blue-600 tracking-wider">
                  {joinCode}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-2xs"
              >
                {copiedCode ? '✓ Copied Code' : 'Copy Code'}
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs"
              >
                {copiedLink ? '✓ Copied Link' : 'Copy Invite Link'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Team Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Team Directory ({profiles.length})
          </h3>
          <span className="text-xs text-slate-400">
            Role-Based Access Control (RBAC)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 text-xs">
                <th className="text-left px-4 py-3 font-semibold">Staff Member</th>
                <th className="text-left px-4 py-3 font-semibold">Joined Date</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Assigned Role</th>
                <th className="text-left px-4 py-3 font-semibold">Site Supervision Scope</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 px-4 text-slate-500">
                    <p className="font-semibold text-slate-700">No staff members found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Share your firm’s invite code with your engineers and site supervisors to add them to your workspace.
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
                              {p.display_name ?? 'Staff Member'}
                              {isSelf && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">{p.email || `${p.id.slice(0, 8)}...`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={p.status === 'active' ? 'Active' : p.status === 'pending' ? 'Pending' : 'Suspended'}
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
                            className="text-xs rounded-lg border border-slate-300 px-2 py-1 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[200px] truncate"
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
                          <span className="text-xs text-slate-400">All Company Projects</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isPending ? (
                          <Button
                            size="sm"
                            loading={isLoading}
                            onClick={() => handleApprove(p.id, selectedPendingRole)}
                          >
                            Approve Staff
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
    </div>
  )
}
