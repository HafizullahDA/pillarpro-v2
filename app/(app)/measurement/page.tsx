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

  // 1. Fetch user projects and role first
  const [{ data: projectsData }, { data: userRole }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, agency_name, awarded_amount')
      .order('created_at', { ascending: false }),
    supabase.rpc('get_user_role'),
  ])

  const projects = Array.isArray(projectsData) ? projectsData : []
  const projectIds = projects.map(p => p.id)

  if (projectIds.length === 0) {
    return (
      <MeasurementClient
        projects={[]}
        contracts={[]}
        boqItems={[]}
        measurementBooks={[]}
        initialEntries={[]}
        adjustments={[]}
        documents={[]}
        certificates={[]}
        userRole={userRole || 'owner'}
      />
    )
  }

  // 2. Fetch measurement data strictly scoped to projectIds
  const [
    { data: contractsData },
    { data: boqData },
    { data: booksData },
    { data: entriesData },
    { data: adjustmentsData },
    { data: documentsData },
    { data: certificatesData },
  ] = await Promise.all([
    supabase
      .from('contracts')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('boq_items')
      .select('*')
      .in('project_id', projectIds)
      .order('item_number', { ascending: true }),
    supabase
      .from('measurement_books')
      .select('*')
      .in('project_id', projectIds)
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
      .in('project_id', projectIds)
      .order('measurement_date', { ascending: false }),
    supabase
      .from('measurement_adjustments')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('measurement_documents')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('measurement_certificates')
      .select('*')
      .in('project_id', projectIds)
      .order('certificate_date', { ascending: false }),
  ])

  const projectIdSet = new Set(projectIds)

  const contracts: ContractRecord[] = Array.isArray(contractsData)
    ? (contractsData as ContractRecord[]).filter(c => projectIdSet.has(c.project_id))
    : []
  const boqItems: BOQItem[] = Array.isArray(boqData)
    ? (boqData as BOQItem[]).filter(b => projectIdSet.has(b.project_id))
    : []
  const measurementBooks: MeasurementBook[] = Array.isArray(booksData)
    ? (booksData as MeasurementBook[]).filter(b => projectIdSet.has(b.project_id))
    : []
  const initialEntries: MeasurementEntry[] = Array.isArray(entriesData)
    ? (entriesData as MeasurementEntry[]).filter(e => projectIdSet.has(e.project_id))
    : []
  const adjustments: MeasurementAdjustment[] = Array.isArray(adjustmentsData)
    ? (adjustmentsData as MeasurementAdjustment[]).filter(a => projectIdSet.has(a.project_id))
    : []
  const documents: MeasurementDocument[] = Array.isArray(documentsData)
    ? (documentsData as MeasurementDocument[]).filter(d => projectIdSet.has(d.project_id))
    : []
  const certificates: MeasurementCertificate[] = Array.isArray(certificatesData)
    ? (certificatesData as MeasurementCertificate[]).filter(c => projectIdSet.has(c.project_id))
    : []

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
