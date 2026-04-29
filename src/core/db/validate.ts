// Per-store write validation. Pulls the `_shapes` table out of the
// connection module so type-only consumers (and the schema fixture) can
// import the connection lifecycle independently of the validator
// machinery — audit C-2 / R-07 (2026-04-29).
//
// Separated from connection.ts so future per-element length caps,
// enum tightening, and `__proto__`/`constructor` strip (audit R-20 / N18)
// can land here without touching the connection lifecycle.

/**
 * Required fields per store, with their expected runtime types.
 * Use 'any' to require the field is present but skip type checking.
 * Fields listed here are required; if absent the write is rejected.
 */
const _shapes: Record<string, Record<string, string>> = {
  settings: { key: 'string', value: 'any' },
  meta: { id: 'string' },
  marks: {
    verseKey: 'string',
    threads: 'string[]', subjects: 'string[]', audience: 'string[]',
    speaker: 'string[]', quotedSpeaker: 'string[]',
    mode: 'string[]', form: 'string[]', tone: 'string[]',
    people: 'string[]', places: 'string[]', events: 'string[]', divineNames: 'string[]',
    _canon: 'any',
    note: 'string',
    createdAt: 'number',
    updatedAt: 'number',
  },
  activationState: { id: 'string', status: 'string' },
  datasetMeta: { id: 'string' },
  edges: {
    id: 'string', from: 'string', to: 'string',
    kind: 'string', _canonKind: 'string', directed: 'boolean',
    note: 'string', createdAt: 'number', updatedAt: 'number',
  },
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
}

function _typeOf(v: unknown): string {
  if (Array.isArray(v)) {
    if (v.length === 0) { return 'empty[]' }
    const elemType = typeof v[0]
    return v.every(x => typeof x === elemType) ? `${elemType}[]` : 'mixed[]'
  }
  return typeof v
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

  return true
}
