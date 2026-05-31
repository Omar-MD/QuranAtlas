import { mkdtemp, cp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  importQacMorphologySource,
  parseQacMorphology,
  validateParsedMorphology,
} from '../../../scripts/data/search/morphology/import.mjs'
import { buildSearchCorePostings } from '../../../scripts/data/search/postings.mjs'
import { buildSearchMorphologyPayloads, MORPHOLOGY_REQUIRED_SHARDS } from '../../../scripts/data/search/morphology/build.mjs'
import { decodeJsonShard, sha256Hex, writeJsonShard } from '../../../scripts/data/search/abi-writer.mjs'

const HAFS_SOURCE_PATH = 'data/normalized/quran/riwayat/hafs.json'
const BRIDGES_SOURCE_PATH = 'data/normalized/translations/bridges.json'
const QAC_SOURCE_PATH = 'data/normalized/search/qac/quranic-corpus-morphology-0.4.txt'

describe('Search morphology source import', () => {
  it('accepts the committed QAC source checksum, coverage, license metadata, and transform notes', async () => {
    const imported = await importQacMorphologySource()

    expect(imported.sourceSha256).toBe('a1d12923815341face765083805d2148ed2d9f5cc3f7d6665219d887675d8c46')
    expect(imported.coverage).toEqual({ surahs: 114, ayahs: 6236, tokens: 77429, rows: 128219 })
    expect(imported.licenseIds).toContain('search-qac-gpl-v3-terms')
    expect(imported.sourceAvailability).toMatch(/committed verbatim/i)
    expect(imported.transformedDataNotes).toMatch(/QAC source id/i)
    expect(imported.normalizerVersion).toBe(1)
  }, 20000)

  it('rejects unknown source checksums', async () => {
    const temp = await mkdtemp(join(tmpdir(), 'qa-search-catalog-'))
    await cp('data/catalog', temp, { recursive: true })
    const sourcesPath = join(temp, 'search-verification.json')
    const verification = JSON.parse(await readFile(sourcesPath, 'utf8'))
    verification.morphology.acceptedSha256 = ['0'.repeat(64)]
    await writeFile(sourcesPath, `${JSON.stringify(verification)}\n`)

    await expect(importQacMorphologySource({ catalogDir: temp })).rejects.toThrow(/checksum mismatch/)
  })

  it('rejects coverage drift, duplicate token positions, invalid roots, and missing license metadata', async () => {
    const text = await readFile(QAC_SOURCE_PATH, 'utf8')
    const parsed = parseQacMorphology(text)
    const metadata = {
      expectedCoverage: { surahs: 114, ayahs: 6236, tokens: 1, rows: 128219 },
      licenseId: 'search-qac-gpl-v3-terms',
      requiredNotice: 'notice',
      sourceAvailability: 'available',
    }

    expect(() => validateParsedMorphology(parsed, metadata)).toThrow(/tokens coverage expected 1/)
    expect(() => parseQacMorphology(`${text}\n(1:1:1:1)\tbi\tP\tPREFIX|bi+`)).toThrow(/duplicate/)
    expect(() => validateParsedMorphology({
      ...parsed,
      rows: [{ ...parsed.rows[0], root: 'bad root' }],
    }, { ...metadata, expectedCoverage: parsed.coverage })).toThrow(/invalid root/)
    expect(() => validateParsedMorphology(parsed, { ...metadata, requiredNotice: '' })).toThrow(/license metadata/)
  }, 20000)
})

describe('Search morphology shard builder', () => {
  it('emits reproducible root and lemma shards with dependency ids, source ids, checksums, and byte budgets', async () => {
    const corePostings = await buildSearchCorePostings({
      hafsPath: HAFS_SOURCE_PATH,
      translationPath: BRIDGES_SOURCE_PATH,
    })
    const morphology = await buildSearchMorphologyPayloads({ corePostings })
    const names = morphology.payloads.map(([filename]) => filename.replace(/-\d+\.qas$|\.qas$/g, ''))

    for (const required of MORPHOLOGY_REQUIRED_SHARDS) {
      expect(names.some((name) => name === required || name.startsWith(`${required}-`))).toBe(true)
    }
    const rootDictionary = morphology.payloads.find(([filename]) => filename === 'morphology-root-dictionary.qas')?.[1]
    const lemmaDictionary = morphology.payloads.find(([filename]) => filename === 'morphology-lemma-dictionary.qas')?.[1]
    expect(rootDictionary.entries).toHaveLength(1642)
    expect(lemmaDictionary.entries).toHaveLength(4832)
    expect(morphology.source.sourceId).toBe('search-qac-morphology-0-4')
    expect(morphology.source.licenseIds).toContain('search-qac-gpl-v3-terms')

    for (const [filename, payload] of morphology.payloads) {
      const bytes = writeJsonShard({ payload })
      expect(bytes.byteLength, filename).toBeLessThanOrEqual(4 * 1024 * 1024)
      expect(sha256Hex(bytes)).toMatch(/^[a-f0-9]{64}$/)
      expect(decodeJsonShard(bytes).kind).toBe(payload.kind)
    }
  }, 30000)
})
