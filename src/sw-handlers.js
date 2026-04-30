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

async function deleteCachedEntry(cache, url) {
  try {
    await cache.delete(url)
  } catch (error) {
    console.warn('handleCacheDataset: failed to delete cached entry', url, error.message)
  }
}

// Returns the {url → sha256} map only when the fetched manifest body itself
// hashes to expectedManifestDigest (the digest baked into the bundle at
// build time). Any failure — fetch error, timeout, !ok response, missing
// or mismatched expected digest, malformed JSON — returns null, which
// callers MUST treat as fail-closed (do not write anything to cache).
async function getHashMap(fetchFn, verifyFn, expectedManifestDigest) {
  if (!expectedManifestDigest) {
    return null
  }

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

  let manifestBuffer
  try {
    manifestBuffer = await manifestResponse.clone().arrayBuffer()
  } catch {
    return null
  }

  let manifestValid
  try {
    manifestValid = await verifyFn(manifestBuffer, expectedManifestDigest)
  } catch {
    return null
  }
  if (!manifestValid) {
    return null
  }

  let manifest
  try {
    manifest = await manifestResponse.json()
  } catch {
    return null
  }

  if (!manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) {
    return null
  }

  const hashMap = {}
  for (const [filename, sha256] of Object.entries(manifest.files)) {
    hashMap[`/dataset/${filename}`] = sha256
  }
  return hashMap
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
    verifyFn,
    expectedManifestDigest,
  } = deps

  const cache = await cacheOpen(cacheName)
  const clients = await clientsMatchAll()
  const hashMap = await getHashMap(fetchFn, verifyFn, expectedManifestDigest)

  if (!hashMap) {
    postToAll(clients, 'DATASET_ERROR', {
      url: '/dataset/manifest.json',
      error: 'manifest verification failed: aborting cache (chain of trust broken)',
    })
    return
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const expectedHash = hashMap[url]

    if (!expectedHash) {
      postToAll(clients, 'DATASET_ERROR', {
        url,
        error: 'url not listed in verified manifest: aborting cache',
      })
      return
    }

    const cached = await cache.match(url)
    if (cached) {
      let valid = false
      try {
        const buffer = await cached.clone().arrayBuffer()
        valid = await verifyFn(buffer, expectedHash)
      } catch (error) {
        console.warn('handleCacheDataset: cached verification failed, re-downloading', url, error.message)
      }

      if (valid) {
        postToAll(clients, 'DATASET_PROGRESS', { cached: i + 1, total: urls.length })
        continue
      }

      await deleteCachedEntry(cache, url)
    }

    try {
      const response = await fetchWithRetry(url, fetchFn)
      const buffer = await response.clone().arrayBuffer()
      const valid = await verifyFn(buffer, expectedHash)
      if (!valid) {
        postToAll(clients, 'DATASET_ERROR', {
          url,
          error: 'SHA-256 mismatch: file may be corrupted in transit',
        })
        return
      }

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
  const { expectedCaches, cachesKeys, cachesDelete } = deps
  const allCacheNames = await cachesKeys()

  // Preserve workbox-precache* (Workbox internal) and per-feature
  // partitioned caches by name pattern. Audio caches are per-reciter
  // (qa-audio-{reciter}-v1, qa-audio-timing-{reciter}-v1) and the meta
  // cache (qa-audio-meta-v1); fonts cache is qa-fonts-v1. None of these
  // are in `expectedCaches` because the activate handler doesn't enumerate
  // every reciter — they're allowlisted by prefix instead.
  const PRESERVE_PREFIXES = ['workbox-precache', 'qa-audio-', 'qa-fonts-']
  const isPreserved = (name) =>
    PRESERVE_PREFIXES.some((p) => name.startsWith(p)) || expectedCaches.has(name)

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