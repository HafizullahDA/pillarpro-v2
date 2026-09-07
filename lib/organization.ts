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
}

/**
 * Fetch the active organization profile client-side.
 * Uses get_organization_profile RPC with fallback to querying public.organizations or DEFAULT_ORGANIZATION.
 */
export async function getClientOrganization(): Promise<OrganizationProfile> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('get_organization_profile')
    if (!error && data) {
      return data as OrganizationProfile
    }

    // Direct table fallback
    const { data: orgs } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)

    if (orgs && orgs.length > 0) {
      return orgs[0] as OrganizationProfile
    }
  } catch {
    // If migration hasn't been executed in Supabase yet, use default fallback
  }

  return DEFAULT_ORGANIZATION
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

