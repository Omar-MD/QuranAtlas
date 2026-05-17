import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadAyahKnowledgeForSurah = vi.fn()
const loadPassagesForSurah = vi.fn()

vi.mock('../../../src/data/knowledge-dataset', () => ({
  loadAyahKnowledgeForSurah,
  loadPassagesForSurah,
}))

describe('metadata/knowledge adapter', () => {
  beforeEach(() => {
    loadAyahKnowledgeForSurah.mockReset()
    loadPassagesForSurah.mockReset()
  })

  it('loads both reader knowledge sidecars and normalizes them into lookup maps', async () => {
    loadAyahKnowledgeForSurah.mockResolvedValue({
      surah: 2,
      version: 'test',
      ayahs: [
        { key: '2:255', passageId: 'p-1', themes: [{ id: 'divine-power', weight: 1, certainty: 'high' }] },
      ],
    })
    loadPassagesForSurah.mockResolvedValue({
      surah: 2,
      version: 'test',
      passages: [
        {
          id: 'p-1',
          startKey: '2:255',
          endKey: '2:257',
          title: { en: 'Ayat al-Kursi' },
          summary: { en: 'A passage summary.' },
          themes: ['divine-power'],
          roleInSurah: 'highlight',
        },
      ],
    })

    const { loadKnowledgeMetadataForSurah } = await import('../../../src/metadata/knowledge')
    const metadata = await loadKnowledgeMetadataForSurah(2)

    expect(loadAyahKnowledgeForSurah).toHaveBeenCalledWith(2)
    expect(loadPassagesForSurah).toHaveBeenCalledWith(2)
    expect(metadata.state).toBe('available')
    expect(metadata.ayahsByKey['2:255']?.themes[0]?.id).toBe('divine-power')
    expect(metadata.passagesById['p-1']?.summary.en).toBe('A passage summary.')
  })

  it('returns empty maps when sidecars are missing or invalid', async () => {
    loadAyahKnowledgeForSurah.mockResolvedValue(null)
    loadPassagesForSurah.mockResolvedValue(null)

    const { loadKnowledgeMetadataForSurah } = await import('../../../src/metadata/knowledge')
    await expect(loadKnowledgeMetadataForSurah(9)).resolves.toEqual({
      state: 'unavailable',
      ayahsByKey: {},
      passagesById: {},
    })
  })

  it('marks partial sidecars as stale while keeping any usable shard data', async () => {
    loadAyahKnowledgeForSurah.mockResolvedValue({
      surah: 9,
      version: 'test',
      ayahs: [{ key: '9:1', passageId: null, themes: [] }],
    })
    loadPassagesForSurah.mockResolvedValue(null)

    const { loadKnowledgeMetadataForSurah } = await import('../../../src/metadata/knowledge')
    await expect(loadKnowledgeMetadataForSurah(9)).resolves.toEqual({
      state: 'stale',
      ayahsByKey: {
        '9:1': { key: '9:1', passageId: null, themes: [] },
      },
      passagesById: {},
    })
  })

  it('marks thrown partial failures as stale while preserving the successful shard', async () => {
    loadAyahKnowledgeForSurah.mockResolvedValue({
      surah: 9,
      version: 'test',
      ayahs: [{ key: '9:1', passageId: null, themes: [] }],
    })
    loadPassagesForSurah.mockRejectedValue(new Error('offline'))

    const { loadKnowledgeMetadataForSurah } = await import('../../../src/metadata/knowledge')
    await expect(loadKnowledgeMetadataForSurah(9)).resolves.toEqual({
      state: 'stale',
      ayahsByKey: {
        '9:1': { key: '9:1', passageId: null, themes: [] },
      },
      passagesById: {},
    })
  })
})
