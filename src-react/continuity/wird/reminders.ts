import type { BrowserNotificationState, WirdReminder } from './types'

export function getBrowserNotificationState(permission: NotificationPermission | undefined = globalThis.Notification?.permission): BrowserNotificationState {
  if (typeof globalThis.Notification === 'undefined') return 'unsupported'
  if (permission === 'granted' || permission === 'denied') return permission
  return 'default'
}

export function updateReminderPermission(reminder: WirdReminder, browserNotifications: BrowserNotificationState): WirdReminder {
  return { ...reminder, browserNotifications }
}
