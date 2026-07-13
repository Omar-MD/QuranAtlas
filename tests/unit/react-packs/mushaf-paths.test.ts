import { describe, expect, it, vi } from 'vitest'

import { assertReactMushafCacheName, reactMushafPackCacheName } from '../../../src/packs/mushaf-cache'
import { validateMushafAssetIndexEntry } from '../../../src/packs/mushaf-index'
import {
  loadMushafPageProfileContext,
  loadPreparedMushafPage,
} from '../../../src/packs/mushaf-page-asset'
import {
  assertReactMushafUrl,
  isLegacyMushafPageUrl,
  mushafManifestUrl,
  mushafPageUrl,
  resolveMushafEditionAssetUrl,
} from '../../../src/packs/mushaf-paths'

describe('React Mushaf paths', () => {
  it.each([
    ['V1 inline SVG', v1LoaderFixture(), 'inline-svg'],
    ['V2 external image', v2LoaderFixture(), 'external-image'],
  ] as const)('uses one validated profile context to prepare %s pages', async (_label, fixture, expectedKind) => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(fixture.index)
      if (url === fixture.index.assets[0].manifestUrl) return jsonResponse(fixture.manifest)
      if (url.endsWith('.svg')) return textResponse('<svg viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg"><path d="M10 10h100v160H10z" fill="#000"/></svg>')
      return jsonResponse({}, { ok: false, status: 404 })
    })

    const context = await loadMushafPageProfileContext({ fetcher, ...fixture.identity })
    const prepared = await loadPreparedMushafPage({ context, fetcher, page: 1, ...fixture.identity })

    expect(prepared.kind).toBe(expectedKind)
    expect(fetcher.mock.calls.filter(([input]) => String(input) === '/dataset/indexes/mushaf-assets.json')).toHaveLength(1)
    expect(fetcher.mock.calls.filter(([input]) => String(input) === fixture.index.assets[0].manifestUrl)).toHaveLength(1)
  })

  it('validates the complete V2 profile once and keeps page media checks local', async () => {
    const fixture = v2LoaderFixture()
    const lastPage = fixture.manifest.pages.at(-1)!
    const lastPageMedia = lastPage.media
    let lastPageMediaReads = 0
    Object.defineProperty(lastPage, 'media', {
      configurable: true,
      enumerable: true,
      get: () => {
        lastPageMediaReads += 1
        return lastPageMedia
      },
    })
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/mushaf-assets.json') return jsonResponse(fixture.index)
      if (url === fixture.index.assets[0].manifestUrl) return jsonResponse(fixture.manifest)
      return jsonResponse({}, { ok: false, status: 404 })
    })

    const context = await loadMushafPageProfileContext({ fetcher, ...fixture.identity })
    const readsAfterProfileValidation = lastPageMediaReads
    expect(readsAfterProfileValidation).toBeGreaterThan(0)

    await loadPreparedMushafPage({ context, fetcher, page: 1, ...fixture.identity })
    await loadPreparedMushafPage({ context, fetcher, page: 2, ...fixture.identity })
    expect(lastPageMediaReads).toBe(readsAfterProfileValidation)

    context.manifest.pages[1]!.media.sources[0]!.sha256 = 'c'.repeat(64)
    await expect(loadPreparedMushafPage({ context, fetcher, page: 2, ...fixture.identity }))
      .rejects.toThrow(/descriptor disagrees with its asset index/)
  })

  it('builds edition-aware manifest and page URLs', () => {
    const identity = { riwayah: 'qaloon', mushafEditionId: 'qalun-quran-ws-v1' }
    expect(mushafManifestUrl(identity)).toBe('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json')
    expect(mushafPageUrl(identity, 1)).toBe('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg')
  })

  it('rejects legacy React Mushaf URLs', () => {
    expect(isLegacyMushafPageUrl('/dataset/mushaf-pages/qaloon/manifest.json')).toBe(true)
    expect(() => assertReactMushafUrl('/dataset/mushaf-pages/qaloon/pages/001.svg')).toThrow(/edition-aware/)
  })

  it('rejects external URLs and path traversal before any page fetch', () => {
    expect(() => assertReactMushafUrl('https://evil.test/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg')).toThrow(/same-origin/)
    expect(() => assertReactMushafUrl('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/../001.svg')).toThrow(/Invalid React Mushaf URL/)
    expect(() => assertReactMushafUrl('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/%2e%2e/001.svg')).toThrow(/Invalid React Mushaf URL/)
  })

  it('resolves only edition-relative external WebP paths', () => {
    const identity = { riwayah: 'qaloon', mushafEditionId: 'qalun-furatiyyah-2023-v1' }

    expect(resolveMushafEditionAssetUrl(identity, 'pages/001-1280.webp')).toBe(
      '/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/pages/001-1280.webp',
    )
    expect(() => resolveMushafEditionAssetUrl(identity, 'pages/001.svg')).toThrow(/external Mushaf asset path/i)
    expect(() => resolveMushafEditionAssetUrl(identity, '../pages/001-1280.webp')).toThrow(/external Mushaf asset path/i)
    expect(() => resolveMushafEditionAssetUrl(identity, '/pages/001-1280.webp')).toThrow(/external Mushaf asset path/i)
    expect(() => resolveMushafEditionAssetUrl(identity, 'https://evil.test/pages/001-1280.webp')).toThrow(/external Mushaf asset path/i)
  })

  it('keeps V2 WebP fallback and file URLs edition-aware in the asset index', () => {
    const identity = { riwayah: 'qaloon', mushafEditionId: 'qalun-furatiyyah-2023-v1' }
    const pageUrls = Array.from(
      { length: 604 },
      (_, index) => `/dataset/mushaf-pages/${identity.riwayah}/${identity.mushafEditionId}/pages/${String(index + 1).padStart(3, '0')}-2136.webp`,
    )

    expect(validateMushafAssetIndexEntry({
      availability: 'available',
      deliveryMode: 'on-demand-pack',
      label: 'Qalun Furatiyyah 2023',
      manifestUrl: `/dataset/mushaf-pages/${identity.riwayah}/${identity.mushafEditionId}/manifest.json`,
      mushafEditionId: identity.mushafEditionId,
      packId: `mushaf-pages:${identity.riwayah}:${identity.mushafEditionId}`,
      pageCount: 604,
      pageUrls,
      provenance: 'test-fixture',
      riwayah: identity.riwayah,
      totalBytes: 1,
      version: 'v2',
      files: [{ url: pageUrls[0]!, bytes: 2136, sha256: 'a'.repeat(64), width: 2136, height: 2720, mimeType: 'image/webp' }],
    })).toMatchObject({ pageUrls })
  })

  it('requires edition-aware cache names', () => {
    const cacheName = reactMushafPackCacheName({ riwayah: 'qaloon', mushafEditionId: 'qalun-quran-ws-v1', version: 'v1' })
    expect(cacheName).toBe('quran-atlas-react-mushaf-pages-qaloon--qalun-quran-ws-v1--v1')
    expect(() => assertReactMushafCacheName('quran-atlas-react-mushaf-pages-qaloon-v1')).toThrow(/edition/)
  })
})

