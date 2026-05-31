import { describe, expect, it } from 'vitest'

import { decodeSearchJsonShard, SearchPackReader } from '../../../src/search/pack-reader'
import { createFixturePack, MemoryCacheStorage, writeJsonShard } from './search-test-utils'

describe('Search pack reader', () => {
  it('decodes cached ABI shards from the active Search cache', async () => {
    const { cacheStorage, manifest } = await createFixturePack()
    const reader = new SearchPackReader(manifest, { cacheStorage })
    await expect(reader.findAyah('2:255')).resolves.toMatchObject({ arabicText: 'الله لا اله الا هو' })
  })

  it('rejects corrupt shard checksums and offline misses', async () => {
    const { cacheStorage, manifest } = await createFixturePack()
    const reader = new SearchPackReader({
      ...manifest,
      shards: [{ ...manifest.shards[0]!, checksum: '0'.repeat(64) }],
    }, { cacheStorage })
    await expect(reader.loadShard('core-references')).rejects.toMatchObject({ code: 'corrupt-shard' })

    const emptyReader = new SearchPackReader(manifest, { cacheStorage: new MemoryCacheStorage() })
    await expect(emptyReader.loadShard('core-references')).rejects.toMatchObject({ code: 'offline-miss' })
  })

  it('rejects wrong endian marker and unknown ABI major before trusting tables', () => {
    const wrongEndian = new Uint8Array(writeJsonShard({ kind: 'provenance', sourceIds: [], buildInputDigests: {}, generatedAt: '' }))
    new DataView(wrongEndian.buffer).setUint32(8, 0x04030201, true)
    expect(() => decodeSearchJsonShard(wrongEndian)).toThrow(/endian/)

    const wrongAbi = new Uint8Array(writeJsonShard({ kind: 'provenance', sourceIds: [], buildInputDigests: {}, generatedAt: '' }))
    new DataView(wrongAbi.buffer).setUint16(4, 99, true)
    expect(() => decodeSearchJsonShard(wrongAbi)).toThrow(/ABI major/)
  })

  it('rejects over-budget shards and missing features', async () => {
    const { cacheStorage, manifest } = await createFixturePack()
    const overBudget = new SearchPackReader({
      ...manifest,
      byteBudget: { ...manifest.byteBudget, maxShardBytes: 1 },
    }, { cacheStorage })
    await expect(overBudget.loadShard('core-references')).rejects.toMatchObject({ code: 'corrupt-shard' })

    const reader = new SearchPackReader(manifest, { cacheStorage })
    await expect(reader.loadFeature('morphology')).rejects.toMatchObject({ code: 'missing-feature' })
  })
})
