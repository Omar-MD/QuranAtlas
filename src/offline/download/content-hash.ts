// Verifies a downloaded buffer against the hex sha256 a V2 manifest pinned
// for it. Hashes are compared lowercased and trimmed; anything that is not
// the exact expected digest (including malformed expected values) is a
// mismatch, never a silent accept.
export async function verifyContentHash(bytes: ArrayBuffer, expectedSha256Hex: string): Promise<boolean> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return actual === expectedSha256Hex.trim().toLowerCase()
}
