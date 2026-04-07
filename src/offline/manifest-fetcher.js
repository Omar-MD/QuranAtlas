/**
 * Fetch the dataset manifest.
 * Always bypasses cache to get latest version info.
 */

/**
 * Fetch and parse /dataset/manifest.json.
 * @returns {Promise<{ packageVersion: string, files: Array<{ url: string, sha256: string }> }>}
 * @throws {Error} on network error or non-200 response
 */
export async function fetchManifest() {
  const response = await fetch('/dataset/manifest.json', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Manifest fetch failed: ${response.status}`)
  }
  return response.json()
}
