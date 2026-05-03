const HAFS_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98,
  135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75,
  85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29,
  19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9,
  5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
]

const UA = 'QuranAtlas-fetch/1.0 (https://quranatlas.org)'

export function normalizeQulTafsirEntries(source, options) {
  if (!Array.isArray(source)) {
    throw new Error('QUL tafsir normalization requires an array of tafsir rows')
  }
  const byId = new Map()
  for (const tafsir of source) {
    const verses = Array.isArray(tafsir.verses) ? tafsir.verses : []
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
    const [as, aa] = a.startKey.split(':').map(Number)
    const [bs, ba] = b.startKey.split(':').map(Number)
    return as - bs || aa - ba
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

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

export async function fetchQulTafsirSource(fetchConfig) {
  const apiBase = `https://qul.tarteel.ai/api/v1/tafsirs/${fetchConfig.contentResourceId}/by_range.json`
  const rows = []
  for (let surahNo = 1; surahNo <= 114; surahNo++) {
    const params = new URLSearchParams({
      from: `${surahNo}:1`,
      to: `${surahNo}:${HAFS_COUNTS[surahNo - 1]}`,
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
