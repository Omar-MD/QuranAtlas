export function buildGraphCounts({ ayahs, windows, morphology }) {
  const tokensBySurah = new Map()
  const ayahsBySurah = new Map()
  const phraseCountsByLength = new Map()
  const endingCounts = new Map()

  for (const ayah of ayahs) {
    ayahsBySurah.set(ayah.surah, (ayahsBySurah.get(ayah.surah) ?? 0) + 1)
  }
  for (const window of windows) {
    if (window.length === 1) tokensBySurah.set(window.surah, (tokensBySurah.get(window.surah) ?? 0) + 1)
    if (window.length > 1) phraseCountsByLength.set(window.length, (phraseCountsByLength.get(window.length) ?? 0) + 1)
    if (window.ending && window.length <= 3) addEnding(endingCounts, window.term, window)
  }

  const rootCounts = extractRootCounts(morphology)
  const ayahEndings = [...endingCounts.entries()]
    .sort(([aTerm, a], [bTerm, b]) => b.count - a.count || aTerm.localeCompare(bTerm))
    .map(([term, row]) => ({ term, ...row, refs: row.refs.slice(0, 12) }))

  return {
    tokenCounts: {
      totalTokens: [...tokensBySurah.values()].reduce((sum, count) => sum + count, 0),
      uniqueTokens: new Set(windows.filter((window) => window.length === 1).map((window) => window.term)).size,
    },
    phraseCounts: [...phraseCountsByLength.entries()]
      .sort(([a], [b]) => a - b)
      .map(([length, count]) => ({ length, count })),
    rootCounts,
    surahDistribution: [...ayahsBySurah.entries()]
      .sort(([a], [b]) => a - b)
      .map(([surah, ayahCount]) => ({
        surah,
        ayahCount,
        tokenCount: tokensBySurah.get(surah) ?? 0,
      })),
    ayahEndings,
  }
}

function addEnding(map, term, window) {
  const row = map.get(term) ?? { count: 0, refs: [] }
  row.count += 1
  row.refs.push({ ref: window.ref, position: window.position, length: window.length })
  map.set(term, row)
}

function extractRootCounts(morphology) {
  const rootDictionary = morphology?.payloads?.find(([filename]) => filename === 'morphology-root-dictionary.qas')?.[1]
  if (!rootDictionary?.entries) return []
  return rootDictionary.entries
    .slice()
    .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)))
    .slice(0, 40)
    .map((entry) => ({ root: entry.value, count: entry.count }))
}
