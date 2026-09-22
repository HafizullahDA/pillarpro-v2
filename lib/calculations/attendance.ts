/**
 * Civil Construction Site Shift Standards:
 * - Shift span: 9:00 AM to 5:00 PM (8 hours total site span)
 * - Lunch break: 1:00 PM to 2:00 PM (1 hour unpaid break)
 * - Net working hours: 7 hours per full shift
 *
 * All overtime (OT) accruals, hourly wage rates, and day equivalents
 * are calculated based on 7 net working hours:
 * - Hourly Wage = Daily Wage Rate ÷ 7
 * - OT Days Equivalent = OT Hours ÷ 7 (e.g., 3.5h = 0.50 day, 7h = 1.0 day)
 * - OT Wage Accrual = (OT Hours ÷ 7) × Daily Wage Rate
 */
export const STANDARD_SHIFT_WORKING_HOURS = 7

/**
 * Calculates hourly wage rate based on standard 7 net working hours shift.
 */
export function calculateHourlyWage(dailyRate: number | null | undefined): number {
  if (!dailyRate || dailyRate <= 0) return 0
  return dailyRate / STANDARD_SHIFT_WORKING_HOURS
}

/**
 * Calculates equivalent day fraction from overtime hours (e.g. 3.5h = 0.50 day, 7h = 1.0 day).
 */
export function calculateOTDays(otHours: number): number {
  if (!otHours || otHours <= 0) return 0
  return otHours / STANDARD_SHIFT_WORKING_HOURS
}

/**
 * Calculates additional wage accrual from overtime hours.
 */
export function calculateOTWage(otHours: number, dailyRate: number | null | undefined): number {
  if (!otHours || otHours <= 0 || !dailyRate || dailyRate <= 0) return 0
  return (otHours / STANDARD_SHIFT_WORKING_HOURS) * dailyRate
}

