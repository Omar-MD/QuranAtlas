import { readFile } from 'node:fs/promises'

import { beforeAll, describe, expect, it } from 'vitest'

import { decodeJsonShard } from '../../../scripts/data/search/abi-writer.mjs'
import { buildSearchCorePack, validateSearchCorePack } from '../../../scripts/data/search/build.mjs'
import { assertNoStableMutableSearchUrls } from '../../../scripts/data/search/registry.mjs'

describe('Search pack builder', () => {
  let pack

  beforeAll(async () => {
    pack = await buildSearchCorePack({ profile: 'baseline', write: false })
  }, 30_000)

  it('generates a deterministic immutable registry and pack manifest', async () => {
    const second = await buildSearchCorePack({ profile: 'baseline', write: false })

    expect(pack.contentHash).toBe(second.contentHash)
    expect(pack.registry.registryUrl).toBe('/search-packs/registry.json')
    expect(pack.registry.packs[0].manifestUrl).toBe(`/search-packs/packs/${pack.contentHash}/manifest.json`)
    expect(JSON.stringify(pack.registry)).not.toContain('/dataset/search/')
    expect(pack.manifest.shards.every((shard) => shard.url.startsWith(`/search-packs/packs/${pack.contentHash}/`))).toBe(true)
  }, 30_000)

  it('writes ABI shards that decode through the container header', async () => {
    const referenceShard = pack.files.get(`public/search-packs/packs/${pack.contentHash}/shards/core-references.qas`)
    const decoded = decodeJsonShard(referenceShard)

    expect(decoded.kind).toBe('references')
    expect(decoded.ayahs).toHaveLength(6236)
    expect(decoded.ayahs[0]).toMatchObject({ ref: '1:1', sourceRef: '1:1' })
  })

  it('emits feature dependencies, byte sizes, source ids, and phrase boundary policy', async () => {
    expect(pack.manifest.requires).toEqual([
      'core-references',
      'core-dictionaries',
      'morphology-root-dictionary',
      'morphology-lemma-dictionary',
      'morphology-rows',
      'same-written-form-postings',
      'same-root-postings',
      'lemma-postings',
      'surah-context',
      'morphology-provenance',
    ])
    expect(pack.manifest.sourceIds).toEqual(['search-hafs-text-kfgqpc-v1', 'search-bridges-context-qul-v1', 'search-qac-morphology-0-4'])
    expect(pack.manifest.normalizerVersion).toBe(1)
    expect(pack.manifest.queryAstVersion).toBe(1)
    expect(pack.manifest.shards.every((shard) => shard.byteLength <= pack.manifest.byteBudget.maxShardBytes)).toBe(true)
    expect(pack.manifest.shards.some((shard) => shard.shardId.startsWith('phrase-postings-l8'))).toBe(true)
  })

  it('rejects stable mutable Search URLs and validates generated pack bytes', async () => {
    expect(() => assertNoStableMutableSearchUrls({ url: '/dataset/search/baseline/index.json' })).toThrow('/dataset/search/')
    await expect(validateSearchCorePack()).resolves.toBeUndefined()
  }, 30_000)

  it('keeps the committed registry byte-for-byte aligned with builder output', async () => {
    const registry = await readFile('public/search-packs/registry.json', 'utf8')

    expect(registry).toBe(pack.files.get('public/search-packs/registry.json'))
  })
})
