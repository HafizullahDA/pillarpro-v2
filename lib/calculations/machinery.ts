/**
 * Machinery & Fleet Calculation Engine
 * Handles shift working hours from clock time, meter progression, and fuel efficiency.
 */

export interface ShiftHoursResult {
  grossMinutes: number
  breakMinutes: number
  netMinutes: number
  netHours: number // e.g. 5.67
  formattedTime: string // e.g. "5h 40m"
  shiftSpanDescription: string // e.g. "11:00 AM – 05:40 PM"
}

/**
 * Converts "HH:MM" (24-hour string) to minutes from midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const [hh, mm] = timeStr.split(':').map(Number)
  if (isNaN(hh) || isNaN(mm)) return 0
  return hh * 60 + mm
}

/**
 * Formats "HH:MM" (24-hour string) into a friendly 12-hour string (e.g. "11:00 AM", "05:40 PM")
 */
export function formatTime12Hour(timeStr: string): string {
  if (!timeStr) return ''
  const [hh, mm] = timeStr.split(':').map(Number)
  if (isNaN(hh) || isNaN(mm)) return timeStr
  const period = hh >= 12 ? 'PM' : 'AM'
  const displayHour = hh % 12 === 0 ? 12 : hh % 12
  const paddedMinute = mm < 10 ? `0${mm}` : `${mm}`
  return `${displayHour}:${paddedMinute} ${period}`
}

/**
 * Calculates net working hours given start time, end time, and break in minutes.
 * Handles night shifts (spanning past midnight) correctly.
 *
 * Example:
 * calculateShiftWorkingHours('11:00', '17:40', 60)
 * => netHours: 5.67 (5h 40m)
 */
export function calculateShiftWorkingHours(
  startTime: string,
  endTime: string,
  breakMinutes: number = 0
): ShiftHoursResult {
  const startMins = timeStringToMinutes(startTime)
  const endMins = timeStringToMinutes(endTime)

  let grossMinutes = 0
  if (endMins >= startMins) {
    grossMinutes = endMins - startMins
  } else {
    // Crosses midnight
    grossMinutes = (1440 - startMins) + endMins
  }

  const safeBreak = Math.min(grossMinutes, Math.max(0, breakMinutes))
  const netMinutes = Math.max(0, grossMinutes - safeBreak)
  const netHours = Number((netMinutes / 60).toFixed(2))

  const h = Math.floor(netMinutes / 60)
  const m = netMinutes % 60
  const formattedTime = m > 0 ? `${h}h ${m}m` : `${h}h`

  const startFormatted = formatTime12Hour(startTime)
  const endFormatted = formatTime12Hour(endTime)
  const shiftSpanDescription = `${startFormatted} – ${endFormatted}`

  return {
    grossMinutes,
    breakMinutes: safeBreak,
    netMinutes,
    netHours,
    formattedTime,
    shiftSpanDescription,
  }
}

