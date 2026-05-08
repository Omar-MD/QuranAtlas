import { describe, expect, it, vi } from 'vitest'
import {
  getBrowserNotificationState,
  requestBrowserNotifications,
} from '../../../../src/read/wird/notifications'

describe('wird notification helpers', () => {
  it('reports unsupported when Notification is absent', () => {
    const original = globalThis.Notification
    Reflect.deleteProperty(globalThis, 'Notification')
    expect(getBrowserNotificationState()).toBe('unsupported')
    Object.defineProperty(globalThis, 'Notification', { value: original, configurable: true })
  })

  it('reports default/granted/denied permission states', () => {
    Object.defineProperty(globalThis, 'Notification', { value: { permission: 'denied' }, configurable: true })
    expect(getBrowserNotificationState()).toBe('denied')
    Object.defineProperty(globalThis, 'Notification', { value: { permission: 'granted' }, configurable: true })
    expect(getBrowserNotificationState()).toBe('granted')
    Object.defineProperty(globalThis, 'Notification', { value: { permission: 'default' }, configurable: true })
    expect(getBrowserNotificationState()).toBe('default')
  })

  it('requests permission for default state but not for granted state', async () => {
    const requestPermission = vi.fn(async () => 'granted')
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'default', requestPermission },
      configurable: true,
    })
    await expect(requestBrowserNotifications()).resolves.toBe('granted')
    expect(requestPermission).toHaveBeenCalledTimes(1)

    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'granted', requestPermission },
      configurable: true,
    })
    await expect(requestBrowserNotifications()).resolves.toBe('granted')
    expect(requestPermission).toHaveBeenCalledTimes(1)
  })

  it('requests permission again when the stored state is denied', async () => {
    const requestPermission = vi.fn(async () => 'granted')
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'denied', requestPermission },
      configurable: true,
    })

    await expect(requestBrowserNotifications()).resolves.toBe('granted')
    expect(requestPermission).toHaveBeenCalledTimes(1)
  })
})
