import { readFile } from 'node:fs/promises'

import { SEARCH_PHASE1_MAX_PHRASE_TOKENS, tokenizeSearchText } from './normalizer.mjs'

export async function buildSearchCorePostings({ hafsPath, translationPath }) {
  const hafsRows = JSON.parse(await readFile(hafsPath, 'utf8'))
  const translation = JSON.parse(await readFile(translationPath, 'utf8'))
  const ayahs = []
  const tokenIds = new Map()
  const surfaceIds = new Map()
  const arabicPostings = new Map()
  const exactWordPostings = new Map()
  const translationPostings = new Map()
  const phrasePostings = new Map()

  for (const row of hafsRows) {
    const surah = Number(row.sora)
    const ayah = Number(row.aya_no)
    const ayahId = ayahs.length + 1
    const ref = `${surah}:${ayah}`
    const arabicSource = String(row.aya_text_emlaey || row.aya_text || '')
    const arabicTokens = tokenizeSearchText(arabicSource)
    const exactTokens = tokenizeSearchText(String(row.aya_text || arabicSource), 'exact-word-form')
    const translationText = translation.surahs?.[String(surah)]?.verses?.find((verse) => verse.key === ref)?.text ?? ''
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
    translationTokens.forEach((token, position) => {
      addPosting(translationPostings, token.toLowerCase(), { ayahId, position })
    })
    for (let length = 2; length <= Math.min(SEARCH_PHASE1_MAX_PHRASE_TOKENS, arabicTokens.length); length += 1) {
      for (let start = 0; start <= arabicTokens.length - length; start += 1) {
        addPosting(phrasePostings, arabicTokens.slice(start, start + length).join(' '), { ayahId, position: start })
      }
    }
  }

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
