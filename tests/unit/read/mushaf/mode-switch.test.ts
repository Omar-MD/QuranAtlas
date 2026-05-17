import { beforeEach, describe, expect, it, vi } from 'vitest'
import { settings } from '../../../../src/configure/state.svelte'
import { reader } from '../../../../src/read/state.svelte'

vi.mock('../../../../src/packs/mushaf-pages', () => ({
  getMushafPackAvailability: vi.fn(async (riwayah: string) => ({
    riwayah,
    available: riwayah !== 'warsh',
    manifestUrl: `/dataset/mushaf-pages/${riwayah}/manifest.json`,
  })),
  pageForVerse: vi.fn(async ({ riwayah, surah, verse }) => {
    if (riwayah === 'hafs' && surah === 2 && verse === 255) return 43
    if (riwayah === 'qaloon' && surah === 2 && verse === 255) return 42
    return null
  }),
  loadMushafManifest: vi.fn(async () => ({
    version: 1,
    riwayah: 'qaloon',
    sourceSlug: 'qalun',
    pageCount: 604,
    attribution: { provider: 'quran.ws', sourceUrl: 'https://pdf.quran.ws/' },
    verseToPage: { '2:255': 42 },
    pages: [
      {
        page: 42,
        assetPath: 'pages/042.svg',
        viewBox: '0 0 900 1379.25',
        bytes: 1,
        sourcePdfUrl: 'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-42.pdf',
        firstVerse: { surah: 2, verse: 255 },
      },
    ],
  })),
}))

describe('mushaf mode switch helpers', () => {
  beforeEach(() => {
    settings.riwayah = 'qaloon'
    settings.currentPosition = { surah: 2, verse: 255 }
    reader.currentSurahNum = 2
    reader.currentVerseKey = '2:255'
    reader.currentSurah = {
      riwayah: 'qaloon',
      version: 'test',
      sura_no: 2,
      sura_name_ar: 'البقرة',
      sura_name_en: 'Al-Baqarah',
      ayat: [],
    }
    reader.currentMushafPage = 42
  })

  it('maps the current centered verse to its Mushaf page route', async () => {
    const { mushafHrefForCurrentVerse } = await import('../../../../src/read/mushaf/mode-switch')
    await expect(mushafHrefForCurrentVerse()).resolves.toBe('#/m/42')
  })

  it('uses the active settings riwayah when its page pack is available', async () => {
    settings.riwayah = 'hafs'
    const { mushafHrefForCurrentVerse } = await import('../../../../src/read/mushaf/mode-switch')
    await expect(mushafHrefForCurrentVerse()).resolves.toBe('#/m/43')
  })

  it('does not derive a page from another riwayah when the active page pack is unavailable', async () => {
    settings.riwayah = 'warsh'
    const { mushafHrefForCurrentVerse } = await import('../../../../src/read/mushaf/mode-switch')
    await expect(mushafHrefForCurrentVerse()).resolves.toBe('#/m/1')
  })

  it('uses the loaded active corpus page metadata when the active page pack is unavailable', async () => {
    settings.riwayah = 'warsh'
    reader.currentSurah = {
      riwayah: 'warsh',
      version: 'test',
      sura_no: 2,
      sura_name_ar: 'البقرة',
      sura_name_en: 'Al-Baqarah',
      ayat: [
        { jozz: 3, page: '86', aya_no: 255, aya_text: 'test' },
      ],
    }
    const { mushafHrefForCurrentVerse } = await import('../../../../src/read/mushaf/mode-switch')
    await expect(mushafHrefForCurrentVerse()).resolves.toBe('#/m/86')
  })

  it('maps a Mushaf page to the first verse route from the active manifest', async () => {
    const { verseHrefForMushafPage } = await import('../../../../src/read/mushaf/mode-switch')
    await expect(verseHrefForMushafPage(42)).resolves.toBe('#/s/2/255')
  })

  it('falls back to persisted current position when no mounted verse state is available', async () => {
    reader.currentSurahNum = null
    reader.currentVerseKey = null
    settings.currentPosition = { surah: 2, verse: 255 }
    const { mushafHrefForCurrentVerse } = await import('../../../../src/read/mushaf/mode-switch')
    await expect(mushafHrefForCurrentVerse()).resolves.toBe('#/m/42')
  })
})
