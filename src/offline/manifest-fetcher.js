/**
 * Fetch the dataset manifest.
 * Always bypasses cache to get latest version info.
 * Aborts after 10 seconds to prevent hanging requests.
 */

const TIMEOUT_MS = 10000

/**
 * Fetch and parse /dataset/manifest.json.
 * @returns {Promise<{ packageVersion: string, files: Array<{ url: string, sha256: string }> }>}
 * @throws {Error} on network error, timeout, or non-200 response
 */
export async function fetchManifest() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch('/dataset/manifest.json', {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Manifest fetch failed: ${response.status}`)
    }
    return response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}
