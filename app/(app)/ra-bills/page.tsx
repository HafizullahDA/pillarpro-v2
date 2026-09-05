import { createClient } from '@/lib/supabase/server'
import { RABillsClient, RABillRow, SecurityDepositRow } from './RABillsClient'
import { ProjectOption } from './RABillActions'

export const dynamic = 'force-dynamic'

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

  return (
    <RABillsClient
      initialBills={(bills as unknown as RABillRow[]) ?? []}
      initialDeposits={(deposits as unknown as SecurityDepositRow[]) ?? []}
      projects={(projects as ProjectOption[]) ?? []}
    />
  )
}

