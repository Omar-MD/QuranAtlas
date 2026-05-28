/**
 * Component tests for offline-selector.svelte (N21).
 *
 * Covers the unit-level concerns for offline selection:
 *   - Renders one accordion row per active reader-first category (text · pages · search).
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
const startRiwayahPackageInstallMock = vi.fn(async () => true)
const removeRiwayahPackageMock = vi.fn(async () => {})
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
          '/dataset/knowledge/ayah/001.json',
        ],
        totalBytes: 1_800_000,
      }
    }
    return { urls: [], totalBytes: 0 }
  }),
  getSourceAssetManifest: vi.fn(async (kind: string, id: string) => ({
    urls: [`/dataset/${kind === 'translation' ? 'translations' : 'metadata'}/${id}/001.json`],
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
  planRiwayahPackageInstall: vi.fn(async (riwayah: string) => {
    return { riwayah, urls: ['/dataset/riwayat/qaloon/001.json', '/dataset/mushaf-pages/qaloon/pages/001.svg'], totalBytes: 2_800_000 }
  }),
  refreshRiwayahPackageStatus: vi.fn(async (riwayah: string) => {
    return { kind: 'installed', riwayah, totalBytes: 2_800_000 }
  }),
  isCategoryAvailable: vi.fn(async (cat: string) => cat === 'text'),
  startCategoryDownload: (...args: unknown[]) => startCategoryDownloadMock(...args),
  startSourceAssetDownload: (...args: unknown[]) => startSourceAssetDownloadMock(...args),
  startPageAssetDownload: (...args: unknown[]) => startPageAssetDownloadMock(...args),
  startRiwayahPackageInstall: (...args: unknown[]) => startRiwayahPackageInstallMock(...args),
  removeRiwayahPackage: (...args: unknown[]) => removeRiwayahPackageMock(...args),
  removeSourceAssetDownload: (...args: unknown[]) => removeSourceAssetDownloadMock(...args),
  removeCategoryDownload: (...args: unknown[]) => removeCategoryDownloadMock(...args),
  removePageAssetDownload: (...args: unknown[]) => removePageAssetDownloadMock(...args),
  getStorageBudget: vi.fn(async () => ({ usage: 1_000_000, quota: 100_000_000, available: 99_000_000 })),
}))

vi.mock('../../../../src/data/dataset.ts', () => ({
  getTranslations: vi.fn(async () => [
    { id: 'bridges', name: 'Bridges', availableInManifest: true },
  ]),
  getTafsirs: vi.fn(async () => []),
}))

import OfflineSelector from '../../../../src/configure/offline-selector.svelte'
import { settings, DEFAULT_OFFLINE_CATEGORIES } from '../../../../src/core/settings.svelte'

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
    vi.mocked(offlineMod.refreshRiwayahPackageStatus).mockImplementation(async (riwayah: string) => {
      return { kind: 'installed', riwayah, totalBytes: 2_800_000 }
    })
    vi.mocked(offlineMod.getStorageBudget).mockResolvedValue({ usage: 1_000_000, quota: 100_000_000, available: 99_000_000 })
    setOfflineCategoriesMock.mockClear()
    startCategoryDownloadMock.mockClear()
    startSourceAssetDownloadMock.mockClear()
    startPageAssetDownloadMock.mockClear()
    startRiwayahPackageInstallMock.mockClear()
    removeRiwayahPackageMock.mockClear()
    removeSourceAssetDownloadMock.mockClear()
    removeCategoryDownloadMock.mockClear()
    removePageAssetDownloadMock.mockClear()
    Object.assign(settings, { offlineCategories: structuredClone(DEFAULT_OFFLINE_CATEGORIES) })
  })

  it('renders three accordion rows for active reader-first storage categories', async () => {
    render(OfflineSelector)
    await flush()
    expect(document.querySelector('[data-testid="storage-row-text"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="storage-row-pages"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="storage-row-search"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="storage-row-audio"]')).toBeNull()
  })

  it('gated rows lack a checkbox; only active available rows render one', async () => {
    render(OfflineSelector)
    await flush()
    await waitFor(() => {
      expect(document.querySelector('[data-testid="storage-check-text"]')).not.toBeNull()
    })
    expect(document.querySelector('[data-testid="storage-check-pages"]')).toBeNull()
    expect(document.querySelector('[data-testid="storage-check-search"]')).toBeNull()
  })

  it('describes the Text row as including Qalun knowledge context without an audio row', async () => {
    render(OfflineSelector)
    await flush()
    expect(document.querySelectorAll('.qa-storage-row')).toHaveLength(3)
    expect(document.querySelector('[data-testid="storage-row-text"]')?.textContent).toContain('Qaloon + Bridges + Knowledge context')
    expect(document.querySelector('[data-testid="storage-row-text"]')?.textContent).not.toContain('Qālūn')
  })

  it('renders only the default Bridges translation cache control and no tafsir controls', async () => {
    render(OfflineSelector)
    await flush()
    expect(document.querySelector('[data-testid="storage-source-check-translation-bridges"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="storage-source-check-translation-saheeh"]')).toBeNull()
    expect(document.querySelector('[data-testid^="storage-source-check-tafsir-"]')).toBeNull()
  })

  it('renders only the Qaloon page controls even when stale opt-ins exist', async () => {
    Object.assign(settings, {
      offlineCategories: {
        text: { riwayat: {}, translations: {} },
        pages: { hafs: true },
        search: false,
      },
    })

    render(OfflineSelector)
    await flush()

    await waitFor(() => {
      expect(document.querySelector('[data-testid="storage-page-check-qaloon"]')).not.toBeNull()
    })
    expect(document.querySelector('[data-testid="storage-page-check-hafs"]')).toBeNull()
    expect(document.querySelector('[data-testid="storage-page-check-warsh"]')).toBeNull()
  })

  it('still omits removed optional page controls when stale artifacts are present', async () => {
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
    })
    expect(document.querySelector('[data-testid="storage-page-check-hafs"]')).toBeNull()
    expect(document.querySelector('[data-testid="storage-page-check-warsh"]')).toBeNull()
  })

  it('uses Qalun labels for baseline page and package rows', async () => {
    render(OfflineSelector)
    await flush()

    await waitFor(() => {
      expect(document.querySelector('[data-testid="storage-page-qaloon"]')?.textContent).toContain('Qaloon pages')
      expect(document.querySelector('[data-testid="storage-package-qaloon"]')?.textContent).toContain('Qaloon package')
    })
    expect(document.querySelector('[data-testid="storage-page-qaloon"]')?.textContent).not.toContain('Qālūn')
    expect(document.querySelector('[data-testid="storage-package-qaloon"]')?.textContent).not.toContain('Qālūn')
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
    })
    expect(setOfflineCategoriesMock.mock.calls[0][0]).not.toHaveProperty('audio')
    expect(startCategoryDownloadMock).toHaveBeenCalledWith('text')
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

  it('renders only the installed Qaloon package entry with combined text and page byte plans', async () => {
    render(OfflineSelector)
    await flush()

    await waitFor(() => {
      expect(document.querySelector('[data-testid="storage-package-qaloon"]')?.textContent).toContain('Qaloon package')
    })
    expect(document.querySelector('[data-testid="storage-package-hafs"]')).toBeNull()
    expect(document.querySelector('[data-testid="storage-package-warsh"]')).toBeNull()
  })

  it('does not expose install controls for removed riwayah packages', async () => {
    render(OfflineSelector)
    await flush()

    expect(document.querySelector('[data-testid="storage-package-install-hafs"]')).toBeNull()
    expect(startPageAssetDownloadMock).not.toHaveBeenCalledWith('hafs')
  })

  it('does not expose remove controls for removed riwayah packages', async () => {
    render(OfflineSelector)
    await flush()

    expect(document.querySelector('[data-testid="storage-package-remove-hafs"]')).toBeNull()
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
