import { describe, expect, it } from 'vitest'

import { assertDatasetUrl, validateAssetIndexEntry } from '../../../src-react/offline/asset-index'
import { assertRuntimeDatasetUrl } from '../../../src-react/data/runtime-boundary'

describe('React asset index URL boundaries', () => {
  it('accepts same-origin dataset URLs only', () => {
    expect(() => assertDatasetUrl('/dataset/translations/bridges/001.json')).not.toThrow()
    expect(() => assertRuntimeDatasetUrl('/dataset/riwayat/qaloon/001.json')).not.toThrow()
    expect(() => assertDatasetUrl('https://example.com/001.json')).toThrow(/same-origin/)
    expect(() => assertRuntimeDatasetUrl('/icons/icon.svg')).toThrow(/dataset/)
  })

  it('validates generic asset index entries', () => {
    expect(validateAssetIndexEntry({
      packId: 'translation:bridges',
      kind: 'translation',
      version: 'v1',
      totalBytes: 20,
      urls: ['/dataset/translations/bridges/001.json'],
    })).toMatchObject({ packId: 'translation:bridges' })
  })
})
