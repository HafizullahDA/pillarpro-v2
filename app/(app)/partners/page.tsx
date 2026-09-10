import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canViewPartners } from '@/lib/permissions'
import { PartnersClient, PartnerWithFinancials, PartnerTransactionItem, ProjectSummary } from './PartnersClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PartnersPage() {
  const supabase = createClient()
  const { data: userRole } = await supabase.rpc('get_user_role')
  if (!canViewPartners(userRole)) {
    redirect('/dashboard')
  }

  // Fetch projects, partners, transactions, and project equity shares
  const [
    { data: projects },
    { data: partners },
    { data: rawShares },
    { data: transactions }
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, awarded_amount')
      .eq('archived', false)
      .order('name'),
    supabase
      .from('partners')
      .select(`
        id,
        name,
        opening_balance,
        notes,
        partner_transactions (
          id,
          project_id,
          transaction_type,
          purpose,
          amount,
          date,
          mode,
          reference,
          notes
        )
      `)
      .order('name'),
    supabase
      .from('project_partners')
      .select('id, project_id, partner_id, share_percentage, projects(name)')
      .order('created_at', { ascending: true }),
    supabase
      .from('partner_transactions')
      .select('*, partners(name), projects(name)')
      .order('date', { ascending: false })
      .limit(50)
  ])

  const activeProjects: ProjectSummary[] = (projects ?? []).map(p => ({
    id: p.id,
    name: p.name,
    awarded_amount: Number(p.awarded_amount) || 0,
  }))

  const projectMap = new Map(activeProjects.map(p => [p.id, p.name]))

  // Calculate detailed financials per partner
  const partnersFormatted: PartnerWithFinancials[] = (partners ?? []).map(p => {
    let totalCapitalInfused = 0
    let totalOutOfPocket = 0
    let totalDraws = 0

    for (const tx of (p.partner_transactions ?? [])) {
      const amt = Number(tx.amount) || 0
      if (tx.transaction_type === 'paid_by_partner') {
        if (tx.purpose === 'capital_contribution') {
          totalCapitalInfused += amt
        } else {
          totalOutOfPocket += amt
        }
      } else if (tx.transaction_type === 'received_by_partner') {
        totalDraws += amt
      }
    }

    const totalInjected = totalCapitalInfused + totalOutOfPocket
    const balance = (Number(p.opening_balance) || 0) + totalInjected - totalDraws

    // Sort to find latest date
    const sortedTx = [...(p.partner_transactions ?? [])].sort(
      (a: { date: string }, b: { date: string }) => (b.date > a.date ? 1 : -1)
    )
    const lastDate = sortedTx[0]?.date ?? null

    // Project shares for this partner
    const partnerShares = (rawShares ?? [])
      .filter(s => s.partner_id === p.id)
      .map(s => ({
        project_id: s.project_id,
        projectName: ((s.projects as any)?.name) || projectMap.get(s.project_id) || 'Project',
        share_percentage: Number(s.share_percentage) || 50,
      }))

    return {
      id: p.id,
      name: p.name,
      opening_balance: Number(p.opening_balance) || 0,
      notes: p.notes,
      totalCapitalInfused,
      totalOutOfPocket,
      totalInjected,
      totalDraws,
      balance,
      lastDate,
      projectShares: partnerShares,
    }
  })

  // Format recent transactions
  const transactionsFormatted: PartnerTransactionItem[] = (transactions ?? []).map(t => ({
    id: t.id,
    partner_id: t.partner_id,
    partnerName: ((t.partners as any)?.name) || 'Partner',
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

  const rawSharesClean = (rawShares ?? []).map(s => ({
    id: s.id,
    project_id: s.project_id,
    partner_id: s.partner_id,
    share_percentage: Number(s.share_percentage) || 50,
  }))

  return (
    <PartnersClient
      partners={partnersFormatted}
      transactions={transactionsFormatted}
      projects={activeProjects}
      rawShares={rawSharesClean}
    />
  )
}
