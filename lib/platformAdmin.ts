import type { SupabaseClient } from '@supabase/supabase-js'

export const DEFAULT_PLATFORM_ADMINS = [
  'pillarprojk@gmail.com',
]

/**
 * Strict Platform Owner Check.
 * Exclusively reserved for pillarprojk@gmail.com. Nobody else may view or use visitor telemetry.
 */
export function isDefaultPlatformAdmin(email?: string | null): boolean {
  if (!email) return false
  return email.trim().toLowerCase() === 'pillarprojk@gmail.com'
}

export async function isPlatformAdmin(
  _supabase?: SupabaseClient,
  email?: string | null
): Promise<boolean> {
  if (!email) return false
  return email.trim().toLowerCase() === 'pillarprojk@gmail.com'
}
