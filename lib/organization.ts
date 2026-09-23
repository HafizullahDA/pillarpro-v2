import { createClient } from '@/lib/supabase/client'

export interface OrganizationProfile {
  id: string
  name: string
  legal_name?: string | null
  registration_no?: string | null
  gstin?: string | null
  pan?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  logo_url?: string | null
  signature_url?: string | null
  plan_tier?: string | null
  subscription_status?: string | null
  trial_ends_at?: string | null
  current_period_end?: string | null
  max_active_sites?: number | null
  billing_cycle?: string | null
  created_at?: string | null
  user_created_at?: string | null
}

export const DEFAULT_ORGANIZATION: OrganizationProfile = {
  id: 'default-org',
  name: 'Hafizullah Lone Constructions',
  legal_name: 'Hafizullah Lone Constructions & Infrastructure',
  registration_no: 'Class-A Govt Contractor, PWD / PMGSY',
  gstin: '',
  pan: '',
  address: 'Srinagar, Jammu & Kashmir',
  phone: '',
  email: '',
  logo_url: null,
  signature_url: null,
  plan_tier: 'growth',
  subscription_status: 'trialing',
  trial_ends_at: null,
  current_period_end: null,
  max_active_sites: 6,
  billing_cycle: 'monthly',
}

/**
 * Fetch the active organization profile client-side.
 * Uses get_organization_profile RPC with fallback to querying public.organizations or DEFAULT_ORGANIZATION.
 * Accurately merges user signup timestamp (created_at) for real-time trial deduction.
 */
export async function getClientOrganization(): Promise<OrganizationProfile> {
  const supabase = createClient()

  let userCreatedAt: string | null = null
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.created_at) {
      userCreatedAt = user.created_at
    }
  } catch {
    // ignore
  }

  try {
    const { data, error } = await supabase.rpc('get_organization_profile')
    if (!error && data) {
      const orgData = data as OrganizationProfile
      return {
        ...orgData,
        created_at: userCreatedAt || orgData.user_created_at || orgData.created_at,
        user_created_at: userCreatedAt || orgData.user_created_at,
      }
    }

    // Direct table fallback
    const { data: orgs } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)

    if (orgs && orgs.length > 0) {
      return {
        ...orgs[0],
        created_at: userCreatedAt || orgs[0].created_at,
        user_created_at: userCreatedAt,
      } as OrganizationProfile
    }
  } catch {
    // If migration hasn't been executed in Supabase yet, use default fallback
  }

  return {
    ...DEFAULT_ORGANIZATION,
    created_at: userCreatedAt,
    user_created_at: userCreatedAt,
  }
}

/**
 * Update active organization profile.
 * Only Owners / Partners have permission to perform this update.
 */
export async function updateClientOrganization(
  orgId: string,
  updates: Partial<OrganizationProfile>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('organizations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update organization' }
  }
}

let cachedOrgId: string | null = null

/**
 * Retrieves the current user's organization ID client-side with short-term caching and resilient fallbacks.
 */
export async function getUserOrganizationId(projectId?: string): Promise<string | null> {
  if (cachedOrgId && !projectId) return cachedOrgId

  const supabase = createClient()

  // 1. Try get_user_organization_id RPC
  try {
    const { data, error } = await supabase.rpc('get_user_organization_id')
    if (!error && data) {
      cachedOrgId = data
      return data
    }
  } catch {}

  // 2. Try get_organization_profile RPC
  try {
    const { data: profile, error } = await supabase.rpc('get_organization_profile')
    if (!error && profile && (profile as any).id && (profile as any).id !== 'default-org') {
      cachedOrgId = (profile as any).id
      return (profile as any).id
    }
  } catch {}

  // 3. Try user_profiles for current authenticated user
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) {
      const { data: up } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle()
      if (up?.organization_id) {
        cachedOrgId = up.organization_id
        return up.organization_id
      }
    }
  } catch {}

  // 4. Try from selected project if available
  if (projectId) {
    try {
      const { data: proj } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', projectId)
        .maybeSingle()
      if (proj?.organization_id) {
        return proj.organization_id
      }
    } catch {}
  }

  // 5. Try first organization in organizations table
  try {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (org?.id) {
      cachedOrgId = org.id
      return org.id
    }
  } catch {}

  return null
}

