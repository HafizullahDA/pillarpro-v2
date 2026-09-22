import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { InventoryClient, InventoryItemRow, InventoryTrxRow } from './InventoryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Physical Store & Inventory | PillarPro',
}

export default async function InventoryPage() {
  const supabase = createClient()

  const [
    { data: userRole },
    { data: projects },
    { data: suppliers },
    { data: items, error: itemsError },
    { data: transactions },
  ] = await Promise.all([
    supabase.rpc('get_user_role'),
    supabase.from('projects').select('id, name').eq('archived', false).order('name'),
    supabase.from('suppliers').select('id, name').order('name'),
    supabase
      .from('inventory_items')
      .select('id, item_name, item_code, category, unit, current_stock, minimum_stock_alert, wastage_threshold_pct, notes, project_id, projects(name)')
      .order('item_name', { ascending: true }),
    supabase
      .from('inventory_transactions')
      .select('id, item_id, project_id, supplier_id, transaction_type, quantity, transaction_date, destination_location, issued_to_person, challan_number, vehicle_number, remarks, inventory_items(item_name, unit), projects(name), suppliers(name)')
      .order('transaction_date', { ascending: false })
      .limit(150),
  ])

  const isTableMissing = !!(
    itemsError &&
    (itemsError.message?.includes('schema cache') ||
      itemsError.message?.includes('inventory_items') ||
      (itemsError as any).code === 'PGRST205')
  )

  return (
    <InventoryClient
      initialItems={(items as unknown as InventoryItemRow[]) ?? []}
      initialTransactions={(transactions as unknown as InventoryTrxRow[]) ?? []}
      projects={projects ?? []}
      suppliers={suppliers ?? []}
      userRole={(userRole as string) ?? ''}
      isTableMissing={isTableMissing}
    />
  )
}

