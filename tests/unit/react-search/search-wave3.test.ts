import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

const PROTOTYPE_PATTERNS = [
  '/dataset/search/',
  'SearchShard.entries',
  'entries: SearchEntry[]',
  "metadata'",
  "'metadata'",
]

describe('Search runtime prototype guards', () => {
  it('keeps runtime code off mutable dataset Search URLs and large JSON shard APIs', async () => {
    const files = [
      'src/search/index-client.ts',
      'src/search/schema.ts',
      'src/search/search-engine.ts',
    ]
    const contents = await Promise.all(files.map((file) => readFile(file, 'utf8')))
    const joined = contents.join('\n')
    for (const pattern of PROTOTYPE_PATTERNS) {
      expect(joined).not.toContain(pattern)
    }
  })
})
