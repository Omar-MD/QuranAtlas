/**
 * SHA-256 verification for dataset file integrity.
 * Uses SubtleCrypto and works in both SW and main thread contexts.
 */

/**
 * Verify an ArrayBuffer against an expected SHA-256 hex digest.
 * @param {ArrayBuffer} arrayBuffer - file content
 * @param {string} expectedHex - expected lowercase hex SHA-256 digest
 * @returns {Promise<boolean>}
 */
export async function verify(arrayBuffer, expectedHex) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = new Uint8Array(hashBuffer)
  let hex = ''
  for (const byte of hashArray) {
    hex += byte.toString(16).padStart(2, '0')
  }
  return hex === expectedHex.toLowerCase()
}
