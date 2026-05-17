import { settings } from '../../configure/state.svelte'
import { getMushafPackAvailability, loadMushafManifest, pageForVerse } from '../../packs/mushaf-pages'
import { reader } from '../state.svelte'
import { firstVerseForPage, pageFromAyahRecord, pageHref, verseHref } from './navigation'

function parseVerseKey(key: string | null): { surah: number; verse: number } | null {
  if (!key) return null
  const match = key.match(/^(\d+):(\d+)$/)
  if (!match) return null
  return { surah: Number.parseInt(match[1]!, 10), verse: Number.parseInt(match[2]!, 10) }
}

export async function mushafHrefForCurrentVerse(): Promise<string> {
  const current = parseVerseKey(reader.currentVerseKey)
  const persisted = settings.currentPosition
  const surahNum = current?.surah ?? reader.currentSurahNum ?? persisted?.surah
  const verseNum = current?.verse ?? persisted?.verse
  if (!surahNum || !verseNum) return pageHref(1)

  const active = await getMushafPackAvailability(settings.riwayah)
  if (!active.available) {
    const loadedActiveSurah = reader.currentSurah?.riwayah === settings.riwayah
      && reader.currentSurah.sura_no === surahNum
      ? reader.currentSurah
      : null
    const activeAyah = loadedActiveSurah?.ayat.find((ayah) => ayah.aya_no === verseNum)
    const activeAyahPage = activeAyah ? pageFromAyahRecord(activeAyah) : null
    return pageHref(activeAyahPage ?? 1)
  }

  try {
    const page = await pageForVerse({ riwayah: settings.riwayah, surah: surahNum, verse: verseNum })
    return pageHref(page ?? 1)
  } catch {
    return pageHref(1)
  }
}

export async function verseHrefForMushafPage(page: number): Promise<string> {
  try {
    const manifest = await loadMushafManifest(settings.riwayah)
    return verseHref(firstVerseForPage(manifest, page))
  } catch {
    const fallback = settings.currentPosition
    return fallback ? verseHref({ surah: fallback.surah, verse: fallback.verse }) : '#/s/1'
  }
}
