// Pure type declarations + the LAYER_NAMES enum constant. Imported by
// type-only consumers (safety/input-validator.ts, tag/session-bridge.ts,
// data/tag-layers.ts, bookmarks/indicator.ts, etc.) so they don't pull
// the IDB connection runtime through TypeScript erasure (audit C-2 /
// CC-2 / R-07, 2026-04-29).

export type LayerName =
  | 'threads' | 'subjects' | 'audience' | 'speaker' | 'quotedSpeaker'
  | 'mode' | 'form' | 'tone' | 'people' | 'places' | 'events' | 'divineNames'

export const LAYER_NAMES: LayerName[] = [
  'threads', 'subjects', 'audience', 'speaker', 'quotedSpeaker',
  'mode', 'form', 'tone', 'people', 'places', 'events', 'divineNames',
]

export interface MarkRecord {
  verseKey: string
  threads: string[]
  subjects: string[]
  audience: string[]
  speaker: string[]
  quotedSpeaker: string[]
  mode: string[]
  form: string[]
  tone: string[]
  people: string[]
  places: string[]
  events: string[]
  divineNames: string[]
  _canon: Record<LayerName, string[]>
  note: string
  createdAt: number
  updatedAt: number
}

export interface EdgeRecord {
  id: string
  from: string
  to: string
  kind: string
  _canonKind: string
  directed: boolean
  note: string
  createdAt: number
  updatedAt: number
}

export type Riwayah = 'hafs' | 'warsh' | 'qaloon'

export interface BookmarkRecord {
  riwayah: Riwayah
  verseKey: string
  surah: number
  createdAt: number
}

export type StoreRecords = {
  settings: { key: string; value: unknown }
  meta: { id: string; [k: string]: unknown }
  marks: MarkRecord
  activationState: { id: string; status: string; [k: string]: unknown }
  datasetMeta: { id: string; version?: string; [k: string]: unknown }
  edges: EdgeRecord
  bookmarks: BookmarkRecord
}

export type StoreName = keyof StoreRecords
