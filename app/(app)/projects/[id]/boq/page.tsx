import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BOQClient } from './BOQClient'
import { BOQSummaryItem, BOQItem } from '@/lib/types/boq'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProjectBOQPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // 1. Fetch project details
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, agency_name, awarded_amount')
    .eq('id', params.id)
    .single()

  if (!project) notFound()

  // 2. Fetch summary items via RPC and raw items for drawer editing
  const [{ data: summaryData, error: summaryErr }, { data: rawItemsData }] = await Promise.all([
    supabase.rpc('get_project_boq_summary', { p_project_id: params.id }),
    supabase
      .from('boq_items')
      .select('*')
      .eq('project_id', params.id)
      .order('created_at', { ascending: true }),
  ])

  // Fallback if RPC returns null or schema hasn't migrated yet
  let initialItems: BOQSummaryItem[] = []
  if (summaryData && Array.isArray(summaryData)) {
    initialItems = summaryData as BOQSummaryItem[]
  } else if (rawItemsData && Array.isArray(rawItemsData)) {
    // Basic fallback mapping from raw items if RPC is not yet executed on remote DB
    initialItems = rawItemsData.map((item: any) => ({
      boq_item_id: item.id,
      item_number: item.item_number,
      description: item.description,
      unit: item.unit,
      tender_quantity: Number(item.tender_quantity) || 0,
      awarded_rate: Number(item.awarded_rate) || 0,
      tender_amount: Number(item.total_amount) || 0,
      cumulative_executed_qty: 0,
      remaining_qty: Number(item.tender_quantity) || 0,
      cumulative_executed_amount: 0,
      work_done_percentage: 0,
    }))
  }

  return (
    <BOQClient
      project={project}
      initialItems={initialItems}
      rawItems={(rawItemsData || []) as BOQItem[]}
    />
  )
}
