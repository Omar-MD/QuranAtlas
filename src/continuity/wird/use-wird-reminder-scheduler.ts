import { useEffect } from 'react'

import { nativeSettingsReader, readNativeSetting, writeNativeSetting } from '../../storage/native-reader-store'
import { deriveWirdSummary, getLocalDayKey } from './progress'
import { compareQuranRefs } from '../verse-key'
import {
  createWirdReminderNotification,
  getBrowserNotificationState,
  getNextReminderDelay,
  shouldSendWirdReminder,
  showWirdReminderNotification,
  syncWirdReminderBackgroundRegistration,
} from './reminders'
import { loadWirdSurahCounts } from './surah-counts'
import { readWirdPlan, subscribeWirdPlanChanged } from './store'
import type { WirdPlan } from './types'

const MAX_TIMEOUT_MS = 2_147_483_647

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
      if (plan.progress.completedThroughRef && compareQuranRefs(plan.progress.completedThroughRef, plan.endRef) >= 0)
        return
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
        const counts = await loadWirdSurahCounts()
        const summary = deriveWirdSummary(plan, counts)
        const dayKey = getLocalDayKey()
        const lastSent = await readNativeSetting('wirdReminderLastSentDay')
        if (lastSent?.value !== dayKey && shouldSendWirdReminder(summary)) {
          const shown = await showWirdReminderNotification(createWirdReminderNotification(summary))
          if (shown) await writeNativeSetting({ key: 'wirdReminderLastSentDay', value: dayKey })
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
