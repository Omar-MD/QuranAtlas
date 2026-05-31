#!/usr/bin/env node

import { importQacMorphologySource, QAC_SOURCE_ID } from './import.mjs'
import { tokenizeSearchText } from '../normalizer.mjs'

export const MORPHOLOGY_REQUIRED_SHARDS = [
  'morphology-root-dictionary',
  'morphology-lemma-dictionary',
  'morphology-rows',
  'same-written-form-postings',
  'same-root-postings',
  'lemma-postings',
  'surah-context',
  'morphology-provenance',
]

export async function buildSearchMorphologyPayloads({ corePostings }) {
  const imported = await importQacMorphologySource()
  const ayahsByRef = new Map(corePostings.ayahs.map((ayah) => [ayah.ref, ayah]))
  const morphologyRows = []
  const rootPostings = new Map()
  const lemmaPostings = new Map()
  const writtenFormPostings = new Map()
  const rootCountsBySurah = new Map()
  const lemmaCountsBySurah = new Map()
  const formCountsBySurah = new Map()

  for (const word of imported.words) {
    const ayah = ayahsByRef.get(word.ref)
    if (!ayah) throw new Error(`QAC morphology word references missing Search ayah ${word.ref}`)
    const exactTokens = tokenizeSearchText(ayah.arabicText, 'exact-word-form')
    const normalizedTokens = tokenizeSearchText(ayah.arabicText, 'normalized')
    const sourceToken = exactTokens[word.tokenOrdinal] ?? normalizedTokens[word.tokenOrdinal] ?? ''
    const normalizedSourceToken = normalizedTokens[word.tokenOrdinal] ?? sourceToken
    const row = {
      ayahId: ayah.ayahId,
      ref: word.ref,
      surah: word.surah,
      ayah: word.ayah,
      tokenOrdinal: word.tokenOrdinal,
      wordPosition: word.word,
      sourceToken,
      normalizedSourceToken,
      transliteration: word.transliteration,
      root: word.root,
      lemma: word.lemma,
      segments: word.segments.map((segment) => ({
        segment: segment.segment,
        pos: segment.pos,
        transliteration: segment.transliteration,
      })),
    }
    morphologyRows.push(row)
    addPosting(writtenFormPostings, normalizedSourceToken || sourceToken, row)
    addCount(formCountsBySurah, normalizedSourceToken || sourceToken, word.surah)
    if (word.root) {
      addPosting(rootPostings, word.root, row)
      addCount(rootCountsBySurah, word.root, word.surah)
    }
    if (word.lemma) {
      addPosting(lemmaPostings, word.lemma, row)
      addCount(lemmaCountsBySurah, word.lemma, word.surah)
    }
  }

  return {
    sourceDigest: imported.sourceSha256,
    source: imported,
    payloads: [
      ['morphology-root-dictionary.qas', {
        kind: 'morphology-dictionary',
        dictionary: 'roots',
        entries: dictionaryEntries(rootPostings),
      }],
      ['morphology-lemma-dictionary.qas', {
        kind: 'morphology-dictionary',
        dictionary: 'lemmas',
        entries: dictionaryEntries(lemmaPostings),
      }],
      ...chunkRows(morphologyRows, 8_000).map((rows, index) => [`morphology-rows-${index + 1}.qas`, {
        kind: 'morphology-rows',
        rows,
      }]),
      ...chunkPostingRows('same-written-form-postings', writtenFormPostings),
      ...chunkPostingRows('same-root-postings', rootPostings),
      ...chunkPostingRows('lemma-postings', lemmaPostings),
      ['surah-context.qas', {
        kind: 'surah-context',
        roots: contextRows(rootCountsBySurah),
        lemmas: contextRows(lemmaCountsBySurah),
        writtenForms: contextRows(formCountsBySurah),
      }],
      ['morphology-provenance.qas', {
        kind: 'morphology-provenance',
        sourceId: QAC_SOURCE_ID,
        sourceVersion: imported.sourceVersion,
        sourcePath: imported.sourcePath,
        sourceUrl: imported.sourceUrl,
        sourceSha256: imported.sourceSha256,
        acceptedSha256: imported.acceptedSha256,
        licenseIds: imported.licenseIds,
        sourceAvailability: imported.sourceAvailability,
        transformedDataNotes: imported.transformedDataNotes,
        requiredNotice: imported.requiredNotice,
        coverage: imported.coverage,
      }],
    ],
  }
}

function addPosting(map, term, row) {
  if (!term) return
  const postings = map.get(term) ?? []
  postings.push({ ayahId: row.ayahId, position: row.tokenOrdinal })
  map.set(term, postings)
}

function addCount(map, term, surah) {
  const counts = map.get(term) ?? new Map()
  counts.set(surah, (counts.get(surah) ?? 0) + 1)
  map.set(term, counts)
}

function dictionaryEntries(postingsMap) {
  return [...postingsMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, postings], index) => ({ id: index + 1, value, count: postings.length }))
}

function postingRows(postingsMap) {
  return [...postingsMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([term, postings]) => ({ term, postings }))
}

function chunkPostingRows(prefix, postingsMap) {
  const rows = postingRows(postingsMap)
  return chunkRows(rows, 6_000).map((chunk, index) => [`${prefix}-${index + 1}.qas`, {
    kind: 'morphology-postings',
    lane: prefix,
    postings: chunk,
  }])
}

function contextRows(countsMap) {
  return [...countsMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([term, counts]) => ({
      term,
      total: [...counts.values()].reduce((sum, count) => sum + count, 0),
      surahs: [...counts.entries()]
        .sort(([a], [b]) => a - b)
        .map(([surah, count]) => ({ surah, count })),
    }))
}

function chunkRows(rows, chunkSize) {
  const chunks = []
  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize))
  }
  return chunks
}
