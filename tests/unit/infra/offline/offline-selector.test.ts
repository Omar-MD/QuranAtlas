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

import { render, fireEvent, waitFor } from '@testing-library/svelte'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const setOfflineCategoriesMock = vi.fn(async (next) => {
  Object.assign(settings, { offlineCategories: next })
})
const startCategoryDownloadMock = vi.fn(async () => {})
const startSourceAssetDownloadMock = vi.fn(async () => true)
const startPageAssetDownloadMock = vi.fn(async () => true)
const removeSourceAssetDownloadMock = vi.fn(async () => {})
const removeCategoryDownloadMock = vi.fn(async () => {})
const removePageAssetDownloadMock = vi.fn(async () => {})

vi.mock('../../../../src/configure/offline-categories.ts', () => ({
  setOfflineCategories: (...args: unknown[]) => setOfflineCategoriesMock(...args),
}))

vi.mock('../../../../src/data/offline-client.ts', () => ({
  getCategoryManifest: vi.fn(async (cat: string) => {
    if (cat === 'text') {
      return {
        urls: [
          '/dataset/riwayat/qaloon/001.json',
          '/dataset/translations/bridges/001.json',
          '/dataset/tafsir/muyassar/001.json',
          '/dataset/knowledge/ayah/001.json',
        ],
        totalBytes: 1_800_000,
      }
    }
    return { urls: [], totalBytes: 0 }
  }),
  getSourceAssetManifest: vi.fn(async (kind: string, id: string) => ({
    urls: [`/dataset/${kind === 'translation' ? 'translations' : 'tafsir'}/${id}/001.json`],
    totalBytes: id === 'mukhtasar' ? 1_200_000 : 900_000,
  })),
  getPageAssetManifest: vi.fn(async (riwayah: string) => {
    if (riwayah === 'qaloon') {
      return {
        urls: [
          '/dataset/mushaf-pages/qaloon/manifest.json',
          '/dataset/mushaf-pages/qaloon/pages/001.svg',
        ],
        totalBytes: 2_400_000,
      }
    }
    return { urls: [], totalBytes: 0 }
  }),
  isCategoryAvailable: vi.fn(async (cat: string) => cat === 'text'),
  startCategoryDownload: (...args: unknown[]) => startCategoryDownloadMock(...args),
  startSourceAssetDownload: (...args: unknown[]) => startSourceAssetDownloadMock(...args),
  startPageAssetDownload: (...args: unknown[]) => startPageAssetDownloadMock(...args),
  removeSourceAssetDownload: (...args: unknown[]) => removeSourceAssetDownloadMock(...args),
  removeCategoryDownload: (...args: unknown[]) => removeCategoryDownloadMock(...args),
  removePageAssetDownload: (...args: unknown[]) => removePageAssetDownloadMock(...args),
  getStorageBudget: vi.fn(async () => ({ usage: 1_000_000, quota: 100_000_000, available: 99_000_000 })),
}))

vi.mock('../../../../src/data/dataset.ts', () => ({
  getTranslations: vi.fn(async () => [
    { id: 'bridges', name: 'Bridges', availableInManifest: true },
    { id: 'saheeh', name: 'Saheeh International', availableInManifest: false },
  ]),
  getTafsirs: vi.fn(async () => [
    { id: 'muyassar', name: 'Tafsir Muyassar', availableInManifest: true },
    { id: 'mukhtasar', name: 'Al-Mukhtasar fi al-Tafsir', availableInManifest: false },
  ]),
}))

import OfflineSelector from '../../../../src/infra/offline/offline-selector.svelte'
import { settings, DEFAULT_OFFLINE_CATEGORIES } from '../../../../src/configure/state.svelte.ts'

async function flush() { for (let i = 0; i < 6; i++) await Promise.resolve() }

