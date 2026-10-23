// Indian number format: ₹1,23,456
export function formatINR(amount: number | null | undefined): string {
  if (amount == null) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(dateStr))
}

/**
 * Formats an ISO string, Date, or `YYYY-MM-DD` string into Indian standard `DD/MM/YYYY`.
 * e.g., "2026-10-23" -> "23/10/2026", "2026-10-10" -> "10/10/2026"
 */
export function formatDateDDMMYYYY(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—'
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
    const [y, m, d] = dateInput.slice(0, 10).split('-')
    return `${d}/${m}/${y}`
  }
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short',
  }).format(new Date(dateStr))
}
