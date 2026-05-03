/**
 * Semantic tag colors — 16 named Qur'anic-theme tags with {light, dark} hex pairs.
 *
 * Dark values are the spec-approved ambient palette (mockups in
 * .superpowers/brainstorm/39422-1776297701/content/). Light values are WCAG AA
 * derivations of the same hue family (≥4.5:1 contrast on #ffffff / #f3e8cf).
 *
 * Labels here are the curated seed set. Unknown labels (user-created custom tags)
 * fall through to the hash-based palette in src/mark/tags.js — see getColorForTag.
 */

export const SEMANTIC_TAG_COLORS: Record<string, { light: string; dark: string }> = {
  mercy:       { light: '#2e6b46', dark: '#64a078' },
  gratitude:   { light: '#8a6a20', dark: '#c8a050' },
  patience:    { light: '#2e5a7a', dark: '#6e96b4' },
  reflection:  { light: '#4a3f8a', dark: '#8c82c8' },
  prayer:      { light: '#6b4a16', dark: '#d9b06a' },
  forgiveness: { light: '#8a5028', dark: '#d4a070' },
  tawhid:      { light: '#7a5a1a', dark: '#e8c478' },
  tawakkul:    { light: '#7a4428', dark: '#b4826e' },
  hope:        { light: '#7a6420', dark: '#c8b46e' },
  justice:     { light: '#3a5a3a', dark: '#7ab07a' },
  dunya:       { light: '#5a4a3a', dark: '#a89880' },
  akhirah:     { light: '#3a4870', dark: '#8aa0c4' },
  repentance:  { light: '#6a3a4a', dark: '#c48098' },
  guidance:    { light: '#4a5a2e', dark: '#a8c070' },
  fear:        { light: '#5a3030', dark: '#c08080' },
  knowledge:   { light: '#2e5a6a', dark: '#70a8b4' },
}

export const SEMANTIC_TAG_LABELS = Object.keys(SEMANTIC_TAG_COLORS)

/**
 * Resolve the current theme variant.
 */
function getThemeVariant(): 'light' | 'dark' {
  if (typeof document === 'undefined') {
    return 'light'
  }
  const theme = document.documentElement?.dataset?.theme
  return theme === 'dark' ? 'dark' : 'light'
}

/**
 * Get the semantic color for a named tag, theme-aware.
 * Returns null if the label is not in the curated semantic set — caller should
 * fall back to the hash-based palette.
 */
export function getSemanticTagColor(label: string): string | null {
  const entry = SEMANTIC_TAG_COLORS[label]
  if (!entry) {
    return null
  }
  return entry[getThemeVariant()]
}
