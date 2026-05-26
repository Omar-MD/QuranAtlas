import type { SurahMetadataResult, VerseMetadata } from './metadata-state'

type AyahKnowledgeRow = {
  key: string
  passageId?: string | null
  themes?: Array<string | { id: string; label?: string }>
}

type PassageRow = {
  id: string
  summary?: string
  title?: string
}

async function fetchJson<T>(url: string, fetcher: typeof fetch): Promise<T | null> {
  const response = await fetcher(url)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`metadata ${response.status}`)
  return response.json() as Promise<T>
}

function normalizeTheme(theme: string | { id: string; label?: string }) {
  if (typeof theme === 'string') return { id: theme, label: theme }
  return { id: theme.id, label: theme.label ?? theme.id }
}

export async function loadKnowledgeForSurah(surah: number, fetcher: typeof fetch = fetch): Promise<SurahMetadataResult> {
  const padded = String(surah).padStart(3, '0')
  try {
    const ayahRows = await fetchJson<AyahKnowledgeRow[]>(`/dataset/knowledge/ayah/${padded}.json`, fetcher)
    if (!ayahRows) return { state: 'missing', rows: new Map() }
    const passageRows = await fetchJson<PassageRow[]>(`/dataset/knowledge/passages/${padded}.json`, fetcher)
    const passages = new Map((passageRows ?? []).map((row) => [row.id, row.summary ?? row.title ?? null]))
    const rows = new Map<string, VerseMetadata>()
    for (const row of ayahRows) {
      rows.set(row.key, {
        verseKey: row.key,
        themes: (row.themes ?? []).map(normalizeTheme),
        passageSummary: row.passageId ? passages.get(row.passageId) ?? null : null,
      })
    }
    return { state: rows.size > 0 ? 'available' : 'empty', rows }
  } catch {
    return { state: 'unavailable', rows: new Map() }
  }
}
