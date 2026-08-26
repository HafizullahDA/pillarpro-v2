import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserManagementClient } from './UserManagementClient'

export default async function AdminUsersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // Check if owner using SECURITY DEFINER RPC
  const { data: userRole } = await supabase.rpc('get_user_role')
  console.log('CURRENT USER ROLE:', userRole)

  if (userRole !== 'owner') {
    redirect('/dashboard')
  }

  // Fetch all user profiles with auth details & roles
  const { data: rawProfiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, email, display_name, status, created_at')
    .order('created_at', { ascending: false })

  if (profilesError) {
    console.error('PROFILES FETCH ERROR:', JSON.stringify(profilesError))
  }

  const { data: rawRoles, error: rolesError } = await supabase.from('roles').select('*')

  if (rolesError) {
    console.error('ROLES FETCH ERROR:', JSON.stringify(rolesError))
  }

  const { data: projects } = await supabase.from('projects').select('id, name')
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
      <div>
        <h1 className="text-xl font-bold text-slate-900">User Management & Approvals</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review account requests, approve active status, and assign roles or site scopes.
        </p>
      </div>

      <UserManagementClient
        profiles={profilesList}
        roles={rolesList}
        projects={projects ?? []}
        projectMembers={projectMembers ?? []}
      />
    </div>
  )
}
