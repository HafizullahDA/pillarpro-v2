import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'
import {
  ContractItem,
  SecurityDepositItem,
  BOQItemSummary,
  MeasurementEntrySummary,
  ContractEventSummary,
  HindranceSummary,
  CorrespondenceSummary,
  EOTCaseSummary,
  VariationSummary,
  ClaimSummary,
  MachineryAssetSummary,
  InventoryItemSummary,
  WagePaymentSummary,
} from '@/components/dashboard/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Government Contractor Command Center | PillarPro',
}

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

  const activeProjects = projects ?? []
  const activeProjectIds = new Set(activeProjects.map(p => p.id))

  // Fetch all core Command Center operational & financial tables concurrently
  const [
    { data: raBills },
    { data: raPayments },
    { data: legacyBills },
    { data: suppliers },
    { data: ledger },
    { data: contractsData },
    { data: securityDepositsData },
    { data: boqItemsData },
    { data: measurementsData },
    { data: contractEventsData },
    { data: hindrancesData },
    { data: correspondenceData },
    { data: eotCasesData },
    { data: variationsData },
    { data: claimsData },
    { data: machineryData },
    { data: inventoryData },
    { data: wagePaymentsData },
  ] = await Promise.all([
    supabase
      .from('ra_bills')
      .select('id, project_id, bill_number, submission_date, net_payable_amount, work_certified_amount, retention_amount, amount_received, net_bank_received, status, billing_mode, this_bill_work_certified, net_payable_this_bill'),
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
      .select('id, project_id, entry_type, category, amount, date, source_table')
      .order('date', { ascending: false }),
    supabase
      .from('contracts')
      .select('id, project_id, agreement_number, contract_title, awarded_amount, original_completion_date, current_completion_date, dlp_end_date, status, retention_percentage, security_deposit_amount, performance_security_amount'),
    supabase
      .from('security_deposits')
      .select('id, project_id, deposit_type, reference_number, issuing_bank, amount, expiry_date, claim_expiry_date, status'),
    supabase
      .from('boq_items')
      .select('id, project_id, contract_id, item_number, description, unit, quantity, rate, amount, measured_quantity, certified_quantity, billed_quantity'),
    supabase
      .from('measurement_entries')
      .select('id, project_id, contract_id, entry_number, measurement_date, calculated_quantity, status, boq_item_id, billed_in_ra_bill_id'),
    supabase
      .from('contract_events')
      .select('id, project_id, contract_id, event_number, event_type, event_date, description, status, estimated_delay_days, actual_delay_days, financial_impact'),
    supabase
      .from('hindrances')
      .select('id, project_id, contract_id, hindrance_number, description, start_date, end_date, status, notice_served, net_delay_days'),
    supabase
      .from('contract_correspondence')
      .select('id, project_id, contract_id, reference_number, letter_number, date, direction, category, sender, recipient, subject, response_required, response_deadline, responded_date, status'),
    supabase
      .from('contract_eot_cases')
      .select('id, project_id, contract_id, eot_reference, cause, claimed_days, approved_days, pending_days, submission_date, department_response_date, current_completion_date, revised_completion_date, status'),
    supabase
      .from('contract_variations')
      .select('id, project_id, contract_id, reference_number, type, proposed_amount, approved_amount, status, is_deletion, deleted_work_amount, approval_date'),
    supabase
      .from('contract_claims')
      .select('id, project_id, contract_id, claim_number, claim_type, title, claim_date, claimed_amount, approved_amount, paid_amount, outstanding_amount, status'),
    supabase
      .from('machinery_assets')
      .select('id, project_id, asset_name, asset_type, status'),
    supabase
      .from('inventory_items')
      .select('id, project_id, item_name, unit, current_stock, minimum_stock_alert'),
    supabase
      .from('wage_payments')
      .select('id, project_id, worker_id, amount_owed, amount_paid, status'),
  ])

  // Format bills: prioritize official ra_bills, supplement with any legacy bills
  const billsFormatted: { id: string; project_id: string; bill_date: string; net_amount: number; received: number; net_bank_received?: number; outstanding: number }[] = []
  const trackedBillIds = new Set<string>()

  for (const b of raBills ?? []) {
    if (b.project_id && activeProjectIds.has(b.project_id)) {
      trackedBillIds.add(b.id)
      const netPassed = b.net_payable_this_bill != null
        ? Number(b.net_payable_this_bill)
        : (Number(b.net_payable_amount) != null && !isNaN(Number(b.net_payable_amount))
          ? Number(b.net_payable_amount)
          : (Number(b.work_certified_amount) - (Number(b.retention_amount) || 0)))
      const received = Number(b.amount_received) || 0
      const netBankReceived = b.net_bank_received != null && !isNaN(Number(b.net_bank_received))
        ? Number(b.net_bank_received)
        : received
      const outstanding = Math.max(0, netPassed - received)

      billsFormatted.push({
        id: b.id,
        project_id: b.project_id,
        bill_date: b.submission_date,
        net_amount: netPassed,
        received,
        net_bank_received: netBankReceived,
        outstanding,
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
        net_bank_received: received,
        outstanding: Math.max(0, net - received),
      })
    }
  }

  // Group supplier balances
  const suppliersFormatted: { id: string; supplier_id: string; project_id: string | null; name: string; due: number }[] = []
  for (const s of suppliers ?? []) {
    let totalProcured = 0
    let totalPaid = 0
    const byProject: Record<string, { procured: number; paid: number }> = {}

    for (const t of s.supplier_transactions ?? []) {
      const pid = t.project_id ?? 'central'
      if (!byProject[pid]) byProject[pid] = { procured: 0, paid: 0 }
      const amt = Number(t.amount) || 0
      if (t.transaction_type === 'procurement') {
        byProject[pid].procured += amt
        totalProcured += amt
      } else if (t.transaction_type === 'payment') {
        byProject[pid].paid += amt
        totalPaid += amt
      }
    }

    suppliersFormatted.push({
      id: `${s.id}-all`,
      supplier_id: s.id,
      project_id: null,
      name: s.name,
      due: Math.max(0, totalProcured - totalPaid),
    })

    for (const [pid, sums] of Object.entries(byProject)) {
      const actualPid = pid === 'central' ? null : pid
      if (actualPid && activeProjectIds.has(actualPid)) {
        suppliersFormatted.push({
          id: `${s.id}-${pid}`,
          supplier_id: s.id,
          project_id: actualPid,
          name: s.name,
          due: Math.max(0, sums.procured - sums.paid),
        })
      }
    }
  }

  // Filter central ledger entries
  const ledgerFiltered = (ledger ?? []).filter(
    item => !item.project_id || activeProjectIds.has(item.project_id)
  )

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

  // Organization profile
  const { data: orgProfile } = await supabase.rpc('get_organization_profile')
  const orgName = (orgProfile as any)?.name ?? null

  return (
    <DashboardClient
      projects={activeProjects}
      bills={billsFormatted}
      suppliers={suppliersFormatted}
      ledger={unifiedLedger}
      userRole={userRole}
      orgName={orgName}
      // Command Center Data Feeds
      rawRABills={(raBills ?? []) as any}
      contracts={((contractsData ?? []) as any[]).filter(c => activeProjectIds.has(c.project_id)) as ContractItem[]}
      securityDeposits={((securityDepositsData ?? []) as any[]).filter(s => activeProjectIds.has(s.project_id)) as SecurityDepositItem[]}
      boqItems={((boqItemsData ?? []) as any[]).filter(b => activeProjectIds.has(b.project_id)) as BOQItemSummary[]}
      measurements={((measurementsData ?? []) as any[]).filter(m => activeProjectIds.has(m.project_id)) as MeasurementEntrySummary[]}
      contractEvents={((contractEventsData ?? []) as any[]).filter(e => activeProjectIds.has(e.project_id)) as ContractEventSummary[]}
      hindrances={((hindrancesData ?? []) as any[]).filter(h => activeProjectIds.has(h.project_id)) as HindranceSummary[]}
      correspondence={((correspondenceData ?? []) as any[]).filter(c => activeProjectIds.has(c.project_id)) as CorrespondenceSummary[]}
      eotCases={((eotCasesData ?? []) as any[]).filter(e => activeProjectIds.has(e.project_id)) as EOTCaseSummary[]}
      variations={((variationsData ?? []) as any[]).filter(v => activeProjectIds.has(v.project_id)) as VariationSummary[]}
      claims={((claimsData ?? []) as any[]).filter(c => activeProjectIds.has(c.project_id)) as ClaimSummary[]}
      machineryAssets={((machineryData ?? []) as any[]).filter(m => !m.project_id || activeProjectIds.has(m.project_id)) as MachineryAssetSummary[]}
      inventoryItems={((inventoryData ?? []) as any[]).filter(i => !i.project_id || activeProjectIds.has(i.project_id)) as InventoryItemSummary[]}
      wagePayments={((wagePaymentsData ?? []) as any[]).filter(w => activeProjectIds.has(w.project_id)) as WagePaymentSummary[]}
    />
  )
}
