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
 * - always clamped into the open cycle window
 */
export function autoAssignCycleDate(
  cycleStart: string,
  cycleEnd: string,
  preferred?: string | null,
): string {
  const candidate =
    preferred && /^\d{4}-\d{2}-\d{2}$/.test(preferred) ? preferred : todayInDhaka()
  return clampDateToRange(candidate, cycleStart, cycleEnd)
}
