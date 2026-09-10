import { HAFS_AYAH_COUNTS, canonicalAyahKey, compareAyahKeys } from '../../lib/ayah.mjs'
import { fetchJson } from '../../lib/fetch.mjs'

export function normalizeQulTafsirEntries(source, options) {
  if (!Array.isArray(source)) {
    throw new Error('QUL tafsir normalization requires an array of tafsir rows')
  }
  const byId = new Map()
  for (const tafsir of source) {
    const verses = Array.isArray(tafsir.verses)
      ? tafsir.verses.map((verseKey) => canonicalAyahKey(verseKey, 'QUL tafsir row verses'))
      : []
    if (verses.length === 0) continue
    byId.set(verses[0], {
      id: verses[0],
      startKey: verses[0],
      endKey: verses[verses.length - 1],
      ayahKeys: verses,
      sourceGranularity: verses.length > 1 ? 'range' : 'ayah',
      text: String(tafsir.text ?? ''),
    })
  }
  const entries = [...byId.values()].sort((a, b) => {
    return compareAyahKeys(a.startKey, b.startKey)
  })
  return {
    tafsirId: options.id,
    tafsirVersion: options.tafsirVersion,
    language: options.language ?? 'ar',
    source: {
      provider: 'Quranic Universal Library',
      resourceUrl: options.resourceUrl,
      resourceId: options.resourceId,
      contentResourceId: options.contentResourceId,
    },
    entries,
  }
}

export async function fetchQulTafsirSource(fetchConfig) {
  const apiBase = `https://qul.tarteel.ai/api/v1/tafsirs/${fetchConfig.contentResourceId}/by_range.json`
  const rows = []
  for (let surahNo = 1; surahNo <= 114; surahNo++) {
    const params = new URLSearchParams({
      from: `${surahNo}:1`,
      to: `${surahNo}:${HAFS_AYAH_COUNTS[surahNo - 1]}`,
      per_page: '200',
    })
    const json = await fetchJson(`${apiBase}?${params}`)
    if (!Array.isArray(json.tafsirs)) {
      throw new Error(`QUL tafsir response missing tafsirs array for surah ${surahNo}`)
    }
    rows.push(...json.tafsirs)
  }
  return rows
}
