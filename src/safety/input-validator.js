/**
 * Input validation for navigation and tag parameters.
 * Permitted cross-module import (safety exception).
 */

/**
 * Parse navigation input.
 * Accepts: "2", "2:255", "Al-Baqarah", "Baqarah 255"
 * @param {string} input
 * @returns {{ surah?: number, verse?: number, valid: boolean, error?: string }}
 */
export function parseNavigationInput(input) {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Input is required' }
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return { valid: false, error: 'Input is empty' }
  }

  // Numeric surah: "2" or "2:255"
  const numericMatch = trimmed.match(/^(\d+)(?::(\d+))?$/)
  if (numericMatch) {
    const surah = parseInt(numericMatch[1], 10)
    const verse = numericMatch[2] ? parseInt(numericMatch[2], 10) : undefined

    if (surah < 1 || surah > 114) {
      return { valid: false, error: `Surah ${surah} does not exist` }
    }
    if (verse !== undefined && (verse < 1 || !Number.isInteger(verse))) {
      return { valid: false, error: `Invalid verse number: ${verse}` }
    }

    return { surah, verse, valid: true }
  }

  // Surah name: "Al-Baqarah" or "Baqarah 255"
  const nameMatch = trimmed.match(/^([a-zA-Z\s-]+?)(?:\s+(\d+))?$/)
  if (nameMatch) {
    // Phase 1: validate against known surah names
    return { valid: false, error: `Unknown surah: "${trimmed}"` }
  }

  return { valid: false, error: `Invalid input: "${trimmed}"` }
}
