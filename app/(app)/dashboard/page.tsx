import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

  // Fetch active projects only
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, agency_name')
    .eq('archived', false)
    .order('name')

  const activeProjects = projects ?? []
  const activeProjectIds = new Set(activeProjects.map(p => p.id))

  // Fetch bills, RA bills, RA tranche payments, suppliers, and ledger
  const [
    { data: raBills },
    { data: raPayments },
    { data: legacyBills },
    { data: suppliers },
    { data: ledger }
  ] = await Promise.all([
    supabase
      .from('ra_bills')
      .select('id, project_id, bill_number, submission_date, net_payable_amount, amount_received, outstanding_balance, status'),
    supabase
      .from('ra_bill_payments')
      .select('id, bill_id, project_id, payment_date, gross_amount, net_bank_amount, voucher_reference, remarks'),
    supabase
      .from('bills')
      .select('id, project_id, bill_date, gross_amount, deductions, receivable_payments(amount_received)'),
    supabase
      .from('suppliers')
      .select('id, name, supplier_transactions(project_id, transaction_type, amount)'),
    supabase
      .from('ledger')
      .select('id, project_id, entry_type, category, amount, date')
      .order('date', { ascending: false })
  ])

  // Format bills: prioritize official ra_bills, supplement with any legacy bills
  const billsFormatted: { id: string; project_id: string; bill_date: string; net_amount: number; received: number; outstanding: number }[] = []
  const trackedBillIds = new Set<string>()

  for (const b of raBills ?? []) {
    if (b.project_id && activeProjectIds.has(b.project_id)) {
      trackedBillIds.add(b.id)
      billsFormatted.push({
        id: b.id,
        project_id: b.project_id,
        bill_date: b.submission_date,
        net_amount: Number(b.net_payable_amount) || 0,
        received: Number(b.amount_received) || 0,
        outstanding: Number(b.outstanding_balance) || 0,
      })
    }
  }

  for (const b of legacyBills ?? []) {
    if (b.project_id && activeProjectIds.has(b.project_id) && !trackedBillIds.has(b.id)) {
      const received = (b.receivable_payments ?? []).reduce((sum: number, p: { amount_received: number }) => sum + (p.amount_received ?? 0), 0)
      const net = (b.gross_amount ?? 0) - (b.deductions ?? 0)
      billsFormatted.push({
        id: b.id,
        project_id: b.project_id,
        bill_date: b.bill_date,
        net_amount: net,
        received,
        outstanding: net - received,
      })
    }
  }

  // Group supplier balances by project (and central)
  const suppliersFormatted: { id: string; project_id: string | null; name: string; due: number }[] = []
  for (const s of suppliers ?? []) {
    const byProject: Record<string, { procured: number; paid: number }> = {}
    for (const t of s.supplier_transactions ?? []) {
      const pid = t.project_id ?? 'central'
      if (!byProject[pid]) byProject[pid] = { procured: 0, paid: 0 }
      if (t.transaction_type === 'procurement') byProject[pid].procured += (t.amount ?? 0)
      else if (t.transaction_type === 'payment') byProject[pid].paid += (t.amount ?? 0)
    }
    for (const [pid, sums] of Object.entries(byProject)) {
      const actualPid = pid === 'central' ? null : pid
      if (!actualPid || activeProjectIds.has(actualPid)) {
        suppliersFormatted.push({
          id: `${s.id}-${pid}`,
          project_id: actualPid,
          name: s.name,
          due: sums.procured - sums.paid,
        })
      }
    }
  }

  // Fetch central ledger entries (filter out project-specific entries for archived projects)
  const ledgerFiltered = (ledger ?? []).filter(
    item => !item.project_id || activeProjectIds.has(item.project_id)
  )

  // Map RA payments to ledger entries to ensure statutory gross & net bank credits are captured
  const existingIncomeKeys = new Set(
    ledgerFiltered
      .filter(l => l.entry_type === 'income')
      .map(l => `${l.project_id}-${l.date}-${l.amount}`)
  )

  const raPaymentEntries = (raPayments ?? [])
    .filter(p => p.project_id && activeProjectIds.has(p.project_id))
    .filter(p => !existingIncomeKeys.has(`${p.project_id}-${p.payment_date}-${p.gross_amount}`) &&
                 !existingIncomeKeys.has(`${p.project_id}-${p.payment_date}-${p.net_bank_amount}`))
    .map(p => ({
      id: p.id,
      project_id: p.project_id,
      entry_type: 'income',
      category: 'ra_bill_payment',
      amount: Number(p.gross_amount) || 0,
      net_bank_amount: Number(p.net_bank_amount) || 0,
      date: p.payment_date,
    }))

  // Associate net_bank_amount with existing ledger entries matching raPayments
  const raPaymentNetByGross = new Map(
    (raPayments ?? []).map(p => [`${p.project_id}-${p.payment_date}-${p.gross_amount}`, Number(p.net_bank_amount)])
  )

  const unifiedLedger = [
    ...ledgerFiltered.map(l => ({
      ...l,
      net_bank_amount: l.entry_type === 'income' ? (raPaymentNetByGross.get(`${l.project_id}-${l.date}-${l.amount}`) ?? l.amount) : undefined,
    })),
    ...raPaymentEntries,
  ]

  return (
    <DashboardClient
      projects={activeProjects}
      bills={billsFormatted}
      suppliers={suppliersFormatted}
      ledger={unifiedLedger}
      userRole={userRole}
    />
  )
}
