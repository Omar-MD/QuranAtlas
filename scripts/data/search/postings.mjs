import { readFile } from 'node:fs/promises'

import { assertCompleteHafsAyahCoverage, canonicalAyahKey, canonicalSurahKey, parseAyahKey } from '../lib/ayah.mjs'
import { SEARCH_PHASE1_MAX_PHRASE_TOKENS, tokenizeSearchText } from './normalizer.mjs'

export async function buildSearchCorePostings({ hafsPath, translationPath }) {
  const hafsRows = JSON.parse(await readFile(hafsPath, 'utf8'))
  const translation = JSON.parse(await readFile(translationPath, 'utf8'))
  const translationByRef = buildTranslationTextByRef(translation)
  const ayahs = []
  const tokenIds = new Map()
  const surfaceIds = new Map()
  const arabicPostings = new Map()
  const exactWordPostings = new Map()
  const translationPostings = new Map()
  const phrasePostings = new Map()
  const seenTextRefs = new Set()

  for (const [rowIndex, row] of hafsRows.entries()) {
    const parsedRef = parseAyahKey({
      surah: row.sora ?? row.sura_no,
      ayah: row.aya_no,
    }, `Hafs Search text row[${rowIndex}]`)
    const { surah, ayah, key: ref } = parsedRef
    if (seenTextRefs.has(ref)) {
      throw new Error(`Hafs Search text duplicate ayah ref ${ref}`)
    }
    seenTextRefs.add(ref)
    const ayahId = ayahs.length + 1
    const arabicSource = String(row.aya_text_emlaey || row.aya_text || '')
    if (!arabicSource.trim()) {
      throw new Error(`Hafs Search text ${ref} missing aya_text/aya_text_emlaey`)
    }
    const arabicTokens = tokenizeSearchText(arabicSource)
    const exactTokens = tokenizeSearchText(String(row.aya_text || arabicSource), 'exact-word-form')
    const translationText = translationByRef.get(ref)
    if (translationText === undefined) {
      throw new Error(`Search translation source missing ayah ref ${ref}`)
    }
    const translationTokens = tokenizeSearchText(translationText)

    ayahs.push({
      ayahId,
      ref,
      surah,
      ayah,
      sourceRef: ref,
      arabicText: arabicSource,
      translationText,
      tokenCount: arabicTokens.length,
    })

    arabicTokens.forEach((token, position) => {
      const normalizedTokenId = intern(tokenIds, token)
      addPosting(arabicPostings, token, { ayahId, position })
      const surfaceToken = exactTokens[position] ?? token
      intern(surfaceIds, surfaceToken)
      addPosting(exactWordPostings, surfaceToken, { ayahId, position })
    })
    const seenTranslationTerms = new Set()
    translationTokens.forEach((token, position) => {
      const term = token.toLowerCase()
      if (seenTranslationTerms.has(term)) return
      seenTranslationTerms.add(term)
      addPosting(translationPostings, term, { ayahId, position })
    })
    for (let length = 2; length <= Math.min(SEARCH_PHASE1_MAX_PHRASE_TOKENS, arabicTokens.length); length += 1) {
      for (let start = 0; start <= arabicTokens.length - length; start += 1) {
        addPosting(phrasePostings, arabicTokens.slice(start, start + length).join(' '), { ayahId, position: start })
      }
    }
  }
  const extraTranslationRefs = [...translationByRef.keys()].filter((ref) => !seenTextRefs.has(ref))
  if (extraTranslationRefs.length > 0) {
    throw new Error(
      `Search translation source contains ${extraTranslationRefs.length} refs not present in Hafs Search text: `
      + extraTranslationRefs.slice(0, 8).join(', '),
    )
  }
  assertCompleteHafsAyahCoverage(seenTextRefs, 'Hafs Search text')
  assertCompleteHafsAyahCoverage(translationByRef.keys(), 'Search translation source')

  return {
    version: 1,
    ayahs,
    dictionaries: {
      normalizedTokens: entriesFromMap(tokenIds),
      surfaceTokens: entriesFromMap(surfaceIds),
    },
    postings: {
      arabic: mapToRows(arabicPostings),
      exactWord: mapToRows(exactWordPostings),
      translation: mapToRows(translationPostings),
      phrase: mapToRows(phrasePostings),
    },
    phrasePolicy: {
      maxPhase1PhraseTokens: SEARCH_PHASE1_MAX_PHRASE_TOKENS,
      canCrossAyahBoundary: false,
      canCrossSurahBoundary: false,
      canCrossBismillahBoundary: false,
    },
  }
}

function buildTranslationTextByRef(translation) {
  if (!translation || typeof translation !== 'object' || Array.isArray(translation)) {
    throw new Error('Search translation source must be an object')
  }
  if (!translation.surahs || typeof translation.surahs !== 'object' || Array.isArray(translation.surahs)) {
    throw new Error('Search translation source missing `surahs` object')
  }

  const seenSurahs = new Map()
  const byRef = new Map()
  for (const [rawSurahKey, surahSource] of Object.entries(translation.surahs)) {
    const surahKey = canonicalSurahKey(rawSurahKey, `Search translation surah key ${rawSurahKey}`)
    const previousRawKey = seenSurahs.get(surahKey)
    if (previousRawKey !== undefined) {
      throw new Error(`Search translation duplicate surah key ${rawSurahKey}; ${previousRawKey} also canonicalizes to ${surahKey}`)
    }
    seenSurahs.set(surahKey, rawSurahKey)

    if (!surahSource || typeof surahSource !== 'object' || Array.isArray(surahSource)) {
      throw new Error(`Search translation surah ${surahKey} must be an object`)
    }
    if (!Array.isArray(surahSource.verses)) {
      throw new Error(`Search translation surah ${surahKey} missing verses array`)
    }
    const expectedSurah = Number(surahKey)
    for (const [index, verse] of surahSource.verses.entries()) {
      if (!verse || typeof verse !== 'object' || Array.isArray(verse)) {
        throw new Error(`Search translation surah ${surahKey} verse[${index}] must be an object`)
      }
      const ref = canonicalAyahKey(verse.key, `Search translation surah ${surahKey} verse[${index}].key`)
      const parsed = parseAyahKey(ref)
      if (parsed.surah !== expectedSurah) {
        throw new Error(`Search translation surah ${surahKey} contains out-of-surah verse key ${ref}`)
      }
      if (byRef.has(ref)) {
        throw new Error(`Search translation duplicate ayah ref ${ref}`)
      }
      if (typeof verse.text !== 'string' || !verse.text.trim()) {
        throw new Error(`Search translation ${ref} missing text`)
      }
      byRef.set(ref, verse.text)
    }
  }
  if (byRef.size === 0) {
    throw new Error('Search translation source contains no verse text')
  }
  return byRef
}

function intern(map, value) {
  if (!map.has(value)) map.set(value, map.size + 1)
  return map.get(value)
}

function addPosting(map, key, posting) {
  const postings = map.get(key) ?? []
  postings.push(posting)
  map.set(key, postings)
}

function entriesFromMap(map) {
  return [...map.entries()].sort((a, b) => a[1] - b[1]).map(([value, id]) => ({ id, value }))
}

function mapToRows(map) {
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([term, postings]) => ({ term, postings }))
}
