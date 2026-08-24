/** Calendar date helpers for MealHisab (Bangladesh time). */

/** Today's date in Asia/Dhaka as YYYY-MM-DD. */
export function todayInDhaka(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Clamp a YYYY-MM-DD date into [start, end] inclusive. */
export function clampDateToRange(date: string, start: string, end: string): string {
  if (date < start) return start
  if (date > end) return end
  return date
}

/**
 * Auto-assign the effective meal/contribution date:
 * - use provided date if valid
 * - otherwise today in Dhaka
 * - today's date may be clamped into the open cycle window
 * - an explicitly supplied date outside the cycle is rejected instead of being silently rewritten
 */
export function autoAssignCycleDate(
  cycleStart: string,
  cycleEnd: string,
  preferred?: string | null,
): string {
  const hasPreferredDate = Boolean(preferred)
  const candidate =
    preferred && /^\d{4}-\d{2}-\d{2}$/.test(preferred) ? preferred : todayInDhaka()

  if (hasPreferredDate && (!/^\d{4}-\d{2}-\d{2}$/.test(String(preferred)) || preferred! < cycleStart || preferred! > cycleEnd)) {
    throw new Error(`Date must be within this cycle (${cycleStart} to ${cycleEnd}).`)
  }

  return clampDateToRange(candidate, cycleStart, cycleEnd)
}
