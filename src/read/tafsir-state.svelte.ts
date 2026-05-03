import { getTafsirs, loadTafsirForSurah, type TafsirEntry, type TafsirEntryMeta, type TafsirSurahPack } from '../data/dataset'
import { settings } from '../configure/state.svelte'
import { loadTafsirId, resolveSavedTafsirId, setTafsirId } from '../configure/tafsir'

const DEFAULT_TAFSIR_ID = 'muyassar'

class TafsirState {
  previewOpen = $state(false)
  activeVerseKey = $state<string | null>(null)
  available = $state<TafsirEntryMeta[]>([])
  selectedId = $state<string>(DEFAULT_TAFSIR_ID)
  currentSurahNo = $state<number | null>(null)
  pack = $state<TafsirSurahPack | null>(null)
  loading = $state(false)
  unavailable = $state(false)
}

export const tafsirState = new TafsirState()

let sourceListPromise: Promise<TafsirEntryMeta[]> | null = null

async function ensureSourceList(): Promise<TafsirEntryMeta[]> {
  if (!sourceListPromise) {
    sourceListPromise = getTafsirs().catch(() => [])
  }
  const list = await sourceListPromise
  tafsirState.available = list
  if (list.length > 0) {
    const resolved = await resolveSavedTafsirId(list.map((entry) => entry.id))
    tafsirState.selectedId = resolved
  } else {
    const saved = await loadTafsirId()
    tafsirState.selectedId = saved ?? settings.tafsirId ?? DEFAULT_TAFSIR_ID
  }
  return list
}

async function loadPackFor(verseKey: string, requestedId?: string): Promise<void> {
  const [surahStr] = verseKey.split(':')
  const surahNo = parseInt(surahStr ?? '0', 10)
  if (!Number.isFinite(surahNo) || surahNo < 1) { return }

  await ensureSourceList()

  const targetId = requestedId ?? tafsirState.selectedId ?? DEFAULT_TAFSIR_ID
  tafsirState.loading = true
  tafsirState.unavailable = false
  tafsirState.currentSurahNo = surahNo
  try {
    const pack = await loadTafsirForSurah(targetId, surahNo)
    tafsirState.pack = pack
    tafsirState.unavailable = !pack
    if (pack?.tafsirId) {
      tafsirState.selectedId = pack.tafsirId
      settings.tafsirId = pack.tafsirId
    }
  } catch {
    tafsirState.pack = null
    tafsirState.unavailable = true
  } finally {
    tafsirState.loading = false
  }
}

export async function openTafsirPreview(verseKey: string): Promise<void> {
  tafsirState.activeVerseKey = verseKey
  tafsirState.previewOpen = true
  await loadPackFor(verseKey)
}

export function closeTafsirPreview(): void {
  tafsirState.previewOpen = false
  tafsirState.activeVerseKey = null
  tafsirState.unavailable = false
}

export async function selectTafsirSource(id: string): Promise<void> {
  await setTafsirId(id)
  tafsirState.selectedId = id
  if (tafsirState.activeVerseKey) {
    await loadPackFor(tafsirState.activeVerseKey, id)
  }
}

export function getActiveTafsirEntry(): TafsirEntry | null {
  const verseKey = tafsirState.activeVerseKey
  const entries = tafsirState.pack?.entries ?? []
  if (!verseKey) { return null }
  return entries.find((entry) => entry.ayahKeys.includes(verseKey)) ?? null
}

export function formatTafsirRange(entry: TafsirEntry | null): string {
  if (!entry) { return '' }
  if (entry.startKey === entry.endKey) { return entry.startKey }
  return `${entry.startKey}-${entry.endKey.split(':')[1] ?? entry.endKey}`
}
