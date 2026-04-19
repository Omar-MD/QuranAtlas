import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Events } from '../../../src/core/constants.js'
import { del, get, openDB } from '../../../src/core/db.js'
import { clear, on } from '../../../src/core/events.js'
import { logger } from '../../../src/core/logger.js'
import { applyTheme, getThemeOptions, initTheme, setTheme } from '../../../src/settings/theme.ts'

async function resetThemeSetting() {
  try {
    await del('settings', 'theme')
  } catch {
    // No-op: missing records are fine for test setup.
  }
}

describe('settings/theme.ts', () => {
  beforeEach(async () => {
    await openDB()
    await resetThemeSetting()
    clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(async () => {
    clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-pref')
    await resetThemeSetting()
    vi.restoreAllMocks()
  })

  it('emits theme changes with from/to and persists the new theme asynchronously', async () => {
    const received = []
    const unsub = on(Events.SETTINGS_THEME_CHANGED, (payload) => received.push(payload))

    applyTheme('sepia')

    const success = await setTheme('dark')

    expect(success).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({ from: 'sepia', to: 'dark' })
    expect(received[0]).not.toHaveProperty('theme')

    await vi.waitFor(async () => {
      expect(await get('settings', 'theme')).toEqual({ key: 'theme', value: 'dark' })
    })

    unsub()
  })

  it('rejects invalid themes without emitting or persisting anything', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const received = []
    const unsub = on(Events.SETTINGS_THEME_CHANGED, (payload) => received.push(payload))

    applyTheme('light')

    const success = await setTheme('midnight')

    expect(success).toBe(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(received).toEqual([])
    expect(await get('settings', 'theme')).toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith('Invalid theme:', { theme: 'midnight' })

    unsub()
  })

  it('derives the previous theme from CSS classes when data-theme-pref and data-theme are absent', async () => {
    const received = []
    const unsub = on(Events.SETTINGS_THEME_CHANGED, (payload) => received.push(payload))

    document.documentElement.classList.add('theme-dark')
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-pref')

    await setTheme('sepia')

    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({ from: 'dark', to: 'sepia' })

    unsub()
  })

  it('returns the supported theme options as a new array', () => {
    const options = getThemeOptions()

    expect(options).toEqual(['light', 'sepia', 'dark', 'auto'])
    expect(options).not.toBe(getThemeOptions())
  })

  it('initTheme loads the persisted value and applies it', async () => {
    document.documentElement.classList.add('theme-light')
    await openDB()
    await del('settings', 'theme').catch(() => {})
    const { put } = await import('../../../src/core/db.js')
    await put('settings', { key: 'theme', value: 'sepia' })

    await initTheme()

    expect(document.documentElement.getAttribute('data-theme')).toBe('sepia')
    expect(document.documentElement.classList.contains('theme-sepia')).toBe(true)
  })

  it('loadTheme falls back to light and logs when the settings read fails', async () => {
    vi.resetModules()
    const errorSpy = vi.fn()

    vi.doMock('../../../src/core/db.js', () => ({
      get: vi.fn().mockRejectedValue(new Error('broken settings store')),
      put: vi.fn(),
    }))
    vi.doMock('../../../src/core/logger.js', () => ({
      logger: {
        error: errorSpy,
        warn: vi.fn(),
      },
    }))

    const { loadTheme } = await import('../../../src/settings/theme.ts')

    await expect(loadTheme()).resolves.toBe('light')
    expect(errorSpy).toHaveBeenCalledWith('Failed to load theme:', {
      error: expect.any(Error),
    })
  })

  it('logs persistence failures without rolling back the applied theme', async () => {
    vi.resetModules()
    const errorSpy = vi.fn()

    vi.doMock('../../../src/core/db.js', () => ({
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockRejectedValue(new Error('quota exceeded')),
    }))
    vi.doMock('../../../src/core/logger.js', () => ({
      logger: {
        error: errorSpy,
        warn: vi.fn(),
      },
    }))

    const { setTheme: setThemeWithFailure } = await import('../../../src/settings/theme.ts')

    await expect(setThemeWithFailure('dark')).resolves.toBe(true)
    await Promise.resolve()

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(errorSpy).toHaveBeenCalledWith('Failed to save theme:', {
      theme: 'dark',
      error: expect.any(Error),
    })
  })
})