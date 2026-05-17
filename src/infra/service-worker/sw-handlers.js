const RETRY_DELAYS = [1000, 2000, 5000]
const MAX_RETRIES = 3
const MANIFEST_FETCH_TIMEOUT_MS = 10000

function postToAll(clients, type, payload = {}) {
  for (const client of clients) {
    try {
      client.postMessage({ type, ...payload })
    } catch (error) {
      console.warn('postToAll: failed to notify client', client.id, error.message)
    }
  }
}

function withTimeout(promise, timeoutMs, errorMessage) {
  let timeoutId = null

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
  })
}

async function getManifestMembers(fetchFn) {
  let manifestResponse
  try {
    manifestResponse = await withTimeout(
      fetchFn('/dataset/manifest.json', { cache: 'no-store' }),
      MANIFEST_FETCH_TIMEOUT_MS,
      'manifest fetch timed out'
    )
  } catch {
    return null
  }

  if (!manifestResponse.ok) {
    return null
  }

  let manifest
  try {
    manifest = await manifestResponse.json()
  } catch {
    return null
  }

  if (!Array.isArray(manifest.files)) {
    return null
  }

  const members = new Set()
  for (const file of manifest.files) {
    if (!file || typeof file.path !== 'string' || !file.path) {
      return null
    }
    members.add(`/dataset/${file.path}`)
  }
  return members
}

export async function fetchWithRetry(url, fetchFn, attempt = 0) {
  try {
    const response = await fetchFn(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      throw error
    }

    const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
    await new Promise(resolve => setTimeout(resolve, delay))
    return fetchWithRetry(url, fetchFn, attempt + 1)
  }
}

export async function handleCacheDataset(deps, urls) {
  const {
    cacheName,
    cacheOpen,
    clientsMatchAll,
    fetchFn,
  } = deps

  const cache = await cacheOpen(cacheName)
  const clients = await clientsMatchAll()
  const manifestMembers = await getManifestMembers(fetchFn)

  if (!manifestMembers) {
    postToAll(clients, 'DATASET_ERROR', {
      url: '/dataset/manifest.json',
      error: 'manifest unavailable: aborting cache',
    })
    return
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    if (!manifestMembers.has(url)) {
      postToAll(clients, 'DATASET_ERROR', {
        url,
        error: 'url not listed in manifest: aborting cache',
      })
      return
    }

    const cached = await cache.match(url)
    if (cached) {
      postToAll(clients, 'DATASET_PROGRESS', { cached: i + 1, total: urls.length })
      continue
    }

    try {
      const response = await fetchWithRetry(url, fetchFn)
      await cache.put(url, response)
    } catch (error) {
      postToAll(clients, 'DATASET_ERROR', { url, error: error.message })
      return
    }

    postToAll(clients, 'DATASET_PROGRESS', { cached: i + 1, total: urls.length })
  }

  postToAll(clients, 'DATASET_COMPLETE')
}

export async function cleanupStaleCaches(deps) {
  const { expectedCaches, preservePrefixes, cachesKeys, cachesDelete } = deps
  const allCacheNames = await cachesKeys()

  // Preserve every cache whose name matches a registered prefix from
  // `core/sw/route-defs.ts::CACHE_PREFIXES` (workbox internals, per-asset-class
  // partitions). Names in `expectedCaches` are also preserved. Default to a
  // minimal allowlist if `preservePrefixes` was not passed (back-compat for
  // tests).
  const prefixes = preservePrefixes ?? ['workbox-precache', 'qa-fonts-', 'qa-pages-', 'qa-search-']
  const isPreserved = (name) =>
    prefixes.some((p) => name.startsWith(p)) || expectedCaches.has(name)

  await Promise.all(
    allCacheNames
      .filter(name => !isPreserved(name))
      .map(name => cachesDelete(name))
  )
}

export async function handlePurgeCache(deps) {
  const { cacheName, cachesDelete, clientsMatchAll } = deps

  await cachesDelete(cacheName)
  const clients = await clientsMatchAll()
  postToAll(clients, 'DATASET_PURGED')
}
