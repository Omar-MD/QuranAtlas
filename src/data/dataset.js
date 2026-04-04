/**
 * Corpus access layer.
 * Deep module: callers never know whether data comes from cache or network.
 */

/**
 * Get a single surah by number.
 * @param {number} n - Surah number (1-114)
 * @returns {Promise<object>}
 */
export async function getSurah(_n) {
  // Phase 1: implement cache/network logic
  throw new Error('getSurah not yet implemented')
}

/**
 * Get all surahs metadata.
 * @returns {Promise<Array>}
 */
export async function getSurahs() {
  // Phase 1: implement
  throw new Error('getSurahs not yet implemented')
}