describe('offline-selector.svelte', () => {
  beforeEach(async () => {
    const offlineMod = await import('../../../../src/data/offline-client.ts')
    vi.mocked(offlineMod.getPageAssetManifest).mockImplementation(async (riwayah: string) => {
      if (riwayah === 'qaloon') {
        return {
          urls: [
            '/dataset/mushaf-pages/qaloon/manifest.json',
            '/dataset/mushaf-pages/qaloon/pages/001.svg',
          ],
          totalBytes: 2_400_000,
        }
      }
      return { urls: [], totalBytes: 0 }
    })
    vi.mocked(offlineMod.getStorageBudget).mockResolvedValue({ usage: 1_000_000, quota: 100_000_000, available: 99_000_000 })
    setOfflineCategoriesMock.mockClear()
    startCategoryDownloadMock.mockClear()
    startSourceAssetDownloadMock.mockClear()
    startPageAssetDownloadMock.mockClear()
    removeSourceAssetDownloadMock.mockClear()
    removeCategoryDownloadMock.mockClear()
    removePageAssetDownloadMock.mockClear()
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
    await waitFor(() => {
      expect(document.querySelector('[data-testid="storage-check-text"]')).not.toBeNull()
    })
    expect(document.querySelector('[data-testid="storage-check-audio"]')).toBeNull()
    expect(document.querySelector('[data-testid="storage-check-pages"]')).toBeNull()
    expect(document.querySelector('[data-testid="storage-check-search"]')).toBeNull()
  })

  it('describes the Text row as including knowledge context without adding a fifth row', async () => {
    render(OfflineSelector)
    await flush()
    expect(document.querySelectorAll('.qa-storage-row')).toHaveLength(4)
    expect(document.querySelector('[data-testid="storage-row-text"]')?.textContent).toContain('Knowledge context')
  })

  it('renders source-aware translation and tafsir cache controls', async () => {
    render(OfflineSelector)
    await flush()
    await waitFor(() => {
      expect(document.querySelector('[data-testid="storage-source-check-translation-saheeh"]')).not.toBeNull()
      expect(document.querySelector('[data-testid="storage-source-check-tafsir-mukhtasar"]')).not.toBeNull()
    })
  })

  it('renders per-riwayah page controls for available packs and stale opt-ins', async () => {
    Object.assign(settings, {
      offlineCategories: {
        ...DEFAULT_OFFLINE_CATEGORIES,
        text: { riwayat: {}, translations: {}, tafsir: {} },
        pages: { hafs: true },
      },
    })

    render(OfflineSelector)
    await flush()

    await waitFor(() => {
      expect(document.querySelector('[data-testid="storage-page-check-qaloon"]')).not.toBeNull()
      expect(document.querySelector('[data-testid="storage-page-check-hafs"]')).not.toBeNull()
    })
    expect(document.querySelector('[data-testid="storage-page-check-warsh"]')).toBeNull()
  })

  it('renders optional Hafs and Warsh page controls when their artifacts are present', async () => {
    const offlineMod = await import('../../../../src/data/offline-client.ts')
    vi.mocked(offlineMod.getPageAssetManifest).mockImplementation(async (riwayah: string) => ({
      urls: [
        `/dataset/mushaf-pages/${riwayah}/manifest.json`,
        `/dataset/mushaf-pages/${riwayah}/pages/001.svg`,
      ],
      totalBytes: 2_400_000,
    }))

    render(OfflineSelector)
    await flush()

    await waitFor(() => {
      expect(document.querySelector('[data-testid="storage-page-check-qaloon"]')).not.toBeNull()
      expect(document.querySelector('[data-testid="storage-page-check-hafs"]')).not.toBeNull()
      expect(document.querySelector('[data-testid="storage-page-check-warsh"]')).not.toBeNull()
    })
  })

  it('Apply disabled at boot (no diff) and after toggling becomes enabled', async () => {
    render(OfflineSelector)
    await flush()
    const apply = document.querySelector('[data-testid="storage-apply"]') as HTMLButtonElement
    expect(apply.disabled).toBe(true)

    const checkbox = await waitFor(() => {
      const el = document.querySelector('[data-testid="storage-check-text"]') as HTMLInputElement | null
      expect(el).not.toBeNull()
      return el!
    })
    await fireEvent.click(checkbox)
    await flush()
    expect(apply.disabled).toBe(false)
  })

  it('Apply commits via setOfflineCategories and dispatches download for the toggled category', async () => {
    render(OfflineSelector)
    await flush()
    const checkbox = await waitFor(() => {
      const el = document.querySelector('[data-testid="storage-check-text"]') as HTMLInputElement | null
      expect(el).not.toBeNull()
      return el!
    })
    await fireEvent.click(checkbox)
    await flush()

    const apply = document.querySelector('[data-testid="storage-apply"]') as HTMLButtonElement
    await waitFor(() => {
      expect(apply.disabled).toBe(false)
    })
    await fireEvent.click(apply)

    await waitFor(() => {
      expect(setOfflineCategoriesMock).toHaveBeenCalledTimes(1)
    })
    expect(setOfflineCategoriesMock.mock.calls[0][0].text).toEqual({
      riwayat: { qaloon: true },
      translations: { bridges: true },
      tafsir: { muyassar: true },
    })
    expect(startCategoryDownloadMock).toHaveBeenCalledWith('text')
  })

  it('Apply caches selected optional source packs and records them source-aware', async () => {
    render(OfflineSelector)
    const checkbox = await waitFor(() => {
      const el = document.querySelector('[data-testid="storage-source-check-tafsir-mukhtasar"]') as HTMLInputElement | null
      expect(el).not.toBeNull()
      return el!
    })
    await fireEvent.click(checkbox)
    await flush()

    const apply = document.querySelector('[data-testid="storage-apply"]') as HTMLButtonElement
    await waitFor(() => {
      expect(apply.disabled).toBe(false)
    })
    await fireEvent.click(apply)

    await waitFor(() => {
      expect(startSourceAssetDownloadMock).toHaveBeenCalledWith('tafsir', 'mukhtasar')
    })
    expect(setOfflineCategoriesMock.mock.calls[0][0].text.tafsir.mukhtasar).toBe(true)
  })

  it('Apply uses page helpers for per-riwayah Pages packs', async () => {
    render(OfflineSelector)
    const checkbox = await waitFor(() => {
      const el = document.querySelector('[data-testid="storage-page-check-qaloon"]') as HTMLInputElement | null
      expect(el).not.toBeNull()
      return el!
    })
    await fireEvent.click(checkbox)
    await flush()

    const apply = document.querySelector('[data-testid="storage-apply"]') as HTMLButtonElement
    await waitFor(() => {
      expect(apply.disabled).toBe(false)
    })
    await fireEvent.click(apply)

    await waitFor(() => {
      expect(startPageAssetDownloadMock).toHaveBeenCalledWith('qaloon')
    })
    expect(startCategoryDownloadMock).not.toHaveBeenCalledWith('pages')
    expect(setOfflineCategoriesMock.mock.calls[0][0].pages).toEqual({ qaloon: true })
  })

  it('downloads page packs before generic service-worker categories', async () => {
    render(OfflineSelector)
    const textCheckbox = await waitFor(() => {
      const el = document.querySelector('[data-testid="storage-check-text"]') as HTMLInputElement | null
      expect(el).not.toBeNull()
      return el!
    })
    const pageCheckbox = await waitFor(() => {
      const el = document.querySelector('[data-testid="storage-page-check-qaloon"]') as HTMLInputElement | null
      expect(el).not.toBeNull()
      return el!
    })

    await fireEvent.click(textCheckbox)
    await fireEvent.click(pageCheckbox)
    await flush()

    const apply = document.querySelector('[data-testid="storage-apply"]') as HTMLButtonElement
    await waitFor(() => {
      expect(apply.disabled).toBe(false)
    })
    await fireEvent.click(apply)

    await waitFor(() => {
      expect(startPageAssetDownloadMock).toHaveBeenCalledWith('qaloon')
      expect(startCategoryDownloadMock).toHaveBeenCalledWith('text')
    })
    expect(startPageAssetDownloadMock.mock.invocationCallOrder[0]!)
      .toBeLessThan(startCategoryDownloadMock.mock.invocationCallOrder[0]!)
  })

  it('refuses Apply pre-flight when selection exceeds available quota (Q4)', async () => {
    const offlineMod = await import('../../../../src/data/offline-client.ts')
    ;(offlineMod.getStorageBudget as unknown as { mockResolvedValueOnce: (v: unknown) => void })
      .mockResolvedValueOnce({ usage: 0, quota: 1_000_000, available: 1_000 })

    render(OfflineSelector)
    await flush()
    const checkbox = await waitFor(() => {
      const el = document.querySelector('[data-testid="storage-check-text"]') as HTMLInputElement | null
      expect(el).not.toBeNull()
      return el!
    })
    await fireEvent.click(checkbox)
    await flush()

    const apply = document.querySelector('[data-testid="storage-apply"]') as HTMLButtonElement
    await waitFor(() => {
      expect(apply.disabled).toBe(true)
      expect(document.querySelector('[data-testid="storage-quota-err"]')).not.toBeNull()
    })
  })
})
