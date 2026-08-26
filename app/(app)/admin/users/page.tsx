import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserManagementClient } from './UserManagementClient'

export default async function AdminUsersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // Check if owner using SECURITY DEFINER RPC
  const { data: userRole } = await supabase.rpc('get_user_role')

  if (userRole !== 'owner') {
    redirect('/dashboard')
  }

  // Fetch all user profiles with auth details & roles
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, status, created_at')
    .order('created_at', { ascending: false })

  const { data: roles } = await supabase.from('roles').select('*')
  const { data: projects } = await supabase.from('projects').select('id, name')

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">User Management & Approvals</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review account requests, approve active status, and assign roles or site scopes.
        </p>
      </div>

      <UserManagementClient
        profiles={profiles ?? []}
        roles={roles ?? []}
        projects={projects ?? []}
      />
    </div>
  )
}
