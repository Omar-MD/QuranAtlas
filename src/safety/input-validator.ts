/**
 * Input validation for navigation and tag parameters.
 * Permitted cross-module import (safety exception).
 */

export type SurahEntry = { n: number; name: string; count: number }

export type ParseNavResult =
  | { valid: true; surah: number; verse?: number }
  | { valid: false; error: string }

export type ValidateTagResult =
  | { valid: true; label: string }
  | { valid: false; error: string }

/**
 * Parse navigation input.
 * Accepts: "2", "2:255", "Al-Baqarah", "Baqarah 255"
 */
export function parseNavigationInput(input: string, surahs?: SurahEntry[]): ParseNavResult {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Input is required' }
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return { valid: false, error: 'Input is empty' }
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Input too long' }
  }

  // Numeric surah: "2" or "2:255"
  const numericMatch = trimmed.match(/^(\d+)(?::(\d+))?$/)
  if (numericMatch) {
    const surah = parseInt(numericMatch[1] ?? '', 10)
    const verse = numericMatch[2] ? parseInt(numericMatch[2], 10) : undefined

    if (surah < 1 || surah > 114) {
      return { valid: false, error: `Surah ${surah} does not exist` }
    }
    if (verse !== undefined && verse < 1) {
      return { valid: false, error: `Invalid verse number: ${verse}` }
    }

    // Validate verse against surah's ayah count if surahs provided
    if (verse !== undefined && surahs) {
      const meta = surahs.find(s => s.n === surah)
      if (meta && verse > meta.count) {
        return {
          valid: false,
          error: `Verse ${verse} does not exist in ${meta.name} (${meta.count} verses)`,
        }
      }
    }

    return { surah, verse, valid: true }
  }

  // Surah name: "Al-Baqarah" or "Baqarah 255"
  const nameMatch = trimmed.match(/^([a-zA-Z\s'-]+?)(?:\s+(\d+))?$/)
  if (nameMatch && surahs) {
    const rawName = (nameMatch[1] ?? '').trim()
    const verse = nameMatch[2] ? parseInt(nameMatch[2], 10) : undefined

    const match = findSurahByName(rawName, surahs)
    if (!match) {
      return { valid: false, error: `Unknown surah: "${rawName}"` }
    }

    if (verse !== undefined) {
      if (verse < 1) {
        return { valid: false, error: `Invalid verse number: ${verse}` }
      }
      if (verse > match.count) {
        return {
          valid: false,
          error: `Verse ${verse} does not exist in ${match.name} (${match.count} verses)`,
        }
      }
    }

    return { surah: match.n, verse, valid: true }
  }

  if (nameMatch && !surahs) {
    return { valid: false, error: `Unknown surah: "${trimmed}"` }
  }

  return { valid: false, error: `Invalid input: "${trimmed}"` }
}

/**
 * Find a surah by name (case-insensitive, with/without "Al-" prefix).
 * Uses strict matching - must match the full name or stripped name exactly.
 */
function findSurahByName(query: string, surahs: SurahEntry[]): SurahEntry | null {
  const q = query.toLowerCase().replace(/^al[- ]/, '').trim()

  for (const s of surahs) {
    const name = s.name.toLowerCase()
    const nameStripped = name.replace(/^al[- ]/, '')
    // Strict matching: exact match or exact stripped match
    if (name === query.toLowerCase() || nameStripped === q) {
      return s
    }
  }

  return null
}

/**
 * Validate and normalize a tag label.
 */
export function validateTagLabel(raw: string): ValidateTagResult {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, error: 'Tag label is required' }
  }

  // Check for control characters before trimming (trim removes whitespace)
  if (/[\x00-\x1f\x7f]/.test(raw)) {
    return { valid: false, error: 'Tag label contains invalid characters' }
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    return { valid: false, error: 'Tag label is required' }
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Tag label must be 50 characters or less' }
  }

  return { valid: true, label: trimmed.toLowerCase() }
}

/**
 * Validate and normalize a tag parameter from a URL deep link.
 * Lowercases, trims, collapses internal whitespace, rejects control chars.
 */
export function validateTagParam(raw: string): ValidateTagResult {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, error: 'Tag parameter is required' }
  }

  // Check for control characters (U+0000-001F, U+007F-009F)
  if (/[\x00-\x1f\x7f-\x9f]/.test(raw)) {
    return { valid: false, error: 'Tag contains invalid characters' }
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    return { valid: false, error: 'Tag parameter is required' }
  }

  // Collapse internal whitespace
  const collapsed = trimmed.replace(/\s+/g, ' ')

  if (collapsed.length > 50) {
    return { valid: false, error: 'Tag must be 50 characters or less' }
  }

  return { valid: true, label: collapsed.toLowerCase() }
}
