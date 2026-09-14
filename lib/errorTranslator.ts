/**
 * PillarPro Database & API Error Translator
 *
 * Converts raw PostgreSQL error codes, Supabase exceptions, and network failures
 * into clear, actionable, user-friendly messages for civil contractors.
 */

export interface TranslatedError {
  userMessage: string
  code?: string
  field?: string
  isPermissionError: boolean
}

/**
 * Common PostgreSQL / Supabase Error Code mappings
 */
const POSTGRES_ERROR_MAP: Record<string, string> = {
  // Integrity Constraint Violations
  '23505': 'A record with this unique identifier (e.g. bill number, code, or name) already exists in this project or firm.',
  '23503': 'Cannot modify or delete this item because other active transactions or records depend on it.',
  '23514': 'The entered values violate data validation rules (e.g. negative amount or invalid percentage).',
  '23502': 'A required field is missing. Please review your form inputs.',

  // Authorization / RLS Violations
  '42501': 'Permission denied. Your current user role does not have authorization to perform this operation.',
  PGRST301: 'Your session has expired. Please refresh the page or sign in again.',
  PGRST116: 'The requested record was not found or has already been removed.',

  // Custom Application Triggers
  P0001: 'The operation was rejected by business rules (e.g. period is locked for accounting close).',
}

/**
 * Translates any caught error into a clear, polite contractor-facing message.
 */
export function translateError(error: unknown, fallbackMessage = 'An unexpected error occurred while saving.'): TranslatedError {
  if (!error) {
    return { userMessage: fallbackMessage, isPermissionError: false }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return { userMessage: error, isPermissionError: false }
  }

  const err = error as Record<string, any>
  const message: string = err.message || ''
  const code: string = err.code || ''
  const details: string = err.details || ''

  // 1. Check exact Postgres error code
  if (code && POSTGRES_ERROR_MAP[code]) {
    return {
      userMessage: POSTGRES_ERROR_MAP[code],
      code,
      isPermissionError: code === '42501',
    }
  }

  // 2. Pattern match common database trigger error strings
  const lowerMsg = message.toLowerCase()

  if (lowerMsg.includes('period is locked') || lowerMsg.includes('locked period')) {
    return {
      userMessage: 'This accounting period has been locked by the Owner. Edits to past closed months are blocked.',
      code: 'PERIOD_LOCKED',
      isPermissionError: true,
    }
  }

  if (lowerMsg.includes('row-level security') || lowerMsg.includes('policy')) {
    return {
      userMessage: 'Access restricted by organization security policy. You can only view and edit your firm’s records.',
      code: '42501',
      isPermissionError: true,
    }
  }

  if (lowerMsg.includes('duplicate key value') || lowerMsg.includes('already exists')) {
    return {
      userMessage: 'A record with this identifier (such as bill number or code) already exists.',
      code: '23505',
      isPermissionError: false,
    }
  }

  if (lowerMsg.includes('failed to fetch') || lowerMsg.includes('networkerror') || lowerMsg.includes('network request failed')) {
    return {
      userMessage: 'Network connection issue. Please check your internet connection and try again.',
      code: 'NETWORK_ERROR',
      isPermissionError: false,
    }
  }

  if (lowerMsg.includes('jwt') || lowerMsg.includes('token is expired') || lowerMsg.includes('unauthorized')) {
    return {
      userMessage: 'Your login session has expired. Please refresh the page to continue.',
      code: 'AUTH_EXPIRED',
      isPermissionError: true,
    }
  }

  // 3. Clean and return friendly fallback
  return {
    userMessage: message || fallbackMessage,
    code,
    isPermissionError: false,
  }
}

