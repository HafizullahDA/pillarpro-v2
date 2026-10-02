import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { InventoryClient, InventoryItemRow, InventoryTrxRow } from '@/app/(app)/inventory/InventoryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Store & Stock Register | Project Ledgers | PillarPro',
}

export default async function InventoryLedgerPage() {
  const supabase = createClient()

  const [{ data: userRole }, { data: projectsData }] = await Promise.all([
    supabase.rpc('get_user_role'),
    supabase.from('projects').select('id, name').eq('archived', false).order('name'),
  ])

  const projects = projectsData ?? []
  const projectIds = projects.map(p => p.id)

  if (projectIds.length === 0) {
    return (
      <InventoryClient
        initialItems={[]}
        initialTransactions={[]}
        projects={[]}
        suppliers={[]}
        userRole={(userRole as string) ?? ''}
        isTableMissing={false}
      />
    )
  }

  const [
    { data: suppliers },
    { data: items, error: itemsError },
    { data: transactions },
  ] = await Promise.all([
    supabase.from('suppliers').select('id, name').order('name'),
    supabase
      .from('inventory_items')
      .select('id, item_name, item_code, category, unit, current_stock, minimum_stock_alert, wastage_threshold_pct, notes, project_id, projects(name)')
      .in('project_id', projectIds)
      .order('item_name', { ascending: true }),
    supabase
      .from('inventory_transactions')
      .select('id, item_id, project_id, supplier_id, transaction_type, quantity, transaction_date, destination_location, issued_to_person, challan_number, vehicle_number, remarks, inventory_items(item_name, unit), projects(name), suppliers(name)')
      .in('project_id', projectIds)
      .order('transaction_date', { ascending: false })
      .limit(150),
  ])

  const projectIdSet = new Set(projectIds)
  const filteredItems = (items ?? []).filter((i: any) => projectIdSet.has(i.project_id))
  const filteredTransactions = (transactions ?? []).filter((t: any) => projectIdSet.has(t.project_id))

  const isTableMissing = !!(
    itemsError &&
    (itemsError.message?.includes('schema cache') ||
      itemsError.message?.includes('inventory_items') ||
      (itemsError as any).code === 'PGRST205')
  )

  return (
    <InventoryClient
      initialItems={(filteredItems as unknown as InventoryItemRow[]) ?? []}
      initialTransactions={(filteredTransactions as unknown as InventoryTrxRow[]) ?? []}
      projects={projects ?? []}
      suppliers={suppliers ?? []}
      userRole={(userRole as string) ?? ''}
      isTableMissing={isTableMissing}
    />
  )
}

