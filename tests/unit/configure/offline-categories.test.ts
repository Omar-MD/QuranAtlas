import { describe, it, expect, beforeEach, vi } from 'vitest'

const getMock = vi.fn()
const putMock = vi.fn()

vi.mock('../../../src/core/db.js', () => ({
  get: (...args: unknown[]) => getMock(...args),
  put: (...args: unknown[]) => putMock(...args),
}))

vi.mock('../../../src/core/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import { settings, DEFAULT_OFFLINE_CATEGORIES } from '../../../src/configure/state.svelte'
import {
  loadOfflineCategories,
  setOfflineCategories,
  initOfflineCategories,
} from '../../../src/configure/offline-categories'

const removedMediaKey = ['au', 'dio'].join('')

describe('settings/offline-categories — sole writer', () => {
  beforeEach(() => {
    getMock.mockReset()
    putMock.mockReset()
    Object.assign(settings, { offlineCategories: { ...DEFAULT_OFFLINE_CATEGORIES } })
  })

  it('loadOfflineCategories returns default when key absent', async () => {
    getMock.mockResolvedValueOnce(undefined)
    const result = await loadOfflineCategories()
    expect(result).toEqual(DEFAULT_OFFLINE_CATEGORIES)
  })

  it('normalizes a partial / malformed record to the default shape and drops legacy audio opt-ins', async () => {
    getMock.mockResolvedValueOnce({ value: { text: { hafs: true }, [removedMediaKey]: { alafasy: true, evil: 'yes' }, garbage: 1 } })
    const result = await loadOfflineCategories()
    expect(result.text.riwayat.hafs).toBe(true)
    expect(result.text.riwayat.warsh).toBe(false)
    expect(result.text.riwayat.qaloon).toBe(false)
    expect(result).not.toHaveProperty('audio')
    expect(result.search).toBe(false)
  })

  it('normalizes the source-aware text shape', async () => {
    getMock.mockResolvedValueOnce({
      value: {
        text: {
          riwayat: { qaloon: true, warsh: 'bad' },
          translations: { bridges: true },
          tafsir: { muyassar: true },
        },
        pages: {},
        search: false,
      },
    })
    const result = await loadOfflineCategories()
    expect(result.text.riwayat).toEqual({ qaloon: true })
    expect(result.text.translations).toEqual({ bridges: true })
    expect(result.text.tafsir).toEqual({ muyassar: true })
  })

  it('normalizes legacy pages _all opt-in to Qaloon pages', async () => {
    getMock.mockResolvedValueOnce({
      value: {
        text: { riwayat: { qaloon: true }, translations: {}, tafsir: {} },
        pages: { _all: true, hafs: true },
        search: false,
      },
    })
    const result = await loadOfflineCategories()
    expect(result.pages).toEqual({ qaloon: true })
  })

  it('setOfflineCategories writes through to IDB and updates rune', async () => {
    const next = {
      text: { riwayat: { qaloon: true }, translations: { bridges: true }, tafsir: { muyassar: true } },
      pages: {},
      search: false,
    }
    putMock.mockResolvedValueOnce(undefined)
    await setOfflineCategories(next)
    expect(putMock).toHaveBeenCalledWith('settings', { key: 'offlineCategories', value: next })
    expect(settings.offlineCategories).toEqual(next)
  })

  it('initOfflineCategories hydrates the rune from IDB', async () => {
    getMock.mockResolvedValueOnce({ value: { text: { hafs: true, warsh: true, qaloon: false }, pages: {}, search: true } })
    await initOfflineCategories()
    expect(settings.offlineCategories.text.riwayat.hafs).toBe(true)
    expect(settings.offlineCategories.text.riwayat.warsh).toBe(true)
    expect(settings.offlineCategories.search).toBe(true)
  })

  it('initOfflineCategories clears legacy audio-only upgrade state from the rune', async () => {
    getMock.mockResolvedValueOnce({
      value: {
        text: {},
        [removedMediaKey]: { alafasy: true },
        pages: {},
        search: false,
      },
    })

    await initOfflineCategories()

    expect(settings.offlineCategories).not.toHaveProperty('audio')
    expect(Object.values(settings.offlineCategories.text.riwayat).some(Boolean)).toBe(false)
    expect(settings.offlineCategories.text.translations).toEqual({})
    expect(settings.offlineCategories.text.tafsir).toEqual({})
  })
})
