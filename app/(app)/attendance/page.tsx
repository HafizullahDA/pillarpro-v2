import { createClient } from '@/lib/supabase/server'
import { AttendanceClient } from './AttendanceClient'

export default async function AttendancePage() {
  const supabase = createClient()
  const { data: projects } = await supabase.from('projects').select('id, name').eq('status', 'active').order('name')
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-5">Attendance</h1>
      <AttendanceClient projects={projects ?? []} />
    </div>
  )
}
