import { useEffect } from 'react'

import { readNativeSetting, writeNativeSetting } from '../../storage/native-reader-store'
import { getBrowserNotificationState, syncWirdReminderBackgroundRegistration, updateReminderPermission } from './reminders'
import { normalizeWirdPlan, notifyWirdPlanChanged } from './store'
import type { BrowserNotificationState, WirdPlan } from './types'

const FIRST_LAUNCH_NOTIFICATION_PROMPTED_KEY = 'wirdNotificationPermissionPrompted'
const FIRST_LAUNCH_PROMPT_DELAY_MS = 650

export function useFirstLaunchNotificationPermission(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    const timer = window.setTimeout(() => {
      void requestFirstLaunchNotificationPermission(() => cancelled)
    }, FIRST_LAUNCH_PROMPT_DELAY_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [enabled])
}

async function requestFirstLaunchNotificationPermission(isCancelled: () => boolean): Promise<void> {
  if (typeof Notification === 'undefined' || typeof Notification.requestPermission !== 'function') return
  const current = getBrowserNotificationState()
  if (current !== 'default') {
    await markPromptedAndSyncPermission(current, isCancelled)
    return
  }

  const prompted = await readNativeSetting(FIRST_LAUNCH_NOTIFICATION_PROMPTED_KEY)
  if (prompted?.value === true || isCancelled()) return

  await writeNativeSetting({ key: FIRST_LAUNCH_NOTIFICATION_PROMPTED_KEY, value: true }, () => !isCancelled())
  if (isCancelled()) return
  const permission = await Notification.requestPermission()
  await syncStoredPlanPermission(getBrowserNotificationState(permission), isCancelled)
}

async function markPromptedAndSyncPermission(state: BrowserNotificationState, isCancelled: () => boolean): Promise<void> {
  await writeNativeSetting({ key: FIRST_LAUNCH_NOTIFICATION_PROMPTED_KEY, value: true }, () => !isCancelled())
  await syncStoredPlanPermission(state, isCancelled)
}

async function syncStoredPlanPermission(state: BrowserNotificationState, isCancelled: () => boolean): Promise<void> {
  if (isCancelled()) return
  const plan = normalizeWirdPlan((await readNativeSetting('wirdPlan'))?.value)
  if (!plan || plan.reminder.browserNotifications === state) {
    await syncWirdReminderBackgroundRegistration(plan?.reminder ?? null)
    return
  }
  const nextPlan: WirdPlan = {
    ...plan,
    reminder: updateReminderPermission(plan.reminder, state),
  }
  await writeNativeSetting({ key: 'wirdPlan', value: JSON.parse(JSON.stringify(nextPlan)) }, () => !isCancelled())
  if (!isCancelled()) {
    notifyWirdPlanChanged(nextPlan)
    await syncWirdReminderBackgroundRegistration(nextPlan.reminder)
  }
}
