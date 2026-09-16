import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AttendanceClient } from './AttendanceClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Muster Roll Attendance',
}

export default async function AttendancePage() {
  const supabase = createClient()
  const [{ data: userRole }, { data: orgId }, { data: projects }] = await Promise.all([
    supabase.rpc('get_user_role'),
    supabase.rpc('get_user_organization_id'),
    supabase
      .from('projects')
      .select('id, name')
      .eq('archived', false)
      .eq('status', 'active')
      .order('name'),
  ])
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-5">Attendance</h1>
      <AttendanceClient
        projects={projects ?? []}
        userRole={userRole}
        organizationId={orgId ?? undefined}
      />
    </div>
  )
}
