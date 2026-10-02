import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ExpensesClient, ExpenseRow } from '@/app/(app)/expenses/ExpensesClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Site Cash & Expenses | Project Ledgers | PillarPro',
}

export default async function ExpensesLedgerPage() {
  const supabase = createClient()
  const [{ data: userRole }, { data: projectsData }] = await Promise.all([
    supabase.rpc('get_user_role'),
    supabase.from('projects').select('id, name').eq('archived', false).order('name'),
  ])

  const activeProjects = projectsData ?? []
  const projectIds = activeProjects.map(p => p.id)

  if (projectIds.length === 0) {
    return (
      <ExpensesClient
        initialExpenses={[]}
        projects={[]}
        suppliers={[]}
        partners={[]}
        userRole={(userRole as string) ?? ''}
      />
    )
  }

  const [
    { data: suppliers },
    { data: partners },
    { data: expenses },
  ] = await Promise.all([
    supabase.from('suppliers').select('id, name').order('name'),
    supabase.from('partners').select('id, name').order('name'),
    supabase
      .from('expenses')
      .select('id, project_id, description, category, amount, date, mode, receipt_url, paid_by_partner_id, projects(name), partners(name)')
      .in('project_id', projectIds)
      .order('date', { ascending: false })
      .limit(100),
  ])

  const activeProjectIds = new Set(projectIds)

  const activeExpenses = (expenses ?? []).map((e: any) => ({
    ...e,
    payment_mode: e.mode || e.payment_mode || 'Cash',
  })).filter(
    (e: any) => e.project_id && activeProjectIds.has(e.project_id)
  )

  return (
    <ExpensesClient
      initialExpenses={(activeExpenses as unknown as ExpenseRow[]) ?? []}
      projects={activeProjects}
      suppliers={suppliers ?? []}
      partners={partners ?? []}
      userRole={(userRole as string) ?? ''}
    />
  )
}

