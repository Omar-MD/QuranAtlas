/**
 * Input validation for navigation and tag parameters.
 * Permitted cross-module import (safety exception).
 */

/**
 * Parse navigation input.
 * Accepts: "2", "2:255", "Al-Baqarah", "Baqarah 255"
 * @param {string} input
 * @param {Array<{n: number, name: string, count: number}>} [surahs] - Surah list for name lookup and verse validation
 * @returns {{ surah?: number, verse?: number, valid: boolean, error?: string }}
 */
export function parseNavigationInput(input, surahs) {
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
    const surah = parseInt(numericMatch[1], 10)
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
    const rawName = nameMatch[1].trim()
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
 * @param {string} query
 * @param {Array<{n: number, name: string}>} surahs
 * @returns {{n: number, name: string, count: number} | null}
 */
function findSurahByName(query, surahs) {
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
 * @param {string} raw
 * @returns {{ valid: boolean, label?: string, error?: string }}
 */
export function validateTagLabel(raw) {
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
