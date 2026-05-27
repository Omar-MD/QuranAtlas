import { REACT_ROUTES } from '../../app/router/routes'
import {
  firstVerseForMushafPage,
  loadMushafManifest,
  pageForVerseInMushafManifest,
  type QuranRef,
} from '../../packs/mushaf-page-asset'
import { openReactDb } from '../../storage/db'
import type { Riwayah } from '../../storage/types'

const DEFAULT_RIWAYAH: Riwayah = 'qaloon'
const DEFAULT_MUSHAF_EDITION_ID = 'qalun-quran-ws-v1'

type ActiveMushafSettings = { riwayah: Riwayah; mushafEditionId: string }

export async function resolveMushafHrefForVerseRef(ref: QuranRef): Promise<string> {
  try {
    const settings = await loadActiveMushafSettings()
    const manifest = await loadMushafManifest(settings)
    const page = pageForVerseInMushafManifest(manifest, ref)
    return REACT_ROUTES.mushaf(page ?? 1)
  } catch {
    return REACT_ROUTES.mushaf(1)
  }
}

export async function resolveMushafHrefForVerseRoute(routeRef: QuranRef & { explicitVerse?: boolean }): Promise<string> {
  const persisted = await readCurrentPosition()
  const ref = !routeRef.explicitVerse && persisted?.surah === routeRef.surah
    ? persisted
    : { surah: routeRef.surah, verse: routeRef.verse }
  return resolveMushafHrefForVerseRef(ref)
}

export async function resolveVerseHrefForMushafPage(page: number, fallbackRef?: QuranRef | null): Promise<string> {
  try {
    const settings = await loadActiveMushafSettings()
    const manifest = await loadMushafManifest(settings)
    const ref = firstVerseForMushafPage(manifest, page)
    return REACT_ROUTES.surah(ref.surah, ref.verse)
  } catch {
    const fallback = fallbackRef ?? await readCurrentPosition()
    return fallback ? REACT_ROUTES.surah(fallback.surah, fallback.verse) : REACT_ROUTES.surah(1)
  }
}

export async function resolveDrawerHrefForReaderMode(mode: 'verse' | 'mushaf', hash: string): Promise<string> {
  if (mode !== 'mushaf') return hash
  const ref = parseReaderHash(hash)
  if (!ref) return hash
  return resolveMushafHrefForVerseRef(ref)
}

function parseReaderHash(hash: string): QuranRef | null {
  const match = /^#\/s\/(\d{1,3})(?:\/(\d{1,3}))?$/.exec(hash)
  if (!match) return null
  const surah = Number(match[1])
  const verse = match[2] ? Number(match[2]) : 1
  if (!Number.isInteger(surah) || !Number.isInteger(verse) || surah < 1 || surah > 114 || verse < 1) return null
  return { surah, verse }
}

async function readCurrentPosition(): Promise<QuranRef | null> {
  try {
    const db = await openReactDb()
    const record = await db.settings.get('currentPosition')
    const value = record?.value as Partial<QuranRef> | undefined
    if (!value || !Number.isInteger(value.surah) || !Number.isInteger(value.verse)) return null
    if ((value.surah ?? 0) < 1 || (value.surah ?? 0) > 114 || (value.verse ?? 0) < 1) return null
    return { surah: value.surah as number, verse: value.verse as number }
  } catch {
    return null
  }
}

async function loadActiveMushafSettings(): Promise<ActiveMushafSettings> {
  try {
    const db = await openReactDb()
    const [riwayah, mushafEditionId] = await Promise.all([
      db.settings.get('riwayah'),
      db.settings.get('mushafEditionId'),
    ])
    return {
      riwayah: isRiwayah(riwayah?.value) ? riwayah.value : DEFAULT_RIWAYAH,
      mushafEditionId: typeof mushafEditionId?.value === 'string' ? mushafEditionId.value : DEFAULT_MUSHAF_EDITION_ID,
    }
  } catch {
    return { riwayah: DEFAULT_RIWAYAH, mushafEditionId: DEFAULT_MUSHAF_EDITION_ID }
  }
}

function isRiwayah(value: unknown): value is Riwayah {
  return value === 'hafs' || value === 'warsh' || value === 'qaloon'
}
