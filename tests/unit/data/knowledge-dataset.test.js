import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

function mockInvalidAyahKnowledgeFetch(url) {
  const asString = String(url)
  if (asString === `${KNOWLEDGE_BASE}/ayah/002.json`) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ surah: 2, version: 'test', ayahs: {} }),
    })
  }
  return mockDatasetFetch(url)
}

function mockMissingPassageShardFetch(url) {
  const asString = String(url)
  if (asString === `${KNOWLEDGE_BASE}/passages/002.json`) {
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

  it('reuses cached payloads across repeated surah loads', async () => {
    const fetchSpy = vi.fn(mockDatasetFetch)
    globalThis.fetch = fetchSpy
    const module = await loadKnowledgeModule()

    const firstAyahPayload = await module.loadAyahKnowledgeForSurah(2)
    const secondAyahPayload = await module.loadAyahKnowledgeForSurah(2)
    const firstPassagePayload = await module.loadPassagesForSurah(2)
    const secondPassagePayload = await module.loadPassagesForSurah(2)

    expect(firstAyahPayload).toBe(secondAyahPayload)
    expect(firstPassagePayload).toBe(secondPassagePayload)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy).toHaveBeenNthCalledWith(1, '/dataset/knowledge/ayah/002.json', expect.any(Object))
    expect(fetchSpy).toHaveBeenNthCalledWith(2, '/dataset/knowledge/passages/002.json', expect.any(Object))
  })

  it('refetches knowledge payloads after clearing the cache', async () => {
    const fetchSpy = vi.fn(mockDatasetFetch)
    globalThis.fetch = fetchSpy
    const module = await loadKnowledgeModule()

    const firstAyahPayload = await module.loadAyahKnowledgeForSurah(2)
    const firstPassagePayload = await module.loadPassagesForSurah(2)

    module.clearKnowledgeDatasetCache()

    const secondAyahPayload = await module.loadAyahKnowledgeForSurah(2)
    const secondPassagePayload = await module.loadPassagesForSurah(2)

    expect(fetchSpy).toHaveBeenCalledTimes(4)
    expect(secondAyahPayload).toEqual(firstAyahPayload)
    expect(secondPassagePayload).toEqual(firstPassagePayload)
  })

  it('returns null for invalid payload shapes', async () => {
    globalThis.fetch = mockInvalidAyahKnowledgeFetch
    const module = await loadKnowledgeModule()
    module.clearKnowledgeDatasetCache()

    await expect(module.loadAyahKnowledgeForSurah(2)).resolves.toBeNull()
    await expect(module.getAyahKnowledge('2:2')).resolves.toBeNull()
    await expect(module.getThemesForAyah('2:2')).resolves.toEqual([])
  })

  it('returns null when ayah knowledge exists but the passage shard is absent', async () => {
    globalThis.fetch = mockMissingPassageShardFetch
    const module = await loadKnowledgeModule()
    module.clearKnowledgeDatasetCache()

    const ayah = await module.getAyahKnowledge('2:2')

    expect(ayah).toMatchObject({
      key: '2:2',
      passageId: '2:1-5',
    })
    await expect(module.getPassageForAyah('2:2')).resolves.toBeNull()
  })
})
