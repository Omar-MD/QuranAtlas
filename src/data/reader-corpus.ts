import { assertRuntimeDatasetUrl } from './runtime-boundary'
import { loadVerseAliases, resolveTranslationFor } from './verse-aliases'
import type { Riwayah } from '../storage/types'

export type TranslationRole = 'identity' | 'merged' | 'primary' | 'continuation' | 'none'

export type ReaderVerse = {
  key: string
  surah: number
  verse: number
  arabic: string
  translation?: string
  translationRole: TranslationRole
  translationSourceKey?: string | null
  footnotes: Record<string, string>
}

export type ReaderSurahMeta = {
  number: number
  nameArabic: string
  nameEnglish: string
  verseCount: number
}

export type ReaderCorpusState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; footnotes: Record<string, string>; riwayah: Riwayah; surah: ReaderSurahMeta; translationVisible: boolean; verses: ReaderVerse[] }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; error: Error }
  | { status: 'aborted' }

type QuranTextPayload = {
  riwayah: Riwayah
  version: string
  sura_no: number
  sura_name_ar: string
  sura_name_en: string
  ayat: Array<{ aya_no: number; aya_text: string }>
}

type TranslationPayload = {
  translationId: string
  translationVersion: string
  surahNo: number
  intro: string[]
  verses: Array<{ key: string; text: string }>
  footnotes: Record<string, string>
}

type ReaderCorpusOptions = {
  fetcher?: typeof fetch
  quranTextStyleId?: string
  riwayah?: Riwayah
  signal?: AbortSignal
  translationId?: string
  translationVisible?: boolean
}

const DEFAULT_RIWAYAH: Riwayah = 'qaloon'
const DEFAULT_QURAN_TEXT_STYLE_ID = 'uthmani-kfgqpc-v1'
const DEFAULT_TRANSLATION_ID = 'bridges'

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

async function fetchJson<T>(fetcher: typeof fetch, url: string, signal?: AbortSignal): Promise<T> {
  assertRuntimeDatasetUrl(url)
  const response = await fetcher(url, { signal })
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  return response.json() as Promise<T>
}

function assertQuranTextPayload(payload: QuranTextPayload, surah: number): void {
  if (payload.sura_no !== surah || !Array.isArray(payload.ayat) || payload.ayat.length === 0) {
    throw new Error(`Invalid reader Quran text payload for Surah ${surah}`)
  }
  for (const ayah of payload.ayat) {
    if (!Number.isInteger(ayah.aya_no) || typeof ayah.aya_text !== 'string' || ayah.aya_text.length === 0) {
      throw new Error(`Invalid reader ayah payload for Surah ${surah}`)
    }
  }
}

async function loadTranslation(
  surah: number,
  translationId: string,
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<TranslationPayload | null> {
  try {
    const padded = String(surah).padStart(3, '0')
    const payload = await fetchJson<TranslationPayload>(fetcher, `/dataset/translations/${translationId}/${padded}.json`, signal)
    if (payload.surahNo !== surah || !Array.isArray(payload.verses)) return null
    return payload
  } catch (error) {
    if (isAbortError(error)) throw error
    if (translationId !== DEFAULT_TRANSLATION_ID) {
      return loadTranslation(surah, DEFAULT_TRANSLATION_ID, fetcher, signal)
    }
    return null
  }
}

export async function loadReaderSurah(
  surah: number,
  options: ReaderCorpusOptions = {},
): Promise<ReaderCorpusState> {
  const fetcher = options.fetcher ?? fetch
  const riwayah = options.riwayah ?? DEFAULT_RIWAYAH
  const quranTextStyleId = options.quranTextStyleId ?? DEFAULT_QURAN_TEXT_STYLE_ID
  const translationId = options.translationId ?? DEFAULT_TRANSLATION_ID
  const translationVisible = options.translationVisible ?? true
  const padded = String(surah).padStart(3, '0')
  try {
    const url = `/dataset/quran-text/${riwayah}/${quranTextStyleId}/${padded}.json`
    const [payload, translation, aliases] = await Promise.all([
      fetchJson<QuranTextPayload>(fetcher, url, options.signal),
      loadTranslation(surah, translationId, fetcher, options.signal),
      loadVerseAliases(fetcher, options.signal),
    ])
    assertQuranTextPayload(payload, surah)
    const translationMap = Object.fromEntries((translation?.verses ?? []).map((verse) => [verse.key, verse.text]))
    const verses = payload.ayat.map((ayah) => {
      const verseNo = ayah.aya_no
      const key = `${surah}:${verseNo}`
      const resolution = resolveTranslationFor({
        aliases: aliases.aliases,
        riwayah,
        surah,
        translations: translationMap,
        verse: verseNo,
      })
      return {
        key,
        surah,
        verse: verseNo,
        arabic: ayah.aya_text,
        footnotes: translation?.footnotes ?? {},
        translation: resolution.text ?? undefined,
        translationRole: resolution.role,
        translationSourceKey: resolution.sourceKey,
      }
    })
    return {
      status: 'ready',
      footnotes: translation?.footnotes ?? {},
      riwayah,
      surah: {
        number: surah,
        nameArabic: payload.sura_name_ar,
        nameEnglish: payload.sura_name_en,
        verseCount: payload.ayat.length,
      },
      translationVisible,
      verses,
    }
  } catch (error) {
    if (isAbortError(error)) return { status: 'aborted' }
    if (error instanceof Error && /Failed to fetch .*: 404|Invalid reader Quran text payload/.test(error.message)) {
      return { status: 'unavailable', reason: error.message }
    }
    return { status: 'error', error: error instanceof Error ? error : new Error('Reader corpus unavailable') }
  }
}
