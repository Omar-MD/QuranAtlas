import { describe, expect, it } from 'vitest'

import { assertReactMushafCacheName, reactMushafPackCacheName } from '../../../src/packs/mushaf-cache'
import { validateMushafAssetIndexEntry } from '../../../src/packs/mushaf-index'
import {
  assertReactMushafUrl,
  isLegacyMushafPageUrl,
  mushafManifestUrl,
  mushafPageUrl,
  resolveMushafEditionAssetUrl,
} from '../../../src/packs/mushaf-paths'

describe('React Mushaf paths', () => {
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
