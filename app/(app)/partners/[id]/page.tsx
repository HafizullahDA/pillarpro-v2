import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canViewPartners } from '@/lib/permissions'
import { PartnerDetailClient } from './PartnerDetailClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PartnerDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: userRole } = await supabase.rpc('get_user_role')
  if (!canViewPartners(userRole)) {
    redirect('/dashboard')
  }

  // Fetch partner, organization, projects, transactions, and project equity shares
  const [
    { data: partner },
    { data: orgProfile },
    { data: projects },
    { data: shares },
    { data: transactions },
  ] = await Promise.all([
    supabase
      .from('partners')
      .select('id, name, opening_balance, notes, created_at')
      .eq('id', params.id)
      .maybeSingle(),
    supabase
      .from('organizations')
      .select('name, legal_name')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('projects')
      .select('id, name')
      .eq('archived', false)
      .order('name'),
    supabase
      .from('project_partners')
      .select('id, project_id, partner_id, share_percentage, projects(name)')
      .eq('partner_id', params.id),
    supabase
      .from('partner_transactions')
      .select('*, projects(name)')
      .eq('partner_id', params.id)
      .order('date', { ascending: true })
  ])

  if (!partner) {
    notFound()
  }

  const activeProjects = (projects ?? []).map(p => ({
    id: p.id,
    name: p.name,
  }))

  const projectMap = new Map(activeProjects.map(p => [p.id, p.name]))

  const partnerShares = (shares ?? []).map(s => ({
    project_id: s.project_id,
    projectName: ((s.projects as any)?.name) || projectMap.get(s.project_id) || 'Project',
    share_percentage: Number(s.share_percentage) || 50,
  }))

  const transactionsFormatted = (transactions ?? []).map(t => ({
    id: t.id,
    partner_id: t.partner_id,
    project_id: t.project_id,
    projectName: ((t.projects as any)?.name) || null,
    transaction_type: t.transaction_type,
    purpose: t.purpose || 'other',
    amount: Number(t.amount) || 0,
    date: t.date,
    mode: t.mode || 'cash',
    reference: t.reference || null,
    notes: t.notes || null,
  }))

  const orgName = orgProfile?.legal_name || orgProfile?.name || 'Al Habib Construction Co.'

  return (
    <PartnerDetailClient
      partner={partner}
      projects={activeProjects}
      shares={partnerShares}
      transactions={transactionsFormatted}
      organizationName={orgName}
    />
  )
}
