import { describe, expect, it } from 'vitest'

import { mapSearchRefToReader, mappingAssetToResultMapping } from '../../../src/search/result-mapping'

describe('Search result mapping', () => {
  it('maps same-wording and corresponding ayahs only through explicit aliases', () => {
    expect(mapSearchRefToReader({
      aliases: { '2': [{ hafs: 255, warsh: 255, qaloon: 255 }] },
      readerRiwayah: 'qaloon',
      sourceRef: '2:255',
    })).toMatchObject({
      readerRefs: ['2:255'],
      mappingState: 'same-wording-in-reader',
      canOpenInRead: true,
      canHighlightWordsInRead: false,
      openInReadUrl: '#/s/2/255',
    })

    expect(mapSearchRefToReader({
      aliases: { '7': [{ hafs: 2, warsh: 2, qaloon: 3 }] },
      readerRiwayah: 'qaloon',
      sourceRef: '7:2',
    })).toMatchObject({
      readerRefs: ['7:3'],
      mappingState: 'corresponding-ayah-in-reader',
      canOpenInRead: true,
    })
  })

  it('blocks open in Read for split, missing, and Hafs-source-only mappings', () => {
    expect(mapSearchRefToReader({
      aliases: { '7': [{ hafs: 2, warsh: [2, 3], qaloon: [2, 3] }] },
      readerRiwayah: 'qaloon',
      sourceRef: '7:2',
    })).toMatchObject({
      readerRefs: ['7:2', '7:3'],
      mappingState: 'different-ayah-boundary',
      canOpenInRead: false,
    })

    expect(mapSearchRefToReader({
      aliases: { '7': [{ hafs: 4, warsh: 4, qaloon: null }] },
      readerRiwayah: 'qaloon',
      sourceRef: '7:4',
    })).toMatchObject({
      readerRefs: [],
      mappingState: 'hafs-source-only',
      canOpenInRead: false,
    })

    expect(mapSearchRefToReader({
      aliases: {},
      readerRiwayah: 'qaloon',
      sourceRef: '1:1',
    })).toMatchObject({
      mappingState: 'hafs-source-only',
      canOpenInRead: false,
    })
  })

  it('keeps mapping assets serializable and disables token highlighting in Phase 1', () => {
    expect(mappingAssetToResultMapping({
      mappingId: 'm1',
      sourceCorpusId: 'hafs',
      readerCorpusId: 'qaloon',
      sourceRef: '2:255',
      readerRefs: [{ surah: 2, ayah: 255, verseKey: '2:255' }],
      mappingState: 'same-wording-in-reader',
      aliasRole: 'alias-verified',
      boundaryRole: 'same-ayah',
      canOpenInRead: true,
      canHighlightWordsInRead: true,
      reason: 'fixture',
      sourceChecksum: 'a',
      readerChecksum: 'b',
      mappingVersion: 1,
    })).toMatchObject({
      canOpenInRead: true,
      canHighlightWordsInRead: false,
      openInReadUrl: '#/s/2/255',
    })
  })
})
