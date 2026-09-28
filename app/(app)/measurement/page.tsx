import { createClient } from '@/lib/supabase/server'
import { MeasurementClient } from './MeasurementClient'
import { BOQItem } from '@/lib/types/boq'
import { ContractRecord } from '@/lib/types/contract'
import {
  MeasurementBook,
  MeasurementEntry,
  MeasurementAdjustment,
  MeasurementDocument,
  MeasurementCertificate,
} from '@/lib/types/measurement'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MeasurementPage() {
  const supabase = createClient()

  const [
    { data: projectsData },
    { data: contractsData },
    { data: boqData },
    { data: booksData },
    { data: entriesData },
    { data: adjustmentsData },
    { data: documentsData },
    { data: certificatesData },
    { data: userRole },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, agency_name, awarded_amount')
      .order('created_at', { ascending: false }),
    supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('boq_items')
      .select('*')
      .order('item_number', { ascending: true }),
    supabase
      .from('measurement_books')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('measurement_entries')
      .select(`
        *,
        boq_items:boq_item_id (
          id,
          item_number,
          description,
          unit,
          contract_quantity,
          contract_rate,
          contract_amount,
          item_type
        )
      `)
      .order('measurement_date', { ascending: false }),
    supabase
      .from('measurement_adjustments')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('measurement_documents')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('measurement_certificates')
      .select('*')
      .order('certificate_date', { ascending: false }),
    supabase.rpc('get_user_role'),
  ])

  const projects = Array.isArray(projectsData) ? projectsData : []
  const contracts: ContractRecord[] = Array.isArray(contractsData) ? (contractsData as ContractRecord[]) : []
  const boqItems: BOQItem[] = Array.isArray(boqData) ? (boqData as BOQItem[]) : []
  const measurementBooks: MeasurementBook[] = Array.isArray(booksData) ? (booksData as MeasurementBook[]) : []
  const initialEntries: MeasurementEntry[] = Array.isArray(entriesData) ? (entriesData as MeasurementEntry[]) : []
  const adjustments: MeasurementAdjustment[] = Array.isArray(adjustmentsData) ? (adjustmentsData as MeasurementAdjustment[]) : []
  const documents: MeasurementDocument[] = Array.isArray(documentsData) ? (documentsData as MeasurementDocument[]) : []
  const certificates: MeasurementCertificate[] = Array.isArray(certificatesData) ? (certificatesData as MeasurementCertificate[]) : []

  return (
    <MeasurementClient
      projects={projects}
      contracts={contracts}
      boqItems={boqItems}
      measurementBooks={measurementBooks}
      initialEntries={initialEntries}
      adjustments={adjustments}
      documents={documents}
      certificates={certificates}
      userRole={userRole || 'owner'}
    />
  )
}
