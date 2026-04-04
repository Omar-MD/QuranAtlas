/**
 * Default tag registry.
 */

const DEFAULT_TAGS = [
  { label: 'favourite', color: '#f59e0b' },
  { label: 'study', color: '#3b82f6' },
  { label: 'reflection', color: '#22c55e' },
  { label: 'question', color: '#a855f7' }
]

export function getDefaults() {
  return [...DEFAULT_TAGS]
}
