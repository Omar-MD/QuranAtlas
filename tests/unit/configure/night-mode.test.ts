import { describe, expect, it, beforeEach } from 'vitest'
import { del, openDB, put, get } from '../../../src/core/db.js'
import { settings } from '../../../src/configure/state.svelte.ts'

describe('night-mode', () => {
  beforeEach(async () => {
    await openDB()
    try { await del('settings', 'nightMode') } catch { /* ignore */ }
    document.documentElement.removeAttribute('data-night-mode')
    settings.nightMode = false
  })

  it('applyNightMode(true) sets data-night-mode="on"', async () => {
    const { applyNightMode } = await import('../../../src/configure/night-mode.ts')
    applyNightMode(true)
    expect(document.documentElement.getAttribute('data-night-mode')).toBe('on')
  })

  it('applyNightMode(false) removes data-night-mode', async () => {
    document.documentElement.setAttribute('data-night-mode', 'on')
    const { applyNightMode } = await import('../../../src/configure/night-mode.ts')
    applyNightMode(false)
    expect(document.documentElement.hasAttribute('data-night-mode')).toBe(false)
  })

  it('loadNightMode returns false on fresh install', async () => {
    const { loadNightMode } = await import('../../../src/configure/night-mode.ts')
    expect(await loadNightMode()).toBe(false)
  })

  it('loadNightMode returns saved boolean', async () => {
    await put('settings', { key: 'nightMode', value: true })
    const { loadNightMode } = await import('../../../src/configure/night-mode.ts')
    expect(await loadNightMode()).toBe(true)
  })

  it('loadNightMode falls back to false for non-boolean stored value', async () => {
    await put('settings', { key: 'nightMode', value: 'on' })
    const { loadNightMode } = await import('../../../src/configure/night-mode.ts')
    expect(await loadNightMode()).toBe(false)
  })

  it('setNightMode(true) writes IDB, applies attribute, mutates rune', async () => {
    const { setNightMode } = await import('../../../src/configure/night-mode.ts')
    await setNightMode(true)
    expect(settings.nightMode).toBe(true)
    expect(document.documentElement.getAttribute('data-night-mode')).toBe('on')
    const stored = await get('settings', 'nightMode') as { value: boolean } | undefined
    expect(stored?.value).toBe(true)
  })

  it('toggleNightMode flips state and returns the new value', async () => {
    const { toggleNightMode } = await import('../../../src/configure/night-mode.ts')
    expect(await toggleNightMode()).toBe(true)
    expect(settings.nightMode).toBe(true)
    expect(await toggleNightMode()).toBe(false)
    expect(settings.nightMode).toBe(false)
  })

  it('initNightMode hydrates rune + applies attribute from IDB', async () => {
    await put('settings', { key: 'nightMode', value: true })
    const { initNightMode } = await import('../../../src/configure/night-mode.ts')
    await initNightMode()
    expect(settings.nightMode).toBe(true)
    expect(document.documentElement.getAttribute('data-night-mode')).toBe('on')
  })
})
