import type { BrowserNotificationState, QuranRef, WirdReminder, WirdSummary } from './types'

export const WIRD_REMINDER_NOTIFICATION_TAG = 'quranatlas-daily-wird-reminder'
export const WIRD_REMINDER_PERIODIC_SYNC_TAG = 'quranatlas-daily-wird-reminder'
const WIRD_REMINDER_PERIODIC_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000

export type WirdReminderNotification = {
  body: string
  hash: string
  tag: string
  title: string
  url: string
}

export function getBrowserNotificationState(permission: NotificationPermission | undefined = globalThis.Notification?.permission): BrowserNotificationState {
  if (typeof globalThis.Notification === 'undefined') return 'unsupported'
  if (permission === 'granted' || permission === 'denied') return permission
  return 'default'
}

export function updateReminderPermission(reminder: WirdReminder, browserNotifications: BrowserNotificationState): WirdReminder {
  return { ...reminder, browserNotifications }
}

export function getNextReminderDelay(time: string, now = new Date()): number {
  const [hours, minutes] = parseReminderTime(time)
  const next = new Date(now)
  next.setHours(hours, minutes, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  return Math.max(0, next.getTime() - now.getTime())
}

export function shouldSendWirdReminder(summary: WirdSummary | null): summary is WirdSummary & { nextRef: QuranRef } {
  return Boolean(summary?.nextRef && (summary.state === 'active' || summary.state === 'behind-target'))
}

export function createWirdReminderNotification(summary: WirdSummary & { nextRef: QuranRef }, origin = globalThis.location?.origin ?? ''): WirdReminderNotification {
  const hash = `#/s/${summary.nextRef.surah}/${summary.nextRef.verse}`
  return {
    body: `Tap to continue at ${summary.nextRef.surah}:${summary.nextRef.verse}. ${summary.remainingLabel}.`,
    hash,
    tag: WIRD_REMINDER_NOTIFICATION_TAG,
    title: 'Daily Wird',
    url: `${origin}/${hash}`,
  }
}

export async function showWirdReminderNotification(notification: WirdReminderNotification): Promise<boolean> {
  if (getBrowserNotificationState() !== 'granted') return false
  const options: NotificationOptions = {
    body: notification.body,
    data: { hash: notification.hash, url: notification.url },
    tag: notification.tag,
  }
  const registration = await getReadyServiceWorkerRegistration()
  if (registration && typeof registration.showNotification === 'function') {
    await registration.showNotification(notification.title, options)
    return true
  }
  const browserNotification = new Notification(notification.title, options)
  browserNotification.onclick = () => {
    browserNotification.close()
    globalThis.window?.focus()
    if (notification.hash) globalThis.window.location.hash = notification.hash
  }
  return true
}

export async function clearWirdReminderNotifications(): Promise<void> {
  const registration = await getReadyServiceWorkerRegistration()
  if (!registration || typeof registration.getNotifications !== 'function') return
  const notifications = await registration.getNotifications({ tag: WIRD_REMINDER_NOTIFICATION_TAG })
  for (const notification of notifications) notification.close()
}

export async function syncWirdReminderBackgroundRegistration(reminder: WirdReminder | null): Promise<void> {
  const registration = await getReadyServiceWorkerRegistration()
  const periodicSync = getPeriodicSyncManager(registration)
  const shouldRegister = Boolean(
    reminder?.enabled
    && getBrowserNotificationState() === 'granted',
  )

  if (!shouldRegister) {
    await clearWirdReminderNotifications()
    await periodicSync?.unregister(WIRD_REMINDER_PERIODIC_SYNC_TAG).catch(() => undefined)
    return
  }

  await periodicSync?.register(WIRD_REMINDER_PERIODIC_SYNC_TAG, {
    minInterval: WIRD_REMINDER_PERIODIC_SYNC_INTERVAL_MS,
  }).catch(() => undefined)
}

async function getReadyServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!globalThis.navigator || !('serviceWorker' in globalThis.navigator)) return null
  try {
    return await globalThis.navigator.serviceWorker.ready
  } catch {
    return null
  }
}

type PeriodicSyncManagerLike = {
  register: (tag: string, options: { minInterval: number }) => Promise<void>
  unregister: (tag: string) => Promise<void>
}

function getPeriodicSyncManager(registration: ServiceWorkerRegistration | null): PeriodicSyncManagerLike | null {
  if (!registration || !('periodicSync' in registration)) return null
  const periodicSync = (registration as ServiceWorkerRegistration & { periodicSync?: PeriodicSyncManagerLike }).periodicSync
  return typeof periodicSync?.register === 'function' && typeof periodicSync.unregister === 'function' ? periodicSync : null
}

function parseReminderTime(time: string): [number, number] {
  const match = time.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return [7, 0]
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return [
    Number.isInteger(hours) && hours >= 0 && hours <= 23 ? hours : 7,
    Number.isInteger(minutes) && minutes >= 0 && minutes <= 59 ? minutes : 0,
  ]
}
