import { describe, expect, it } from 'vitest'

import { mapSearchResultToActiveRiwayah, searchShard } from '../../../src/search/search-engine'
import type { SearchShard } from '../../../src/search/schema'

const shard: SearchShard = {
  id: 'baseline',
  generatedAt: '2026-05-25T00:00:00.000Z',
  entries: [
    {
      id: 'translation:7:2',
      lane: 'translation',
      sourceRiwayah: 'hafs',
      sourceRef: { surah: 7, verse: 2 },
      text: 'guidance sent down',
    },
  ],
}

describe('React search coverage', () => {
  it('searches verified shard entries by reason', () => {
    expect(searchShard(shard, 'guidance')[0]).toMatchObject({
      lane: 'translation',
      sourceRef: { surah: 7, verse: 2 },
      matchReason: 'text',
    })
  })

  it('maps Hafs-keyed translation results through aliases for Qalun display', () => {
    const result = mapSearchResultToActiveRiwayah(
      { lane: 'translation', sourceRiwayah: 'hafs', sourceRef: { surah: 7, verse: 2 } },
      { aliases: { '7': [{ hafs: 2, warsh: [2, 3], qaloon: [2, 3] }] } },
      'qaloon',
    )
    expect(result).toEqual({ displayRef: { surah: 7, verse: 2 }, aliasRole: 'primary' })
  })
})
