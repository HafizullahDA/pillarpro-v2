import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PeriodsClient } from './PeriodsClient'

export default async function AdminPeriodsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // Check if owner
  const { data: roleRow } = await supabase
    .from('roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (roleRow?.role !== 'owner') {
    redirect('/dashboard')
  }

  const { data: projects } = await supabase.from('projects').select('id, name').order('name')
  const { data: periods } = await supabase.from('ledger_periods').select('*')

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Month Close & Period Integrity</h1>
        <p className="text-sm text-slate-500 mt-1">
          Lock accounting periods per project. Once closed, non-Owner edits and deletes are blocked by database security.
        </p>
      </div>

      <PeriodsClient projects={projects ?? []} periods={periods ?? []} />
    </div>
  )
}
