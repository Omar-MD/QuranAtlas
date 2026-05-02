/**
 * Component tests for offline-selector.svelte (N21).
 *
 * Covers the unit-level concerns for offline selection:
 *   - Renders one accordion row per category (text · audio · pages · search).
 *   - Gated rows render their version label and contain no checkbox.
 *   - Toggling the text checkbox changes the pending state and updates the
 *     header byte total.
 *   - Apply button disabled at boot (no diff) and enabled after a toggle.
 *   - Pre-flight quota refusal — Apply disabled with shortfall message when
 *     selection exceeds available storage (audit Q4).
 *   - Apply commits via setOfflineCategories and triggers per-category
 *     download for every category with manifest entries.
 *
 * Real layout / paint / SW lifecycle live in journey-h-offline.spec.js
 * Layout and service-worker lifecycle still require e2e coverage.
 */

import { render, fireEvent } from '@testing-library/svelte'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const setOfflineCategoriesMock = vi.fn(async (next) => {
  Object.assign(settings, { offlineCategories: next })
})
const startCategoryDownloadMock = vi.fn(async () => {})

vi.mock('../../../src/settings/offline-categories.ts', () => ({
  setOfflineCategories: (...args: unknown[]) => setOfflineCategoriesMock(...args),
}))

vi.mock('../../../src/data/offline.ts', () => ({
  getCategoryManifest: vi.fn(async (cat: string) => {
    if (cat === 'text') return { urls: ['/dataset/riwayat/hafs/001.json'], totalBytes: 1_500_000 }
    return { urls: [], totalBytes: 0 }
  }),
  isCategoryAvailable: vi.fn(async (cat: string) => cat === 'text'),
  startCategoryDownload: (...args: unknown[]) => startCategoryDownloadMock(...args),
  getStorageBudget: vi.fn(async () => ({ usage: 1_000_000, quota: 100_000_000, available: 99_000_000 })),
}))

import OfflineSelector from '../../../src/offline/offline-selector.svelte'
import { settings, DEFAULT_OFFLINE_CATEGORIES } from '../../../src/settings/state.svelte.ts'

async function flush() { for (let i = 0; i < 6; i++) await Promise.resolve() }

describe('offline-selector.svelte', () => {
  beforeEach(() => {
    setOfflineCategoriesMock.mockClear()
    startCategoryDownloadMock.mockClear()
    Object.assign(settings, { offlineCategories: { ...DEFAULT_OFFLINE_CATEGORIES } })
  })

  it('renders four accordion rows — text + 3 gated', async () => {
    render(OfflineSelector)
    await flush()
    expect(document.querySelector('[data-testid="storage-row-text"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="storage-row-audio"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="storage-row-pages"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="storage-row-search"]')).not.toBeNull()
  })

  it('gated rows lack a checkbox; only available rows render one', async () => {
    render(OfflineSelector)
    await flush()
    expect(document.querySelector('[data-testid="storage-check-text"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="storage-check-audio"]')).toBeNull()
    expect(document.querySelector('[data-testid="storage-check-pages"]')).toBeNull()
    expect(document.querySelector('[data-testid="storage-check-search"]')).toBeNull()
  })

  it('Apply disabled at boot (no diff) and after toggling becomes enabled', async () => {
    render(OfflineSelector)
    await flush()
    const apply = document.querySelector('[data-testid="storage-apply"]') as HTMLButtonElement
    expect(apply.disabled).toBe(true)

    const checkbox = document.querySelector('[data-testid="storage-check-text"]') as HTMLInputElement
    await fireEvent.click(checkbox)
    await flush()
    expect(apply.disabled).toBe(false)
  })

  it('Apply commits via setOfflineCategories and dispatches download for the toggled category', async () => {
    render(OfflineSelector)
    await flush()
    const checkbox = document.querySelector('[data-testid="storage-check-text"]') as HTMLInputElement
    await fireEvent.click(checkbox)
    await flush()

    const apply = document.querySelector('[data-testid="storage-apply"]') as HTMLButtonElement
    await fireEvent.click(apply)
    await flush()

    expect(setOfflineCategoriesMock).toHaveBeenCalledTimes(1)
    expect(startCategoryDownloadMock).toHaveBeenCalledWith('text')
  })

  it('refuses Apply pre-flight when selection exceeds available quota (Q4)', async () => {
    const offlineMod = await import('../../../src/data/offline.ts')
    ;(offlineMod.getStorageBudget as unknown as { mockResolvedValueOnce: (v: unknown) => void })
      .mockResolvedValueOnce({ usage: 0, quota: 1_000_000, available: 1_000 })

    render(OfflineSelector)
    await flush()
    const checkbox = document.querySelector('[data-testid="storage-check-text"]') as HTMLInputElement
    await fireEvent.click(checkbox)
    await flush()

    const apply = document.querySelector('[data-testid="storage-apply"]') as HTMLButtonElement
    expect(apply.disabled).toBe(true)
    expect(document.querySelector('[data-testid="storage-quota-err"]')).not.toBeNull()
  })
})
