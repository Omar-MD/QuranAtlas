import { DEFAULT_READER_ASSET_PROFILE } from '../../shared/reader-assets/default-profile'
import { readNativeSettings } from './native-reader-store'
import { QURAN_ATLAS_V7_STORES } from './schema'
import type { Riwayah } from './types'

// Single home for the active reader-profile settings idioms (audit D3/D15/D16)
// and the native reader store's Dexie-derived store specs (D29).

// D15 — the shipped default asset profile is the single source for the
// per-field fallback ids used wherever the active reader profile is resolved.
export const DEFAULT_RIWAYAH: Riwayah = DEFAULT_READER_ASSET_PROFILE.riwayah
export const DEFAULT_QURAN_TEXT_STYLE_ID = DEFAULT_READER_ASSET_PROFILE.quranTextStyleId
export const DEFAULT_TRANSLATION_ID = DEFAULT_READER_ASSET_PROFILE.translationId
export const DEFAULT_MUSHAF_EDITION_ID = DEFAULT_READER_ASSET_PROFILE.mushafEditionId

// D16 — Riwayah is 'qaloon' and the sole writer of the riwayah setting stores
// the default profile's value, so this is the one sound guard body.
export function isRiwayah(value: unknown): value is Riwayah {
  return value === DEFAULT_RIWAYAH
}

export type ActiveReaderProfile = {
  riwayah: Riwayah
  quranTextStyleId: string
  translationId: string
  mushafEditionId: string
}

// D3 — the active reader profile: the four profile settings, each falling back
// per field to the shipped default. Rejects when the native store cannot be
// read; callers own their catch policy.
export async function readActiveReaderProfile(): Promise<ActiveReaderProfile> {
  const [riwayah, quranTextStyleId, translationId, mushafEditionId] = await readNativeSettings([
    'riwayah',
    'quranTextStyleId',
    'translationId',
    'mushafEditionId',
  ])
  return {
    riwayah: isRiwayah(riwayah?.value) ? riwayah.value : DEFAULT_RIWAYAH,
    quranTextStyleId:
      typeof quranTextStyleId?.value === 'string' ? quranTextStyleId.value : DEFAULT_QURAN_TEXT_STYLE_ID,
    translationId: typeof translationId?.value === 'string' ? translationId.value : DEFAULT_TRANSLATION_ID,
    mushafEditionId: typeof mushafEditionId?.value === 'string' ? mushafEditionId.value : DEFAULT_MUSHAF_EDITION_ID,
  }
}

// D3 — the mushaf subset of the profile (manifest identity only); rejects when
// the native store cannot be read. Callers own their catch policy.
export async function readActiveMushafProfile(): Promise<{ mushafEditionId: string; riwayah: Riwayah }> {
  const [riwayah, mushafEditionId] = await readNativeSettings(['riwayah', 'mushafEditionId'])
  return {
    riwayah: isRiwayah(riwayah?.value) ? riwayah.value : DEFAULT_RIWAYAH,
    mushafEditionId: typeof mushafEditionId?.value === 'string' ? mushafEditionId.value : DEFAULT_MUSHAF_EDITION_ID,
  }
}

// D29 — the native reader store creates its two stores with raw IndexedDB;
// these specs derive from the Dexie declarations in schema.ts so the mirrored
// key paths and index names cannot drift (tests/e2e/fixtures/app.ts applies
// the same translation when seeding the fixture database).
type NativeReaderStoreSpec = {
  autoIncrement: boolean
  indexes: Array<{ keyPath: string | string[]; multiEntry: boolean; name: string; unique: boolean }>
  keyPath: string | string[]
}

export const NATIVE_READER_STORES = {
  settings: nativeReaderStoreSpec(QURAN_ATLAS_V7_STORES.settings),
  bookmarks: nativeReaderStoreSpec(QURAN_ATLAS_V7_STORES.bookmarks),
}

function nativeReaderStoreSpec(dexieSpec: string): NativeReaderStoreSpec {
  const tokens = dexieSpec.split(',').map((token) => token.trim())
  const keyPath = dexieKeyPath(tokens[0] ?? '')
  if (!keyPath) throw new Error(`Invalid Dexie store spec: ${dexieSpec}`)
  const indexes: NativeReaderStoreSpec['indexes'] = []
  for (const token of tokens.slice(1)) {
    const indexKeyPath = dexieKeyPath(token)
    if (!indexKeyPath) continue
    indexes.push({
      keyPath: indexKeyPath,
      multiEntry: token.includes('*'),
      name: Array.isArray(indexKeyPath) ? indexKeyPath.join('_') : indexKeyPath,
      unique: token.includes('&'),
    })
  }
  return { autoIncrement: tokens[0].includes('++'), indexes, keyPath }
}

function dexieKeyPath(token: string): string | string[] | null {
  const name = token.replace(/([&*]|\+\+)/g, '')
  if (!name) return null
  return name.startsWith('[') ? name.slice(1, -1).split('+') : name
}
