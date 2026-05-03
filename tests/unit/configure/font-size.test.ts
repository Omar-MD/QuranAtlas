import { describe, expect, it, beforeEach, vi } from 'vitest'
import { del, openDB, put } from '../../../src/core/db.js'

describe('font-size', () => {
  beforeEach(async () => {
    vi.resetModules()
    await openDB()
    try { await del('settings', 'fontSize') } catch { /* ignore */ }
  })

  it('exposes 5 options in ascending scale order', async () => {
    const mod = await import('../../../src/configure/font-size.ts')
    const opts = mod.getFontSizeOptions()
    expect(opts).toEqual(['xs', 'sm', 'md', 'lg', 'xl'])
  })

  it('returns "md" on fresh install', async () => {
    const { loadFontSize } = await import('../../../src/configure/font-size.ts')
    expect(await loadFontSize()).toBe('md')
  })

  it('maps legacy "medium" → "md"', async () => {
    await put('settings', { key: 'fontSize', value: 'medium' })
    const { loadFontSize } = await import('../../../src/configure/font-size.ts')
    expect(await loadFontSize()).toBe('md')
  })

  it('maps legacy "small" → "sm" and "large" → "lg"', async () => {
    await put('settings', { key: 'fontSize', value: 'small' })
    const { loadFontSize: lfs1 } = await import('../../../src/configure/font-size.ts')
    expect(await lfs1()).toBe('sm')

    vi.resetModules()
    await put('settings', { key: 'fontSize', value: 'large' })
    const { loadFontSize: lfs2 } = await import('../../../src/configure/font-size.ts')
    expect(await lfs2()).toBe('lg')
  })

  it('rejects unknown values via setFontSize', async () => {
    const { setFontSize } = await import('../../../src/configure/font-size.ts')
    expect(await setFontSize('enormous')).toBe(false)
  })

  it('accepts each new option via setFontSize', async () => {
    const { setFontSize } = await import('../../../src/configure/font-size.ts')
    for (const s of ['xs', 'sm', 'md', 'lg', 'xl']) {
      expect(await setFontSize(s)).toBe(true)
    }
  })
})
