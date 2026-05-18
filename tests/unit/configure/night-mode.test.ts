import { describe, expect, it, beforeEach } from 'vitest'
import { del, openDB, put, get } from '../../../src/core/db.js'
import { settings } from '../../../src/configure/state.svelte.ts'

describe('night-mode', () => {
  beforeEach(async () => {
    await openDB()
    try { await del('settings', 'nightMode') } catch { /* ignore */ }
    document.documentElement.removeAttribute('data-night-mode')
    settings.nightMode = 'off'
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

  it('loadNightMode returns off on fresh install', async () => {
    const { loadNightMode } = await import('../../../src/configure/night-mode.ts')
    expect(await loadNightMode()).toBe('off')
  })

  it('loadNightMode migrates saved booleans', async () => {
    await put('settings', { key: 'nightMode', value: true })
    const { loadNightMode } = await import('../../../src/configure/night-mode.ts')
    expect(await loadNightMode()).toBe('on')

    await put('settings', { key: 'nightMode', value: false })
    expect(await loadNightMode()).toBe('off')
  })

  it('loadNightMode returns saved string modes and falls back to off for invalid values', async () => {
    await put('settings', { key: 'nightMode', value: 'on' })
    const { loadNightMode } = await import('../../../src/configure/night-mode.ts')
    expect(await loadNightMode()).toBe('on')
    await put('settings', { key: 'nightMode', value: 'auto' })
    expect(await loadNightMode()).toBe('auto')
    await put('settings', { key: 'nightMode', value: 'invalid' })
    expect(await loadNightMode()).toBe('off')
  })

  it('setNightMode("on") writes IDB, applies attribute, mutates rune', async () => {
    const { setNightMode } = await import('../../../src/configure/night-mode.ts')
    await setNightMode('on')
    expect(settings.nightMode).toBe('on')
    expect(document.documentElement.getAttribute('data-night-mode')).toBe('on')
    const stored = await get('settings', 'nightMode') as { value: string } | undefined
    expect(stored?.value).toBe('on')
  })

  it('toggleNightMode cycles off to on and back to off', async () => {
    const { toggleNightMode } = await import('../../../src/configure/night-mode.ts')
    expect(await toggleNightMode()).toBe('on')
    expect(settings.nightMode).toBe('on')
    expect(await toggleNightMode()).toBe('off')
    expect(settings.nightMode).toBe('off')
  })

  it('initNightMode hydrates rune + applies attribute from IDB', async () => {
    await put('settings', { key: 'nightMode', value: true })
    const { initNightMode } = await import('../../../src/configure/night-mode.ts')
    await initNightMode()
    expect(settings.nightMode).toBe('on')
    expect(document.documentElement.getAttribute('data-night-mode')).toBe('on')
  })
})
