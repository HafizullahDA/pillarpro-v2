import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SuppliersClient, SupplierSummaryRow } from './SuppliersClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Supplier Khata',
}

export default async function SuppliersPage() {
  const supabase = createClient()

  const [{ data: userRole }, { data: suppliers }, { data: projects }] = await Promise.all([
    supabase.rpc('get_user_role'),
    supabase
      .from('supplier_summary')
      .select('id, name, contact_number, gst_number, address, created_at, updated_at, total_procured, total_paid, outstanding_balance')
      .order('name'),
    supabase
      .from('projects')
      .select('id, name')
      .eq('archived', false)
      .order('name'),
  ])

  return (
    <SuppliersClient
      initialSuppliers={(suppliers as SupplierSummaryRow[]) ?? []}
      projects={projects ?? []}
      userRole={(userRole as string) ?? ''}
    />
  )
}

