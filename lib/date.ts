/**
 * PillarPro Centralized Date & Timezone Utilities
 *
 * Civil engineering contractors operate under Indian Standard Time (IST, UTC+5:30).
 * Standard JS `new Date().toISOString().split('T')[0]` extracts the UTC date, which
 * causes off-by-one day bugs between 12:00 AM UTC and 5:30 AM IST, as well as late evening
 * entries shifting to the next calendar date.
 *
 * This module guarantees consistent Asia/Kolkata (IST) date handling across all client forms,
 * reporting projections, and PDF generators.
 */

export const IST_TIMEZONE = 'Asia/Kolkata'

/**
 * Returns the current date in Indian Standard Time (IST) in `YYYY-MM-DD` format.
 * Safe drop-in replacement for `new Date().toISOString().split('T')[0]`.
 */
export function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Formats an ISO string, Date, or `YYYY-MM-DD` string into an Indian human-readable date.
 * e.g., "14 Sep 2026" or "14 Sep 2026, 02:30 PM IST".
 */
export function formatDateIST(
  dateInput: string | Date | null | undefined,
  includeTime = false
): string {
  if (!dateInput) return '—'

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return 'Invalid Date'

  const options: Intl.DateTimeFormatOptions = {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }
      : {}),
  }

  return new Intl.DateTimeFormat('en-IN', options).format(date)
}

/**
 * Returns a full ISO-like string stamped in IST for audit logging.
 */
export function getTimestampIST(): string {
  const now = new Date()
  return `${now.toLocaleString('en-IN', { timeZone: IST_TIMEZONE })} (IST)`
}

