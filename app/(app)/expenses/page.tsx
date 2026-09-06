import { createClient } from '@/lib/supabase/server'
import { ExpensesClient, ExpenseRow } from './ExpensesClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ExpensesPage() {
  const supabase = createClient()
  const [
    { data: userRole },
    { data: projects },
    { data: suppliers },
    { data: expenses },
  ] = await Promise.all([
    supabase.rpc('get_user_role'),
    supabase.from('projects').select('id, name').eq('archived', false).order('name'),
    supabase.from('suppliers').select('id, name').order('name'),
    supabase
      .from('expenses')
      .select('*, projects(name)')
      .order('date', { ascending: false })
      .limit(100),
  ])

  const activeProjects = projects ?? []
  const activeProjectIds = new Set(activeProjects.map(p => p.id))

  const activeExpenses = (expenses ?? []).filter(
    e => !e.project_id || activeProjectIds.has(e.project_id)
  )

  return (
    <ExpensesClient
      initialExpenses={(activeExpenses as unknown as ExpenseRow[]) ?? []}
      projects={activeProjects}
      suppliers={suppliers ?? []}
      userRole={(userRole as string) ?? ''}
    />
  )
}
