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

async function getHashMap(fetchFn) {
  const hashMap = {}

  try {
    const manifestResponse = await withTimeout(
      fetchFn('/dataset/manifest.json', { cache: 'no-store' }),
      MANIFEST_FETCH_TIMEOUT_MS,
      'manifest fetch timed out'
    )
    if (!manifestResponse.ok) {
      return hashMap
    }

    const manifest = await manifestResponse.json()
    if (manifest.files && typeof manifest.files === 'object' && !Array.isArray(manifest.files)) {
      for (const [filename, sha256] of Object.entries(manifest.files)) {
        hashMap[`/dataset/${filename}`] = sha256
      }
    }
  } catch {
    console.warn('handleCacheDataset: manifest fetch failed, skipping SHA-256 verification')
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
  } = deps

  const cache = await cacheOpen(cacheName)
  const clients = await clientsMatchAll()
  const hashMap = await getHashMap(fetchFn)

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const expectedHash = hashMap[url]
    const cached = await cache.match(url)

    if (cached) {
      if (expectedHash) {
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
      } else {
        postToAll(clients, 'DATASET_PROGRESS', { cached: i + 1, total: urls.length })
        continue
      }
    }

    try {
      const response = await fetchWithRetry(url, fetchFn)
      if (expectedHash) {
        const buffer = await response.clone().arrayBuffer()
        const valid = await verifyFn(buffer, expectedHash)
        if (!valid) {
          postToAll(clients, 'DATASET_ERROR', {
            url,
            error: 'SHA-256 mismatch: file may be corrupted in transit',
          })
          return
        }
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

  await Promise.all(
    allCacheNames
      .filter(name => !name.startsWith('workbox-precache') && !expectedCaches.has(name))
      .map(name => cachesDelete(name))
  )
}

export async function handlePurgeCache(deps) {
  const { cacheName, cachesDelete, clientsMatchAll } = deps

  await cachesDelete(cacheName)
  const clients = await clientsMatchAll()
  postToAll(clients, 'DATASET_PURGED')
}