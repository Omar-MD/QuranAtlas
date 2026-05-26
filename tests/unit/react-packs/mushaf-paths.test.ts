import { describe, expect, it } from 'vitest'

import { assertReactMushafCacheName, reactMushafPackCacheName } from '../../../src-react/packs/mushaf-cache'
import { assertReactMushafUrl, isLegacyMushafPageUrl, mushafManifestUrl, mushafPageUrl } from '../../../src-react/packs/mushaf-paths'

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

  it('requires edition-aware cache names', () => {
    const cacheName = reactMushafPackCacheName({ riwayah: 'qaloon', mushafEditionId: 'qalun-quran-ws-v1', version: 'v1' })
    expect(cacheName).toBe('quran-atlas-react-mushaf-pages-qaloon--qalun-quran-ws-v1--v1')
    expect(() => assertReactMushafCacheName('quran-atlas-react-mushaf-pages-qaloon-v1')).toThrow(/edition/)
  })
})
