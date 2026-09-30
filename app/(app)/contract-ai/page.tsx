import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getEffectiveSubscription } from '@/lib/subscription'
import { ContractAiClient } from './ContractAiClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Contract Copilot — AI Contract Defense & Claims Intelligence',
  description:
    'Audit project delays, analyze CPWD/NHAI contract clauses, verify 14-day notice compliance, and prepare claim defense dossiers with PillarPro Contract Copilot.',
}

export default async function ContractAiPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [{ data: userRole }, { data: projects }, { data: contracts }, { data: orgData }] =
    await Promise.all([
      supabase.rpc('get_user_role'),
      supabase
        .from('projects')
        .select('id, name, agency_name, advertised_cost, awarded_amount, start_date, end_date, status, archived')
        .eq('archived', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('project_contracts')
        .select(
          'id, project_id, contract_number, agreement_number, tender_number, employer_name, stipulated_completion_date, extended_completion_date'
        ),
      supabase
        .from('organizations')
        .select('plan_tier, subscription_status, trial_ends_at, current_period_end, created_at')
        .limit(1)
        .maybeSingle(),
    ])

  const effectiveSub = getEffectiveSubscription(orgData)

  return (
    <ContractAiClient
      projects={projects ?? []}
      contracts={contracts ?? []}
      userPlanTier={effectiveSub.planTier}
      userRole={(userRole as string) ?? 'owner'}
    />
  )
}
