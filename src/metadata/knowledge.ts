import type { SurahMetadataResult, VerseMetadata } from './metadata-state'
import { fetchJson } from '../data/fetch'

type AyahKnowledgeRow = {
  key: string
  passageId?: string | null
  themes?: Array<string | { id: string; label?: string }>
}

type PassageRow = {
  id: string
  summary?: string | { en?: string }
  title?: string | { en?: string }
}

type AyahKnowledgePayload = AyahKnowledgeRow[] | { ayahs?: AyahKnowledgeRow[] }
type PassagePayload = PassageRow[] | { passages?: PassageRow[] }

function normalizeTheme(theme: string | { id: string; label?: string }) {
  if (typeof theme === 'string') return { id: theme, label: theme }
  return { id: theme.id, label: theme.label ?? theme.id }
}

function localizedText(value: string | { en?: string } | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : (value.en ?? null)
}

function normalizeAyahRows(payload: AyahKnowledgePayload | null): AyahKnowledgeRow[] | null {
  if (!payload) return null
  return Array.isArray(payload) ? payload : (payload.ayahs ?? [])
}

function normalizePassageRows(payload: PassagePayload | null): PassageRow[] {
  if (!payload) return []
  return Array.isArray(payload) ? payload : (payload.passages ?? [])
}

export async function loadKnowledgeForSurah(
  surah: number,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<SurahMetadataResult> {
  const padded = String(surah).padStart(3, '0')
  try {
    const ayahRows = normalizeAyahRows(
      await fetchJson<AyahKnowledgePayload | null>(fetcher, `/dataset/knowledge/ayah/${padded}.json`, {
        signal,
        nullOnNotFound: true,
        httpError: (_url, status) => new Error(`metadata ${status}`),
      }),
    )
    if (!ayahRows) return { state: 'missing', rows: new Map() }
    const passageRows = normalizePassageRows(
      await fetchJson<PassagePayload | null>(fetcher, `/dataset/knowledge/passages/${padded}.json`, {
        signal,
        nullOnNotFound: true,
        httpError: (_url, status) => new Error(`metadata ${status}`),
      }),
    )
    const passages = new Map(passageRows.map((row) => [row.id, localizedText(row.summary) ?? localizedText(row.title)]))
    const rows = new Map<string, VerseMetadata>()
    for (const row of ayahRows) {
      rows.set(row.key, {
        verseKey: row.key,
        themes: (row.themes ?? []).map(normalizeTheme),
        passageSummary: row.passageId ? (passages.get(row.passageId) ?? null) : null,
      })
    }
    return { state: rows.size > 0 ? 'available' : 'empty', rows }
  } catch {
    return { state: 'unavailable', rows: new Map() }
  }
}
