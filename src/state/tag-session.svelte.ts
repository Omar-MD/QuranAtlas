/**
 * Tag-session state (runes). Holds the live state for a single tagging
 * session — one verse at a time. Both the fast path (inline panel via
 * `reader/VerseTagPanel`) and the deep path (`marks/Editor` or
 * `tag/TagSheet`) read/write this state. Persistence still flows through
 * `marks/store.ts`.
 */

import type { LayerName } from '../core/db'
import { LAYER_NAMES } from '../core/db'

type LayerMap = Record<LayerName, string[]>

function emptyLayerMap(): LayerMap {
  const out = {} as LayerMap
  for (const l of LAYER_NAMES) { out[l] = [] }
  return out
}

export class TagSessionState {
  verseKey = $state<string | null>(null)
  quickbarOpen = $state(false)
  sheetOpen = $state(false)
  draft = $state<LayerMap>(emptyLayerMap())
  note = $state('')

  begin(verseKey: string, current?: Partial<LayerMap>, note = ''): void {
    this.verseKey = verseKey
    this.note = note
    const next = emptyLayerMap()
    if (current) {
      for (const l of LAYER_NAMES) {
        const vals = current[l]
        if (Array.isArray(vals)) { next[l] = [...vals] }
      }
    }
    this.draft = next
  }

  end(): void {
    this.verseKey = null
    this.quickbarOpen = false
    this.sheetOpen = false
    this.draft = emptyLayerMap()
    this.note = ''
  }

  toggle(layer: LayerName, value: string): void {
    const arr = this.draft[layer]
    const i = arr.indexOf(value)
    if (i >= 0) { arr.splice(i, 1) }
    else { arr.push(value) }
  }

  totalSelected(): number {
    let n = 0
    for (const l of LAYER_NAMES) { n += this.draft[l].length }
    return n
  }
}

export const tagSession = new TagSessionState()
