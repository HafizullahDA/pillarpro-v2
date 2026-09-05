import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // Role check
  const { data: roleRow } = await supabase
    .from('roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const userRole = roleRow?.role ?? 'site_supervisor'

  // Fetch active projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, agency_name')
    .eq('archived', false)
    .order('name')

  // Fetch bills with payments
  const { data: bills } = await supabase
    .from('bills')
    .select('id, project_id, bill_date, gross_amount, deductions, receivable_payments(amount_received)')

  const billsFormatted = (bills ?? []).map(b => {
    const received = (b.receivable_payments ?? []).reduce((sum: number, p: { amount_received: number }) => sum + (p.amount_received ?? 0), 0)
    const net = (b.gross_amount ?? 0) - (b.deductions ?? 0)
    return {
      id: b.id,
      project_id: b.project_id,
      bill_date: b.bill_date,
      net_amount: net,
      received,
      outstanding: net - received,
    }
  })

  // Fetch vendors with purchases and payments
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, project_id, name, vendor_purchases(amount), vendor_payments(amount)')

  const vendorsFormatted = (vendors ?? []).map(v => {
    const purchased = (v.vendor_purchases ?? []).reduce((sum: number, p: { amount: number }) => sum + (p.amount ?? 0), 0)
    const paid = (v.vendor_payments ?? []).reduce((sum: number, p: { amount: number }) => sum + (p.amount ?? 0), 0)
    return {
      id: v.id,
      project_id: v.project_id,
      name: v.name,
      due: purchased - paid,
    }
  })

  // Fetch central ledger entries
  const { data: ledger } = await supabase
    .from('ledger')
    .select('id, project_id, entry_type, category, amount, date')
    .order('date', { ascending: false })

  return (
    <DashboardClient
      projects={projects ?? []}
      bills={billsFormatted}
      vendors={vendorsFormatted}
      ledger={ledger ?? []}
      userRole={userRole}
    />
  )
}
