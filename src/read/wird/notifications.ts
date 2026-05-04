import type { BrowserNotificationState } from './types'

export function getBrowserNotificationState(): BrowserNotificationState {
  if (typeof Notification === 'undefined') { return 'unsupported' }
  const permission = Notification.permission
  if (permission === 'granted' || permission === 'denied' || permission === 'default') {
    return permission
  }
  return 'unsupported'
}

export async function requestBrowserNotifications(): Promise<BrowserNotificationState> {
  const state = getBrowserNotificationState()
  if (state !== 'default') { return state }
  const next = await Notification.requestPermission()
  return next === 'granted' || next === 'denied' || next === 'default' ? next : 'unsupported'
}
