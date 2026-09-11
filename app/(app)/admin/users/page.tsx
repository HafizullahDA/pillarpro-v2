import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { canManageUsers } from '@/lib/permissions'
import { UserManagementClient } from './UserManagementClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminUsersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: userRole } = await supabase.rpc('get_user_role')

  if (!canManageUsers(userRole)) {
    redirect('/dashboard')
  }

  // Get current user's organization and firm details
  const { data: userOrgId } = await supabase.rpc('get_user_organization_id')
  const { data: joinCodeData } = await supabase.rpc('get_organization_join_code')

  const joinCode = (joinCodeData as any)?.join_code ?? null
  const orgName = (joinCodeData as any)?.organization_name ?? 'Contractor Firm'

  // Fetch team member profiles scoped strictly to this organization
  let query = supabase
    .from('user_profiles')
    .select('id, email, display_name, status, created_at, organization_id')
    .order('created_at', { ascending: false })

  if (userOrgId) {
    query = query.eq('organization_id', userOrgId)
  }

  const { data: rawProfiles, error: profilesError } = await query

  if (profilesError) {
    console.error('PROFILES FETCH ERROR:', JSON.stringify(profilesError))
  }

  const { data: rawRoles, error: rolesError } = await supabase.from('roles').select('*')

  if (rolesError) {
    console.error('ROLES FETCH ERROR:', JSON.stringify(rolesError))
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('archived', false)
    .order('name')
  const { data: projectMembers } = await supabase.from('project_members').select('project_id, user_id')

  // Ensure current logged in user is in profiles array if table is empty
  const profilesList = [...(rawProfiles ?? [])]
  if (!profilesList.some(p => p.id === user.id)) {
    profilesList.unshift({
      id: user.id,
      email: user.email ?? null,
      display_name: (user.user_metadata?.display_name as string | undefined) ?? user.email ?? 'Owner',
      status: 'active',
      created_at: user.created_at,
      organization_id: userOrgId ?? null,
    })
  }

  const rolesList = [...(rawRoles ?? [])]
  if (!rolesList.some(r => r.user_id === user.id)) {
    rolesList.unshift({
      user_id: user.id,
      role: 'owner',
      project_id: null,
    })
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Team & Permissions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your firm’s staff, assign site supervision scopes, and control role-based access.
          </p>
        </div>
      </div>

      <UserManagementClient
        profiles={profilesList}
        roles={rolesList}
        projects={projects ?? []}
        projectMembers={projectMembers ?? []}
        currentUserId={user.id}
        orgName={orgName}
        joinCode={joinCode}
      />
    </div>
  )
}
