import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DATASET_PATH = join(process.cwd(), 'public', 'dataset')
const KNOWLEDGE_BASE = '/dataset/knowledge'

function mockDatasetFetch(url) {
  const filePath = join(DATASET_PATH, String(url).replace('/dataset/', ''))
  try {
    const content = readFileSync(filePath, 'utf8')
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(JSON.parse(content)),
    })
  } catch {
    return Promise.resolve({ ok: false, status: 404 })
  }
}

function mockMissingKnowledgeFetch(url) {
  const asString = String(url)
  if (asString.startsWith(KNOWLEDGE_BASE)) {
    return Promise.resolve({ ok: false, status: 404 })
  }
  return mockDatasetFetch(url)
}

async function loadKnowledgeModule() {
  return import('../../../src/data/knowledge-dataset.ts')
}

beforeEach(async () => {
  globalThis.fetch = mockDatasetFetch
  const module = await loadKnowledgeModule()
  module.clearKnowledgeDatasetCache()
})

afterEach(async () => {
  const module = await loadKnowledgeModule()
  module.clearKnowledgeDatasetCache()
})

describe('data/knowledge-dataset', () => {
  it('loads per-surah ayah and passage files', async () => {
    const module = await loadKnowledgeModule()
    const ayahPack = await module.loadAyahKnowledgeForSurah(2)
    const passagePack = await module.loadPassagesForSurah(2)

    expect(ayahPack).not.toBeNull()
    expect(ayahPack.surah).toBe(2)
    expect(ayahPack.ayahs.length).toBeGreaterThan(200)

    expect(passagePack).not.toBeNull()
    expect(passagePack.surah).toBe(2)
    expect(passagePack.passages.some((passage) => passage.id === '2:1-5')).toBe(true)
  })

  it('resolves ayah themes and passage info for tagged ayat', async () => {
    const module = await loadKnowledgeModule()
    const ayah = await module.getAyahKnowledge('2:2')
    const themes = await module.getThemesForAyah('2:2')
    const passage = await module.getPassageForAyah('2:2')

    expect(ayah).toMatchObject({
      key: '2:2',
      passageId: '2:1-5',
    })
    expect(themes.length).toBeGreaterThan(0)
    expect(themes[0].weight).toBeGreaterThanOrEqual(themes[themes.length - 1].weight)
    expect(passage).toMatchObject({
      id: '2:1-5',
      startKey: '2:1',
      endKey: '2:5',
    })
  })

  it('returns null/empty fallbacks when knowledge files are missing', async () => {
    globalThis.fetch = mockMissingKnowledgeFetch
    const module = await loadKnowledgeModule()
    module.clearKnowledgeDatasetCache()

    await expect(module.loadAyahKnowledgeForSurah(1)).resolves.toBeNull()
    await expect(module.loadPassagesForSurah(1)).resolves.toBeNull()
    await expect(module.getAyahKnowledge('1:1')).resolves.toBeNull()
    await expect(module.getThemesForAyah('1:1')).resolves.toEqual([])
    await expect(module.getPassageForAyah('1:1')).resolves.toBeNull()
  })
})
