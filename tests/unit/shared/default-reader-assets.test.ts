import { describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_READER_ASSET_PROFILE,
  MVP_ASSET_CONTRACT_ID,
  RESET_CACHE_NAME_PREFIXES,
  resolveReaderAssetProfileRows,
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
      { id: 'qaloon-text-font', group: 'quran-text', assetIds: ['uthmani-kfgqpc-v1', 'kfgqpc-qaloon-v10'] },
      { id: 'qaloon-mushaf', group: 'mushaf', assetIds: ['qalun-quran-ws-v1'] },
      { id: 'bridges-translation', group: 'translation', assetIds: ['bridges'] },
    ])
  })

  it('resolves row names from the loaded runtime asset indexes', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/text-assets.json') {
        return new Response(JSON.stringify({
          version: 1,
          assets: [{ riwayah: 'qaloon', textStyleId: 'uthmani-kfgqpc-v1', label: 'Loaded Qaloon Text' }],
        }), { status: 200 })
      }
      if (url === '/dataset/provenance.json') {
        return new Response(JSON.stringify({
          riwayat: [{ id: 'qaloon', fontFamily: 'Loaded Qaloon Font' }],
        }), { status: 200 })
      }
      if (url === '/dataset/indexes/mushaf-assets.json') {
        return new Response(JSON.stringify({
          version: 1,
          assets: [{ riwayah: 'qaloon', mushafEditionId: 'qalun-quran-ws-v1', label: 'Loaded Qaloon Mushaf' }],
        }), { status: 200 })
      }
      if (url === '/dataset/indexes/sources.json') {
        return new Response(JSON.stringify({
          version: 1,
          sources: [{ id: 'bridges', type: 'translation', displayLabel: 'Loaded Bridges' }],
        }), { status: 200 })
      }
      return new Response('{}', { status: 404 })
    })

    await expect(resolveReaderAssetProfileRows(DEFAULT_READER_ASSET_PROFILE, { fetcher })).resolves.toEqual([
      { id: 'qaloon-text-font', group: 'quran-text', label: 'Loaded Qaloon Text + Loaded Qaloon Font', assetIds: ['uthmani-kfgqpc-v1', 'kfgqpc-qaloon-v10'] },
      { id: 'qaloon-mushaf', group: 'mushaf', label: 'Loaded Qaloon Mushaf', assetIds: ['qalun-quran-ws-v1'] },
      { id: 'bridges-translation', group: 'translation', label: 'Loaded Bridges', assetIds: ['bridges'] },
    ])
    expect(fetcher).toHaveBeenCalledTimes(4)
  })
})
