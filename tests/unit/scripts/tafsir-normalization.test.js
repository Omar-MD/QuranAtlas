import { describe, it, expect } from 'vitest'

import {
  normalizeQulTafsir,
  buildTafsirSplits,
} from '../../../scripts/data/build-dataset.mjs'

describe('tafsir normalization', () => {
  it('preserves grouped QUL entries as one canonical range entry', () => {
    const source = {
      '73:1': {
        text: '<p>group text</p>',
        ayah_keys: ['73:1', '73:2', '73:3', '73:4'],
      },
      '73:2': '73:1',
      '73:3': '73:1',
      '73:4': '73:1',
    }

    const normalized = normalizeQulTafsir('muyassar', source)

    expect(normalized.entries).toHaveLength(1)
    expect(normalized.entries[0]).toMatchObject({
      id: '73:1',
      startKey: '73:1',
      endKey: '73:4',
      ayahKeys: ['73:1', '73:2', '73:3', '73:4'],
      sourceGranularity: 'range',
      text: '<p>group text</p>',
    })
  })

  it('splits normalized tafsir entries by starting surah', () => {
    const normalized = {
      tafsirId: 'muyassar',
      tafsirVersion: 'qul-resource-38',
      language: 'ar',
      entries: [
        {
          id: '1:1',
          startKey: '1:1',
          endKey: '1:1',
          ayahKeys: ['1:1'],
          sourceGranularity: 'ayah',
          text: '<p>one</p>',
        },
        {
          id: '73:1',
          startKey: '73:1',
          endKey: '73:4',
          ayahKeys: ['73:1', '73:2', '73:3', '73:4'],
          sourceGranularity: 'range',
          text: '<p>range</p>',
        },
      ],
    }

    const splits = buildTafsirSplits(normalized)

    expect(splits['001'].entries).toHaveLength(1)
    expect(splits['073'].entries).toHaveLength(1)
    expect(splits['073'].entries[0].ayahKeys).toEqual(['73:1', '73:2', '73:3', '73:4'])
  })
})
