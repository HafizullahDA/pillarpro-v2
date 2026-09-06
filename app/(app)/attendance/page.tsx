import { createClient } from '@/lib/supabase/server'
import { AttendanceClient } from './AttendanceClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AttendancePage() {
  const supabase = createClient()
  const [{ data: userRole }, { data: projects }] = await Promise.all([
    supabase.rpc('get_user_role'),
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
      <AttendanceClient projects={projects ?? []} userRole={userRole} />
    </div>
  )
}
