import { createClient } from '@/lib/supabase/server'
import { RABillsClient, RABillRow, SecurityDepositRow } from './RABillsClient'
import { ProjectOption } from './RABillActions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function RABillsPage() {
  const supabase = createClient()

  const [
    { data: userRole },
    { data: projects },
    { data: bills },
    { data: deposits },
    { data: deductions },
  ] = await Promise.all([
    supabase.rpc('get_user_role'),
    supabase
      .from('projects')
      .select('id, name, agency_name')
      .eq('archived', false)
      .order('name'),
    supabase
      .from('ra_bills')
      .select(`
        id,
        project_id,
        bill_number,
        submission_date,
        work_certified_amount,
        retention_percentage,
        retention_amount,
        net_payable_amount,
        amount_received,
        tds_deducted,
        gst_tds_deducted,
        labour_cess_deducted,
        other_deductions,
        total_deductions,
        net_bank_received,
        date_received,
        outstanding_balance,
        status,
        billing_mode,
        previous_bill_id,
        cumulative_certified_amount,
        previous_certified_amount,
        previous_received_amount,
        net_payable_this_bill,
        this_bill_work_certified,
        document_url,
        remarks,
        projects (name, agency_name)
      `)
      .order('submission_date', { ascending: false }),
    supabase
      .from('security_deposits')
      .select(`
        id,
        project_id,
        deposit_type,
        reference_number,
        issuing_bank,
        amount,
        issue_date,
        expiry_date,
        claim_expiry_date,
        status,
        document_url,
        notes,
        projects (name)
      `)
      .order('expiry_date', { ascending: true }),
    supabase
      .from('bill_deductions')
      .select('id, bill_id, payment_id, deduction_label, deduction_amount')
      .order('created_at', { ascending: true }),
  ])

  const deductionsByBill = new Map<string, { id: string; deduction_label: string; deduction_amount: number }[]>()
  if (deductions) {
    for (const d of deductions as any[]) {
      if (!deductionsByBill.has(d.bill_id)) {
        deductionsByBill.set(d.bill_id, [])
      }
      deductionsByBill.get(d.bill_id)!.push({
        id: d.id,
        deduction_label: d.deduction_label,
        deduction_amount: Number(d.deduction_amount) || 0,
      })
    }
  }

  const activeProjects = (projects as ProjectOption[]) ?? []
  const activeProjectIds = new Set(activeProjects.map(p => p.id))

  const activeBills = ((bills as unknown as RABillRow[]) ?? [])
    .filter(b => b.project_id && activeProjectIds.has(b.project_id))
    .map(b => ({
      ...b,
      bill_deductions: deductionsByBill.get(b.id) || [],
    }))
  const activeDeposits = ((deposits as unknown as SecurityDepositRow[]) ?? []).filter(
    d => d.project_id && activeProjectIds.has(d.project_id)
  )

  return (
    <RABillsClient
      initialBills={activeBills}
      initialDeposits={activeDeposits}
      projects={activeProjects}
      userRole={userRole}
    />
  )
}

