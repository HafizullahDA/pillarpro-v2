import { createClient } from '@/lib/supabase/server'
import { RABillsClient, RABillRow, SecurityDepositRow } from './RABillsClient'
import { ProjectOption } from './RABillActions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function RABillsPage() {
  const supabase = createClient()

  const [
    { data: projects },
    { data: bills },
    { data: deposits },
  ] = await Promise.all([
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
  ])

  const activeProjects = (projects as ProjectOption[]) ?? []
  const activeProjectIds = new Set(activeProjects.map(p => p.id))

  const activeBills = ((bills as unknown as RABillRow[]) ?? []).filter(
    b => b.project_id && activeProjectIds.has(b.project_id)
  )
  const activeDeposits = ((deposits as unknown as SecurityDepositRow[]) ?? []).filter(
    d => d.project_id && activeProjectIds.has(d.project_id)
  )

  return (
    <RABillsClient
      initialBills={activeBills}
      initialDeposits={activeDeposits}
      projects={activeProjects}
    />
  )
}

