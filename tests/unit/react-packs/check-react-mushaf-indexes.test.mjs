import { describe, expect, it } from 'vitest'

import { validateMushafIndexData } from '../../../scripts/check-react-mushaf-indexes.mjs'

describe('check-react-mushaf-indexes', () => {
  it('accepts edition-aware Mushaf indexes', () => {
    expect(validateMushafIndexData({
      packs: [{
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
      }],
    })).toEqual([])
  })
})
