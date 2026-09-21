import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProjectLedgerClient } from './ProjectLedgerClient'
import { RawLedgerBill, RawLedgerPayment } from '@/lib/calculations/contractorLedger'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProjectLedgerPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // 1. Fetch project details
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, agency_name, awarded_amount')
    .eq('id', params.id)
    .single()

  if (!project) notFound()

  // 2. Fetch bills and payments in parallel
  const [{ data: billsData }, { data: paymentsData }] = await Promise.all([
    supabase
      .from('ra_bills')
      .select('*')
      .eq('project_id', params.id)
      .order('submission_date', { ascending: true }),
    supabase
      .from('ra_bill_payments')
      .select('*')
      .eq('project_id', params.id)
      .order('payment_date', { ascending: true }),
  ])

  return (
    <ProjectLedgerClient
      project={project}
      bills={(billsData || []) as RawLedgerBill[]}
      payments={(paymentsData || []) as RawLedgerPayment[]}
    />
  )
}

