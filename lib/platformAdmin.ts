import type { SupabaseClient } from '@supabase/supabase-js'

export const DEFAULT_PLATFORM_ADMINS = [
  'pillarprojk@gmail.com',
  'contact@pillarprojk.com',
]

export function isDefaultPlatformAdmin(email?: string | null): boolean {
  if (!email) return false
  const clean = email.trim().toLowerCase()
  const envAdmins = (process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)

  return DEFAULT_PLATFORM_ADMINS.includes(clean) || envAdmins.includes(clean)
}

export async function isPlatformAdmin(
  supabase: SupabaseClient,
  email?: string | null
): Promise<boolean> {
  if (!email) return false
  const clean = email.trim().toLowerCase()

  if (isDefaultPlatformAdmin(clean)) {
    return true
  }

  try {
    const { data } = await supabase
      .from('platform_admins')
      .select('email')
      .eq('email', clean)
      .maybeSingle()

    return !!data
  } catch {
    return false
  }
}
