import { inclusiveDays } from '../../continuity/wird/progress'
import type { WirdUnit } from '../../continuity/wird/types'

// Browser-locale date words (brief §15.11): "17 Oct 2026" for plan rows,
// "Sat 17 Oct" for the pace helper. Reminder time shows as stored (HH:MM).
const dayKeyDate = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const paceDate = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

function dayKeyToDate(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00`)
}

export function formatDate(dayKey: string): string {
  return dayKeyDate.format(dayKeyToDate(dayKey))
}

export function formatPaceDate(dayKey: string): string {
  return paceDate.format(dayKeyToDate(dayKey))
}

// "days left" for the Finish-by row: inclusiveDays(today, target) − 1, with
// 0 → Today and 1 → Tomorrow (brief §15.11).
export function finishByValue(targetEndOn: string, todayKey: string): string {
  const days = inclusiveDays(todayKey, targetEndOn) - 1
  if (days <= 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${formatDate(targetEndOn)} · ${days} days left`
}

export function unitPluralLabel(unit: WirdUnit): string {
  if (unit === 'verse') return 'Verses'
  if (unit === 'page') return 'Pages'
  if (unit === 'juz') return 'Juz'
  return 'Hizb'
}
