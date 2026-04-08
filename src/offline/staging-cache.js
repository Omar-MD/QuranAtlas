/**
 * Staging cache for dataset updates.
 * Isolates in-progress downloads from the live dataset cache.
 */

export const STAGING_CACHE = 'quran-dataset-staging'
const LIVE_CACHE = 'quran-dataset-v1'

/**
 * Stage a file into the staging cache.
 * @param {string} url
 * @param {Response} response
 */
export async function stageFile(url, response) {
  const cache = await caches.open(STAGING_CACHE)
  await cache.put(url, response)
}

/**
 * Get a staged response by URL.
 * @param {string} url
 * @returns {Promise<Response|undefined>}
 */
export async function getStagedResponse(url) {
  const cache = await caches.open(STAGING_CACHE)
  return cache.match(url)
}

/**
 * List all staged URLs.
 * @returns {Promise<string[]>}
 */
export async function listStagedUrls() {
  const cache = await caches.open(STAGING_CACHE)
  const keys = await cache.keys()
  return keys.map(req => req.url)
}

/**
 * Delete the staging cache entirely.
 */
export async function deleteStaging() {
  await caches.delete(STAGING_CACHE)
}

/**
 * Copy all staged entries to the live dataset cache.
 */
export async function copyToLive() {
  const staging = await caches.open(STAGING_CACHE)
  const live = await caches.open(LIVE_CACHE)
  const keys = await staging.keys()
  for (const request of keys) {
    const response = await staging.match(request.url || request)
    if (response) {
      await live.put(request.url || request, response)
    }
  }
}
