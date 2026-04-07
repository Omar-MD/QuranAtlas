/**
 * Tag registry.
 * 4 default tags with colors. Users can delete defaults (persisted to IDB).
 * Custom tag creation is DEFERRED to Phase 4.
 */

import { get, put } from '../core/db.js'
import { removeTagFromAll } from './store.js'

const DEFAULT_TAGS = [
  { label: 'favourite', color: '#f59e0b' },
  { label: 'study', color: '#3b82f6' },
  { label: 'reflection', color: '#22c55e' },
  { label: 'question', color: '#a855f7' },
]

const FALLBACK_COLOR = '#888888'
const DELETED_KEY = 'deleted-default-tags'

/**
 * Get the immutable list of 4 default tags.
 * @returns {Array<{label: string, color: string}>}
 */
export function getDefaults() {
  return DEFAULT_TAGS.map(t => ({ ...t }))
}

/**
 * Get active (non-deleted) tags.
 * @returns {Promise<Array<{label: string, color: string}>>}
 */
export async function getActiveTags() {
  const deleted = await getDeletedLabels()
  return DEFAULT_TAGS
    .filter(t => !deleted.includes(t.label))
    .map(t => ({ ...t }))
}

/**
 * Delete a default tag. Cascades: removes the tag from all marks.
 * @param {string} label - lowercased tag label
 */
export async function deleteTag(label) {
  const deleted = await getDeletedLabels()
  if (!deleted.includes(label)) {
    deleted.push(label)
    await put('settings', { key: DELETED_KEY, value: deleted })
  }
  await removeTagFromAll(label)
}

/**
 * Get color for a tag label.
 * @param {string} label
 * @returns {string} hex color
 */
export function getColorForTag(label) {
  const tag = DEFAULT_TAGS.find(t => t.label === label)
  return tag ? tag.color : FALLBACK_COLOR
}

/**
 * Read the list of deleted default tag labels from IDB.
 * @returns {Promise<string[]>}
 */
async function getDeletedLabels() {
  const record = await get('settings', DELETED_KEY)
  return record?.value ?? []
}
