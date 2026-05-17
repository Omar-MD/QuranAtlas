import { settings, type GlobalPosition } from '../configure/state.svelte'
import type { Riwayah } from '../packs/riwayah'
import {
  clearGlobalPosition as clearStoredGlobalPosition,
  loadGlobalPosition as loadStoredGlobalPosition,
  saveGlobalPosition as saveStoredGlobalPosition,
} from '../continuity/position'

export async function loadGlobalPosition(): Promise<GlobalPosition> {
  const position = await loadStoredGlobalPosition((settings.riwayah ?? 'qaloon') as Riwayah)
  settings.currentPosition = position
  return position
}

export async function saveGlobalPosition(surah: number, verse: number): Promise<void> {
  await saveStoredGlobalPosition(surah, verse)
  settings.currentPosition = { surah, verse }
}

export async function clearGlobalPosition(): Promise<void> {
  await clearStoredGlobalPosition()
  settings.currentPosition = null
}
