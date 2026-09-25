import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { RABillsClient } from '@/app/(app)/ra-bills/RABillsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Client & RA Bills | Project Ledgers | PillarPro',
}

export default async function RABillsLedgerPage() {
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
      .select('id, name, agency_name, advertised_cost, awarded_amount')
      .eq('archived', false)
      .order('name'),
    supabase
      .from('ra_bills')
      .select(`
        id,
        project_id,
        bill_number,
        bill_type,
        billing_entry_mode,
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
        mb_number,
        mb_page_start,
        mb_page_end,
        measurement_date,
        measuring_officer_name,
        measuring_officer_designation,
        advance_payments_unmeasured,
        cement_recovery,
        steel_recovery,
        other_material_recovery,
        actual_completion_date,
        dlp_months,
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
      .select('id, ra_bill_id, deduction_label, deduction_amount'),
  ])

  // Attach itemized deductions to corresponding bills
  const billsWithDeductions = (bills ?? []).map(b => ({
    ...b,
    bill_deductions: (deductions ?? []).filter(d => d.ra_bill_id === b.id),
  }))

  return (
    <RABillsClient
      initialBills={billsWithDeductions as any}
      initialDeposits={(deposits as any) ?? []}
      projects={projects ?? []}
      userRole={(userRole as string) ?? ''}
    />
  )
}

