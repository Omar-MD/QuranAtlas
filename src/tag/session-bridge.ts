/**
 * Imperative bridge to begin a fast-path tagging session from a verse tap.
 * Mirrors `marks/editor-bridge.openEditor` but for the inline verse panel
 * (`reader/VerseTagPanel`, previously `tag/AmbientDock`).
 *
 * Deep path (TagSheet overlay) goes through `tag/sheet-bridge.ts` —
 * `openDeep` hydrates the session then opens the bridge directly.
 * `tagSession.sheetOpen` rune was retired 2026-05-01 (audit N22).
 */

import { tagSession } from '../tag/state.svelte'
import { getByVerseKey } from '../marks/store'
import { LAYER_NAMES } from '../core/db'
import type { LayerName } from '../core/db'
import { tagSheetBridge } from './sheet-bridge'

async function hydrateSession(verseKey: string): Promise<void> {
  try {
    const mark = await getByVerseKey(verseKey)
    const cur: Partial<Record<LayerName, string[]>> = {}
    if (mark) {
      for (const l of LAYER_NAMES) {
        const v = (mark as unknown as Record<string, unknown>)[l]
        if (Array.isArray(v)) { cur[l] = v as string[] }
      }
    }
    tagSession.begin(verseKey, cur, mark?.note ?? '')
  } catch {
    tagSession.begin(verseKey)
  }
}

export async function beginFast(verseKey: string): Promise<void> {
  await hydrateSession(verseKey)
  tagSession.quickbarOpen = true
}

export async function openDeep(verseKey: string): Promise<void> {
  await hydrateSession(verseKey)
  tagSession.quickbarOpen = false
  tagSheetBridge.api.open(verseKey)
}
