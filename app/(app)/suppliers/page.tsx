import { createClient } from '@/lib/supabase/server'
import { SuppliersClient, SupplierSummaryRow } from './SuppliersClient'

export const dynamic = 'force-dynamic'

export default async function SuppliersPage() {
  const supabase = createClient()

  const [{ data: suppliers }, { data: projects }] = await Promise.all([
    supabase
      .from('supplier_summary')
      .select('*')
      .order('name'),
    supabase
      .from('projects')
      .select('id, name')
      .order('name'),
  ])

  return (
    <SuppliersClient
      initialSuppliers={(suppliers as SupplierSummaryRow[]) ?? []}
      projects={projects ?? []}
    />
  )
}