function v1LoaderFixture() {
  const identity = { riwayah: 'qaloon' as const, mushafEditionId: 'qalun-quran-ws-v1' }
  const manifestUrl = `/dataset/mushaf-pages/${identity.riwayah}/${identity.mushafEditionId}/manifest.json`
  const pageUrl = `/dataset/mushaf-pages/${identity.riwayah}/${identity.mushafEditionId}/pages/001.svg`
  return {
    identity,
    index: { assets: [{ ...identity, files: [{ url: manifestUrl }, { url: pageUrl }], manifestUrl, pageCount: 604, version: 'v1' }] },
    manifest: {
      ...identity,
      pageCount: 604,
      pages: [{ assetPath: 'pages/001.svg', displayViewBox: '0 0 120 180', firstVerse: { surah: 1, verse: 1 }, page: 1, viewBox: '0 0 120 180' }],
      verseToPage: { '1:1': 1 },
      version: 1 as const,
    },
  }
}

function v2LoaderFixture() {
  const identity = { riwayah: 'qaloon' as const, mushafEditionId: 'qalun-furatiyyah-2023-v1' }
  const manifestUrl = `/dataset/mushaf-pages/${identity.riwayah}/${identity.mushafEditionId}/manifest.json`
  const pages = Array.from({ length: 604 }, (_, index) => {
    const page = index + 1
    const id = String(page).padStart(3, '0')
    const preview = { assetPath: `pages/${id}-1280.webp`, bytes: 1280, height: 1630, mimeType: 'image/webp' as const, sha256: 'b'.repeat(64), width: 1280 }
    const full = { assetPath: `pages/${id}-2136.webp`, bytes: 2136, height: 2720, mimeType: 'image/webp' as const, sha256: 'a'.repeat(64), width: 2136 }
    return {
      firstVerse: { surah: 1, verse: page },
      framing: { sideLane: 'left' as const, textFrame: { height: 0.9, width: 0.8, x: 0.1, y: 0.05 } },
      media: { fallback: full, kind: 'external-image' as const, sources: [preview, full] },
      page,
    }
  })
  return {
    identity,
    index: { assets: [{
      ...identity,
      files: [
        { bytes: 1, url: manifestUrl },
        ...pages.flatMap((page) => page.media.sources.map((source) => ({ ...source, url: `/dataset/mushaf-pages/${identity.riwayah}/${identity.mushafEditionId}/${source.assetPath}` }))),
      ],
      manifestUrl,
      pageCount: 604,
      pageUrls: pages.map((page) => `/dataset/mushaf-pages/${identity.riwayah}/${identity.mushafEditionId}/${page.media.fallback.assetPath}`),
      version: 'v2',
    }] },
    manifest: { ...identity, pageCount: 604, pages, verseToPage: Object.fromEntries(pages.map((page) => [`1:${page.page}`, page.page])), version: 2 as const },
  }
}

function jsonResponse(payload: unknown, init: { ok?: boolean; status?: number } = {}) {
  return { json: async () => payload, ok: init.ok ?? true, status: init.status ?? 200 } as Response
}

function textResponse(payload: string) {
  return { ok: true, status: 200, text: async () => payload } as Response
}
