import { describe, expect, it } from 'vitest'

import {
  DEFAULT_READER_ASSET_PROFILE,
  MVP_ASSET_CONTRACT_ID,
  RESET_CACHE_NAME_PREFIXES,
  readerAssetProfileRows,
} from '../../../shared/reader-assets/default-profile'

describe('default reader asset profile', () => {
  it('describes the single current MVP asset contract', () => {
    expect(MVP_ASSET_CONTRACT_ID).toBe('mvp-default-assets-qaloon-bridges-v1')
    expect(RESET_CACHE_NAME_PREFIXES).toEqual(['quran-', 'qa-', 'quran-atlas-react', 'workbox-'])
    expect(DEFAULT_READER_ASSET_PROFILE).toEqual({
      id: 'qaloon-bridges-default',
      label: 'Qaloon with Bridges',
      riwayah: 'qaloon',
      quranTextStyleId: 'uthmani-kfgqpc-v1',
      quranFontId: 'kfgqpc-qaloon-v10',
      mushafEditionId: 'qalun-quran-ws-v1',
      translationId: 'bridges',
      tafsirId: null,
    })
  })

  it('exposes exactly the three informational inventory rows', () => {
    expect(readerAssetProfileRows(DEFAULT_READER_ASSET_PROFILE)).toEqual([
      { id: 'qaloon-text-font', group: 'quran-text', label: 'Qaloon Text + Font', assetIds: ['uthmani-kfgqpc-v1', 'kfgqpc-qaloon-v10'] },
      { id: 'qaloon-mushaf', group: 'mushaf', label: 'Qaloon Mushaf', assetIds: ['qalun-quran-ws-v1'] },
      { id: 'bridges-translation', group: 'translation', label: 'Bridges Translation', assetIds: ['bridges'] },
    ])
  })
})
