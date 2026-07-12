import { describe, expect, it } from 'vitest'

import { detectAffected } from '../../../scripts/ci/affected.mjs'

describe('affected-change gates', () => {
  it('treats every Search dataset lane as dataset and full-dataset relevant without forcing Mushaf page rebuilds', () => {
    for (const file of [
      'scripts/data/search/graph/build.mjs',
      'scripts/data/search/build.mjs',
      'shared/search/manifest.ts',
      'public/search-packs/registry.json',
      'public/search-packs/packs/abc123abc123/shards/following-wording-1.qas',
      'data/catalog/search-sources.json',
      'data/normalized/search/qac/quranic-corpus-morphology-0.4.txt',
    ]) {
      expect(detectAffected([file])).toMatchObject({
        dataset_relevant: true,
        full_dataset_relevant: true,
        mushaf_pages_relevant: false,
      })
    }
  })

  it('keeps Mushaf page triggers scoped to Mushaf page data', () => {
    expect(detectAffected(['data/normalized/mushaf-pages/qaloon/pages/001.svg'])).toMatchObject({
      dataset_relevant: true,
      full_dataset_relevant: true,
      mushaf_pages_relevant: true,
    })
  })

  it('selects Mushaf page data lanes for private edition contracts and importers', () => {
    for (const file of [
      'data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/media.json',
      'scripts/data/mushaf-pages/private-pdf.mjs',
    ]) {
      expect(detectAffected([file])).toMatchObject({
        dataset_relevant: true,
        mushaf_pages_relevant: true,
      })
    }
  })
})
