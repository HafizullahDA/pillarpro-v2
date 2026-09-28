import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BOQItemDetailClient } from './BOQItemDetailClient'
import { BOQItem, BOQItemRevision } from '@/lib/types/boq'
import { ContractRecord } from '@/lib/types/contract'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function BOQItemDetailPage({
  params,
}: {
  params: { id: string; itemId: string }
}) {
  const supabase = createClient()

  // 1. Fetch project details
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, agency_name, awarded_amount')
    .eq('id', params.id)
    .single()

  if (!project) notFound()

  // 2. Fetch the specific BOQ item
  const { data: rawItem } = await supabase
    .from('boq_items')
    .select('*')
    .eq('id', params.itemId)
    .eq('project_id', params.id)
    .single()

  if (!rawItem) notFound()

  // 3. Fetch linked contract (if available)
  const { data: contractData } = await supabase
    .from('contracts')
    .select('*')
    .eq('project_id', params.id)
    .order('is_primary', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 4. Fetch measurement and billing history from ra_bill_items
  const { data: billingHistory } = await supabase
    .from('ra_bill_items')
    .select(`
      id,
      ra_bill_id,
      previous_quantity,
      current_quantity,
      cumulative_quantity,
      rate,
      current_amount,
      cumulative_amount,
      remarks,
      created_at,
      ra_bills (
        id,
        bill_number,
        bill_type,
        submission_date,
        status
      )
    `)
    .eq('boq_item_id', params.itemId)
    .order('created_at', { ascending: false })

  // 5. Fetch quantity revisions and variations
  const { data: revisionsData } = await supabase
    .from('boq_item_revisions')
    .select('*')
    .eq('boq_item_id', params.itemId)
    .order('created_at', { ascending: false })

  // 6. User role
  const { data: userRole } = await supabase.rpc('get_user_role')

  return (
    <BOQItemDetailClient
      project={project}
      contract={contractData as ContractRecord | null}
      item={rawItem as BOQItem}
      billingHistory={billingHistory || []}
      revisions={(revisionsData as BOQItemRevision[]) || []}
      userRole={userRole as string | null}
    />
  )
}
