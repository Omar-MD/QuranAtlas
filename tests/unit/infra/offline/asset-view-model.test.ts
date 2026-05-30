import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultAssetInventoryRows, loadDefaultAssetInventoryRows } from '../../../../src/configure/assets/asset-view-model'

describe('asset row view model', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns read-only fallback rows for the default MVP profile', () => {
    const rows = defaultAssetInventoryRows()

    expect(rows.map((row) => row.label)).toEqual([
      'uthmani-kfgqpc-v1 + kfgqpc-qaloon-v10',
      'qalun-quran-ws-v1',
      'bridges',
    ])
    expect(rows.every((row) => row.status === 'default-installed')).toBe(true)
    expect(rows.every((row) => row.active === true)).toBe(true)
    expect(rows.every((row) => row.primaryAction === null)).toBe(true)
    expect(rows.every((row) => row.secondaryAction === null)).toBe(true)
  })

  it('uses loaded runtime asset labels when indexes are available', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/dataset/indexes/text-assets.json') {
        return new Response(JSON.stringify({
          assets: [{ riwayah: 'qaloon', textStyleId: 'uthmani-kfgqpc-v1', label: 'Loaded Text' }],
        }), { status: 200 })
      }
      if (url === '/dataset/provenance.json') {
        return new Response(JSON.stringify({
          riwayat: [{ id: 'qaloon', fontFamily: 'Loaded Font' }],
        }), { status: 200 })
      }
      if (url === '/dataset/indexes/mushaf-assets.json') {
        return new Response(JSON.stringify({
          assets: [{ riwayah: 'qaloon', mushafEditionId: 'qalun-quran-ws-v1', label: 'Loaded Mushaf' }],
        }), { status: 200 })
      }
      if (url === '/dataset/indexes/sources.json') {
        return new Response(JSON.stringify({
          sources: [{ id: 'bridges', type: 'translation', displayLabel: 'Loaded Translation' }],
        }), { status: 200 })
      }
      return new Response('{}', { status: 404 })
    }))

    await expect(loadDefaultAssetInventoryRows()).resolves.toMatchObject([
      { label: 'Loaded Text + Loaded Font' },
      { label: 'Loaded Mushaf' },
      { label: 'Loaded Translation' },
    ])
  })
})
