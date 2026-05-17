// Per-store write validation. Pulls the `_shapes` table out of the
// connection module so type-only consumers (and the schema fixture) can
// import the connection lifecycle independently of the validator
// machinery — audit C-2 / R-07 (2026-04-29).
//
// Adds (N18, audit R-20 / R-21):
//  - per-string length caps so a crafted MARKS IMPORT (#8) can't
//    quota-DoS the store
//  - per-array length caps + per-element length caps for tag arrays
//  - bookmark.riwayah enum check (string passed through arbitrarily
//    pre-fix — `'literally any value'` would persist)
//  - __proto__ / constructor / prototype stripping uniformly applied
//    so a malicious payload can't pollute a downstream consumer that
//    spreads the record into a fresh object

/**
 * Required fields per store, with their expected runtime types.
 * Use 'any' to require the field is present but skip type checking.
 * Fields listed here are required; if absent the write is rejected.
 */
const _shapes: Record<string, Record<string, string>> = {
  settings: { key: 'string', value: 'any' },
  activationState: { id: 'string', status: 'string' },
  datasetMeta: { id: 'string' },
  bookmarks: {
    riwayah: 'string', verseKey: 'string',
    surah: 'number', createdAt: 'number',
  },
}

/**
 * Optional fields per store that are type-checked when present.
 * If a field appears in the record but with the wrong type, the write is rejected.
 */
const _optionalTypes: Record<string, Record<string, string>> = {
  activationState: {
    version: 'string',
    progress: 'number',
    error: 'string',
    stagedAt: 'number',
  },
}

function _typeOf(v: unknown): string {
  if (Array.isArray(v)) {
    if (v.length === 0) { return 'empty[]' }
    const elemType = typeof v[0]
    return v.every(x => typeof x === elemType) ? `${elemType}[]` : 'mixed[]'
  }
  return typeof v
}

// Per-store length caps applied after type-check. Keep generous enough
// that legitimate user content (long footnotes, deep tag taxonomies)
// fits, but tight enough that a crafted import can't dump megabytes
// per record.
const STRING_CAPS: Record<string, Record<string, number>> = {
  bookmarks: {
    riwayah: 8, verseKey: 12,
  },
  activationState: { id: 64, status: 32 },
  datasetMeta: { id: 64 },
  settings: { key: 64 },
}

const ARRAY_CAPS = { perArray: 256, perElement: 64 }

const RIWAYAH_ENUM = new Set(['hafs', 'warsh', 'qaloon'])
const ACTIVATION_STATUS_ENUM = new Set([
  'none',
  'idle',
  'downloading',
  'cached',
  'pending-confirmation',
  'applying',
  'failed',
])

const PROTOTYPE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function checkLengthCaps(storeName: string, rec: Record<string, unknown>): void {
  // Per-string field caps.
  const caps = STRING_CAPS[storeName]
  if (caps) {
    for (const [field, max] of Object.entries(caps)) {
      const v = rec[field]
      if (typeof v === 'string' && v.length > max) {
        throw new Error(`${storeName}.${field}: length ${v.length} exceeds cap ${max}`)
      }
    }
  }
  // Per-array length + per-element length for any string[] field on the record.
  for (const [field, v] of Object.entries(rec)) {
    if (!Array.isArray(v)) { continue }
    if (v.length > ARRAY_CAPS.perArray) {
      throw new Error(`${storeName}.${field}: array length ${v.length} exceeds cap ${ARRAY_CAPS.perArray}`)
    }
    for (const el of v) {
      if (typeof el === 'string' && el.length > ARRAY_CAPS.perElement) {
        throw new Error(`${storeName}.${field}: element length ${el.length} exceeds cap ${ARRAY_CAPS.perElement}`)
      }
    }
  }
}

function checkProtoKeys(storeName: string, rec: Record<string, unknown>): void {
  for (const key of Object.keys(rec)) {
    if (PROTOTYPE_KEYS.has(key)) {
      throw new Error(`${storeName}: prototype-pollution key '${key}' is rejected`)
    }
  }
}

function checkEnums(storeName: string, rec: Record<string, unknown>): void {
  if (storeName === 'bookmarks') {
    if (typeof rec.riwayah !== 'string' || !RIWAYAH_ENUM.has(rec.riwayah)) {
      throw new Error(`bookmarks.riwayah: expected 'hafs' | 'warsh' | 'qaloon', got ${JSON.stringify(rec.riwayah)}`)
    }
  }
  if (storeName === 'activationState') {
    if (rec.id !== 'current') {
      throw new Error(`activationState.id: expected 'current', got ${JSON.stringify(rec.id)}`)
    }
    if (typeof rec.status !== 'string' || !ACTIVATION_STATUS_ENUM.has(rec.status)) {
      throw new Error(
        `activationState.status: expected ${JSON.stringify([...ACTIVATION_STATUS_ENUM])}, got ${JSON.stringify(rec.status)}`,
      )
    }
  }
}

/**
 * Validate a write to a store.
 */
export async function validateWrite(storeName: string, value: unknown): Promise<boolean> {
  const shape = _shapes[storeName]
  if (!shape) {
    throw new Error(`Unknown store: ${storeName}`)
  }

  const rec = value as Record<string, unknown>

  // Note: missing-field format ('missing required field: ${field}') matches existing db.test.js
  // assertions — do not change. Type-mismatch errors use a different format intentionally.
  for (const [field, expected] of Object.entries(shape)) {
    if (!(field in rec) || rec[field] === undefined) {
      throw new Error(`missing required field: ${field}`)
    }
    if (expected === 'any') { continue }
    const actual = _typeOf(rec[field])
    if (actual !== expected) {
      if (actual === 'empty[]' && expected.endsWith('[]')) { continue }
      throw new Error(`${storeName}.${field}: expected ${expected}, got ${actual}`)
    }
  }

  const optionals = _optionalTypes[storeName]
  if (optionals) {
    for (const [field, expected] of Object.entries(optionals)) {
      if (!(field in rec) || rec[field] === undefined) { continue }
      const actual = _typeOf(rec[field])
      if (actual !== expected) {
        if (actual === 'empty[]' && expected.endsWith('[]')) { continue }
        throw new Error(`${storeName}.${field}: expected ${expected}, got ${actual}`)
      }
    }
  }

  checkProtoKeys(storeName, rec)
  checkEnums(storeName, rec)
  checkLengthCaps(storeName, rec)

  return true
}
