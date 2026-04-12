/**
 * Tag palette, seed tags, and color resolution.
 *
 * Tags are implicit — derived from the by-tag multiEntry index on marks.
 * No separate IDB store. This module provides:
 * - A fixed 12-slot WCAG AA color palette
 * - 5 seed tag suggestions for cold-start
 * - Deterministic label → color mapping (hash for custom, fixed slot for seeds)
 * - getAllUsedTags() via index-only key cursor scan
 */

import { getDb } from '../core/db.js'

/**
 * 12-slot WCAG AA-safe palette.
 * light = for light/sepia themes (dark-on-light, ≥4.5:1 on #ffffff / #fbf0d9)
 * dark  = for dark theme (light-on-dark, ≥4.5:1 on #121212)
 */
export const TAG_PALETTE = [
  { light: '#b45309', dark: '#fbbf24' }, // 0 Amber
  { light: '#92400e', dark: '#fcd34d' }, // 1 Gold
  { light: '#b91c1c', dark: '#fca5a5' }, // 2 Red
  { light: '#1d4ed8', dark: '#93c5fd' }, // 3 Blue
  { light: '#6d28d9', dark: '#d8b4fe' }, // 4 Purple
  { light: '#15803d', dark: '#86efac' }, // 5 Green
  { light: '#0f766e', dark: '#5eead4' }, // 6 Teal
  { light: '#be123c', dark: '#fda4af' }, // 7 Rose
  { light: '#3730a3', dark: '#a5b4fc' }, // 8 Indigo
  { light: '#c2410c', dark: '#fdba74' }, // 9 Orange
  { light: '#0e7490', dark: '#67e8f9' }, // 10 Cyan
  { light: '#475569', dark: '#94a3b8' }, // 11 Slate
]

/**
 * 5 seed tags offered when user has zero marks.
 * Fixed palette slots bypass the hash function.
 */
export const SEED_TAGS = [
  { label: 'favourite', paletteSlot: 0 },
  { label: 'divine', paletteSlot: 1 },
  { label: 'disbelievers', paletteSlot: 2 },
  { label: 'ahl al-kitāb', paletteSlot: 3 },
  { label: 'hypocrites', paletteSlot: 4 },
]

/** Map of seed label → fixed palette slot for O(1) lookup. */
const SEED_SLOT_MAP = new Map(SEED_TAGS.map(s => [s.label, s.paletteSlot]))

/**
 * Simple string hash: sum of (charCode × position-prime) mod 12.
 * @param {string} label - lowercased tag label
 * @returns {number} palette slot index 0–11
 */
function hashLabel(label) {
  let hash = 0
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0
  }
  return ((hash % 12) + 12) % 12 // ensure non-negative
}

/**
 * Resolve the current theme variant.
 * @returns {'light' | 'dark'}
 */
function getThemeVariant() {
  if (typeof document === 'undefined') return 'light'
  const theme = document.documentElement?.dataset?.theme
  return theme === 'dark' ? 'dark' : 'light'
}

/**
 * Get the color hex string for a tag label.
 * Seed tags use their fixed palette slot; custom tags use a deterministic hash.
 * Returns the correct variant (light or dark) based on current theme.
 * @param {string} label - lowercased tag label
 * @returns {string} hex color e.g. '#b45309'
 */
export function getColorForTag(label) {
  const variant = getThemeVariant()
  const fixedSlot = SEED_SLOT_MAP.get(label)
  if (fixedSlot !== undefined) {
    return TAG_PALETTE[fixedSlot][variant]
  }
  const slot = hashLabel(label)
  return TAG_PALETTE[slot][variant]
}

/**
 * Get the seed tags array (used by editor on cold-start).
 * @returns {Array<{label: string, paletteSlot: number}>}
 */
export function getSeedTags() {
  return SEED_TAGS.map(s => ({ ...s }))
}

/**
 * Get all unique tag labels from the marks store via index-only key cursor.
 * Fast even at 500+ marks — no record deserialization.
 * @returns {Promise<string[]>} sorted unique tag labels
 */
export async function getAllUsedTags() {
  const db = await getDb()
  const tags = new Set()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readonly')
    const index = tx.objectStore('marks').index('by-tag')
    const request = index.openKeyCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        tags.add(cursor.key)
        cursor.continue()
      } else {
        resolve([...tags].sort())
      }
    }
    request.onerror = () => reject(request.error)
  })
}
