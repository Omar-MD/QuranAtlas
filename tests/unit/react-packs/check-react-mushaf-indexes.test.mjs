import { describe, expect, it } from 'vitest'

import {
  validateMushafIndexData,
  validateMushafIndexManifestAgreement,
  validateMushafManifestData,
} from '../../../scripts/check-react-mushaf-indexes.mjs'

function descriptor(page, width) {
  return {
    assetPath: `pages/${String(page).padStart(3, '0')}-${width}.webp`,
    bytes: width,
    sha256: 'a'.repeat(64),
    width,
    height: Math.round(width * 1.27),
    mimeType: 'image/webp',
  }
}

function privateManifest() {
  return {
    version: 2,
    riwayah: 'qaloon',
    mushafEditionId: 'qalun-furatiyyah-2023-v1',
    pageCount: 604,
    pages: Array.from({ length: 604 }, (_, index) => {
      const page = index + 1
      const preview = descriptor(page, 1280)
      const fallback = descriptor(page, 2136)
      return {
        page,
        firstVerse: { surah: 1, verse: page },
        framing: { textFrame: { x: 0, y: 0, width: 1, height: 1 }, sideLane: 'none' },
        media: { kind: 'external-image', fallback, sources: [preview, fallback] },
      }
    }),
  }
}

function privateIndex(manifest) {
  const manifestUrl = '/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/manifest.json'
  const files = manifest.pages.flatMap((page) => page.media.sources.map((source) => ({
    url: `/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/${source.assetPath}`,
    ...source,
  })))
  return {
    manifestUrl,
    index: { assets: [{
      packId: 'mushaf-pages:qaloon:qalun-furatiyyah-2023-v1',
      riwayah: 'qaloon',
      mushafEditionId: 'qalun-furatiyyah-2023-v1',
      manifestUrl,
      pageCount: 604,
      totalBytes: 1,
      version: 'v2',
      pageUrls: manifest.pages.map((page) => `/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/${page.media.fallback.assetPath}`),
      files,
      deliveryMode: 'on-demand-pack',
    }] },
  }
}

function quranWsIndexEntry() {
  return {
    packId: 'mushaf-pages:qaloon:qalun-quran-ws-v1',
    riwayah: 'qaloon',
    mushafEditionId: 'qalun-quran-ws-v1',
    label: 'Qalun pages',
    manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
    pageCount: 604,
    totalBytes: 1,
    version: 'v1',
    provenance: 'fixture',
    pageUrlTemplate: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/{page}.svg',
    deliveryMode: 'on-demand-pack',
    availability: 'available',
  }
}

describe('check-react-mushaf-indexes', () => {
  it('accepts edition-aware Mushaf indexes', () => {
    expect(validateMushafIndexData({
      packs: [quranWsIndexEntry()],
    })).toEqual([])
  })

  it('accepts the complete private profile edition membership', () => {
    const manifest = privateManifest()
    const { index, manifestUrl } = privateIndex(manifest)
    index.assets.unshift(quranWsIndexEntry())

    expect(index.assets.map((asset) => asset.mushafEditionId)).toEqual([
      'qalun-quran-ws-v1',
      'qalun-furatiyyah-2023-v1',
    ])
    expect(validateMushafIndexData(index)).toEqual([])
    expect(validateMushafIndexManifestAgreement(index, { [manifestUrl]: manifest })).toEqual([])
  })

  it('accepts a complete V2 external-image manifest and matching descriptors', () => {
    const manifest = privateManifest()
    const { index, manifestUrl } = privateIndex(manifest)
    expect(validateMushafManifestData(manifest)).toEqual([])
    expect(validateMushafIndexData(index)).toEqual([])
    expect(validateMushafIndexManifestAgreement(index, { [manifestUrl]: manifest })).toEqual([])
  })

  it('rejects malformed V2 media descriptors and mismatched index entries', () => {
    const manifest = privateManifest()
    manifest.pages[0].framing.textFrame.width = 1.1
    manifest.pages[1].media.sources.pop()
    manifest.pages[2].media.sources[0].mimeType = 'image/png'
    manifest.pages[3].media.sources[0].sha256 = 'not-a-digest'
    expect(validateMushafManifestData(manifest)).toEqual(expect.arrayContaining([
      'page 1 textFrame is not contained by the Full frame',
      'page 2 sources are incomplete',
      'page 3 preview MIME type is invalid',
      'page 4 preview sha256 is invalid',
    ]))
    const manifestUrl = '/dataset/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/manifest.json'
    const index = { assets: [{
      packId: 'mushaf-pages:qaloon:qalun-furatiyyah-2023-v1', riwayah: 'qaloon', mushafEditionId: 'qalun-furatiyyah-2023-v1', manifestUrl,
      pageCount: 604, totalBytes: 1, version: 'v2', deliveryMode: 'on-demand-pack', pageUrls: Array.from({ length: 604 }, () => manifestUrl), files: [],
    }] }
    expect(validateMushafIndexManifestAgreement(index, { [manifestUrl]: manifest })).not.toEqual([])
  })

  it('rejects V2 manifest identity and fallback URLs that cross into a sibling edition', () => {
    const manifest = privateManifest()
    const { index, manifestUrl } = privateIndex(manifest)
    manifest.riwayah = 'warsh'
    index.assets[0].pageUrls[0] = '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001-2136.webp'
    expect(validateMushafIndexManifestAgreement(index, { [manifestUrl]: manifest })).toEqual(expect.arrayContaining([
      'mushaf-pages:qaloon:qalun-furatiyyah-2023-v1: manifest identity disagrees with its asset index',
      'mushaf-pages:qaloon:qalun-furatiyyah-2023-v1: page 1 fallback URL disagrees with its asset index',
    ]))
  })
})
