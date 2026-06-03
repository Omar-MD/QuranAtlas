import { useEffect } from 'react'

import { loadReaderSurahIndex } from '../../data/surah-index'
import { nativeSettingsReader } from '../../storage/native-reader-store'
import { deriveWirdSummary } from './progress'
import {
  createWirdReminderNotification,
  getBrowserNotificationState,
  getNextReminderDelay,
  shouldSendWirdReminder,
  showWirdReminderNotification,
  syncWirdReminderBackgroundRegistration,
} from './reminders'
import { readWirdPlan, subscribeWirdPlanChanged } from './store'
import type { SurahCount, WirdPlan } from './types'

const MAX_TIMEOUT_MS = 2_147_483_647

let cachedCounts: Promise<SurahCount[]> | null = null

export function useWirdReminderScheduler(): void {
  useEffect(() => {
    let cancelled = false
    let reminderTimer: ReturnType<typeof setTimeout> | null = null

    function clearReminderTimer(): void {
      if (!reminderTimer) return
      clearTimeout(reminderTimer)
      reminderTimer = null
    }

    function schedule(plan: WirdPlan | null): void {
      clearReminderTimer()
      void syncWirdReminderBackgroundRegistration(plan?.reminder ?? null)
      if (!plan?.reminder.enabled) return
      if (getBrowserNotificationState() !== 'granted') return
      if (plan.progress.completedThroughRef && compareRefs(plan.progress.completedThroughRef, plan.endRef) >= 0) return
      const delay = Math.min(getNextReminderDelay(plan.reminder.time), MAX_TIMEOUT_MS)
      reminderTimer = setTimeout(() => {
        void fireReminder()
      }, delay)
    }

    async function reloadPlanAndSchedule(): Promise<void> {
      try {
        const plan = await readWirdPlan(nativeSettingsReader())
        if (!cancelled) schedule(plan)
      } catch {
        if (!cancelled) schedule(null)
      }
    }

    async function fireReminder(): Promise<void> {
      if (cancelled) return
      try {
        const plan = await readWirdPlan(nativeSettingsReader())
        if (!plan?.reminder.enabled) {
          schedule(null)
          return
        }
        const counts = await loadSurahCounts()
        const summary = deriveWirdSummary(plan, counts)
        if (shouldSendWirdReminder(summary)) {
          await showWirdReminderNotification(createWirdReminderNotification(summary))
        }
        if (!cancelled) schedule(plan)
      } catch {
        if (!cancelled) void reloadPlanAndSchedule()
      }
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === 'visible') void reloadPlanAndSchedule()
    }

    const unsubscribe = subscribeWirdPlanChanged(schedule)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    void reloadPlanAndSchedule()

    return () => {
      cancelled = true
      clearReminderTimer()
      unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}

async function loadSurahCounts(): Promise<SurahCount[]> {
  cachedCounts ??= loadReaderSurahIndex(fetch).then((rows) => rows.map((row) => ({ count: row.counts.qaloon, n: row.n })))
  return cachedCounts
}

function compareRefs(a: { surah: number; verse: number }, b: { surah: number; verse: number }): number {
  if (a.surah !== b.surah) return a.surah - b.surah
  return a.verse - b.verse
}
