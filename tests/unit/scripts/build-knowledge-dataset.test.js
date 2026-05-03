import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  buildKnowledgeArtifacts,
  loadSurahAyahCounts,
} from '../../../scripts/data/build-knowledge-dataset.mjs'

const REPO_ROOT = process.cwd()
const THEMES_PATH = join(REPO_ROOT, 'data', 'taxonomy', 'themes.json')
const PASSAGES_PATH = join(REPO_ROOT, 'data', 'normalized', 'knowledge', 'passages.json')
const AYAH_THEMES_PATH = join(REPO_ROOT, 'data', 'normalized', 'knowledge', 'ayah-themes.json')

function loadSeedData() {
  return {
    themes: JSON.parse(readFileSync(THEMES_PATH, 'utf8')),
    passages: JSON.parse(readFileSync(PASSAGES_PATH, 'utf8')),
    ayahThemes: JSON.parse(readFileSync(AYAH_THEMES_PATH, 'utf8')),
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

let surahAyahCounts = []

beforeAll(async () => {
  surahAyahCounts = await loadSurahAyahCounts()
})

describe('build-knowledge-dataset', () => {
  it('valid seed data builds successfully', () => {
    const seed = loadSeedData()
    const artifacts = buildKnowledgeArtifacts({
      ...seed,
      surahAyahCounts,
    })
    expect(Object.keys(artifacts.ayahBySurah)).toHaveLength(114)
    expect(Object.keys(artifacts.passagesBySurah)).toHaveLength(114)
    expect(artifacts.stats.passageCount).toBeGreaterThanOrEqual(6)
  })

  it('fails when ayah-themes includes an invalid ayah key', () => {
    const seed = loadSeedData()
    const broken = clone(seed)
    broken.ayahThemes[0].ayahKey = '2:500'
    expect(() => buildKnowledgeArtifacts({
      ...broken,
      surahAyahCounts,
    })).toThrow(/ayah key/i)
  })

  it('fails when passages include an unknown theme id', () => {
    const seed = loadSeedData()
    const broken = clone(seed)
    broken.passages[0].themes.push('unknown-theme')
    expect(() => buildKnowledgeArtifacts({
      ...broken,
      surahAyahCounts,
    })).toThrow(/unknown theme id/i)
  })

  it('fails when ayah-themes include an unsupported source value', () => {
    const seed = loadSeedData()
    const broken = clone(seed)
    broken.ayahThemes[0].themes[0].source = 'ai-generated'
    expect(() => buildKnowledgeArtifacts({
      ...broken,
      surahAyahCounts,
    })).toThrow(/source/i)
  })

  it('fails when passages overlap in the same surah', () => {
    const seed = loadSeedData()
    const broken = clone(seed)
    broken.passages.push({
      id: '1:3-5-overlap',
      surah: 1,
      startKey: '1:3',
      endKey: '1:5',
      title: { en: 'Overlap test' },
      summary: { en: 'Intentional overlap for validation.' },
      themes: ['guidance'],
      roleInSurah: 'opening',
      source: {
        kind: 'curated',
        reviewStatus: 'approved',
      },
    })

    expect(() => buildKnowledgeArtifacts({
      ...broken,
      surahAyahCounts,
    })).toThrow(/overlapping passages/i)
  })

  it('generated ayah files contain every ayah for each surah', () => {
    const seed = loadSeedData()
    const artifacts = buildKnowledgeArtifacts({
      ...seed,
      surahAyahCounts,
    })
    const surah2 = artifacts.ayahBySurah['002']
    expect(surah2.ayahs).toHaveLength(surahAyahCounts[1])
    expect(surah2.ayahs[0].key).toBe('2:1')
    expect(surah2.ayahs[surah2.ayahs.length - 1].key).toBe(`2:${surahAyahCounts[1]}`)
  })

  it('generated indexes are deterministic regardless of input ordering', () => {
    const seed = loadSeedData()
    const a = buildKnowledgeArtifacts({
      ...seed,
      surahAyahCounts,
    })
    const b = buildKnowledgeArtifacts({
      themes: [...seed.themes].reverse(),
      passages: [...seed.passages].reverse(),
      ayahThemes: [...seed.ayahThemes].reverse(),
      surahAyahCounts,
    })

    expect(a.indexes).toEqual(b.indexes)
    expect(JSON.stringify(a.indexes)).toBe(JSON.stringify(b.indexes))
  })
})
