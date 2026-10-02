import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getEffectiveSubscription } from '@/lib/subscription'
import { ContractAiClient } from './ContractAiClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'ContractIQ — AI Contract Defense & Claims Intelligence Engine',
  description:
    'Audit project delays, analyze CPWD/NHAI contract clauses, verify 14-day notice compliance, and prepare claim defense dossiers with PillarPro ContractIQ.',
}

export default async function ContractAiPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [{ data: userRole }, { data: projectsData }, { data: orgData }] =
    await Promise.all([
      supabase.rpc('get_user_role'),
      supabase
        .from('projects')
        .select('id, name, agency_name, advertised_cost, awarded_amount, start_date, end_date, status, archived')
        .eq('archived', false)
        .order('created_at', { ascending: false }),
      supabase.rpc('get_organization_profile'),
    ])

  const projects = Array.isArray(projectsData) ? projectsData : []
  const projectIds = projects.map(p => p.id)

  const contractsData = projectIds.length > 0
    ? (await supabase
        .from('contracts')
        .select(
          'id, project_id, agreement_number, work_order_number, nit_number, employer_name, original_completion_date, current_completion_date'
        )
        .in('project_id', projectIds)).data ?? []
    : []

  const effectiveSub = getEffectiveSubscription(orgData as any)

  const projectIdSet = new Set(projectIds)
  const mappedContracts = (contractsData ?? [])
    .filter((c: any) => projectIdSet.has(c.project_id))
    .map((c: any) => ({
      id: c.id,
      project_id: c.project_id,
      contract_number: c.agreement_number || c.work_order_number || null,
      agreement_number: c.agreement_number || null,
      tender_number: c.nit_number || null,
      employer_name: c.employer_name || null,
      stipulated_completion_date: c.original_completion_date || null,
      extended_completion_date: c.current_completion_date || null,
    }))

  return (
    <ContractAiClient
      projects={projects ?? []}
      contracts={mappedContracts}
      userPlanTier={effectiveSub.planTier}
      userRole={(userRole as string) ?? 'owner'}
    />
  )
}
