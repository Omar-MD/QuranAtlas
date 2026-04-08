/**
 * Dataset update orchestrator for service worker activate.
 * Manages check, download, verify, and apply lifecycle.
 */

import { fetchManifest } from './manifest-fetcher.js'
import { verify } from './sha256-verifier.js'
import { stageFile, getStagedResponse, deleteStaging, copyToLive } from './staging-cache.js'

const DB_NAME = 'quran-atlas'
const DB_VERSION = 1
const DATASET_META_ID = 'current'

function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbGet(storeName, key) {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => {
      db.close()
      resolve(request.result)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

async function idbPut(storeName, value) {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(value)
    request.onsuccess = () => {
      db.close()
      resolve()
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

async function postToClients(type, payload = {}) {
  try {
    const allClients = await self.clients.matchAll()
    for (const client of allClients) {
      client.postMessage({ type, ...payload })
    }
  } catch {
    // Ignore client posting errors in SW context.
  }
}

async function setState(stateObj) {
  await idbPut('activationState', { id: 'current', status: 'cached', ...stateObj })
  await postToClients(`DATASET_${stateObj.state.toUpperCase().replace(/-/g, '_')}`, stateObj)
}

function parseMajor(version) {
  return parseInt(String(version || '').split('.')[0], 10) || 0
}

export async function checkForUpdate() {
  const meta = await idbGet('datasetMeta', DATASET_META_ID)
  if (!meta || !meta.version) {
    return
  }

  let manifest
  try {
    manifest = await fetchManifest()
  } catch {
    return
  }

  if (manifest.packageVersion === meta.version) {
    return
  }

  const isMajor = parseMajor(manifest.packageVersion) > parseMajor(meta.version)
  const targetVersion = manifest.packageVersion
  // manifest.files is { "surah/001.json": "sha256hex", ... } (build-dataset.js format)
  const filesToDownload = manifest.files && typeof manifest.files === 'object' && !Array.isArray(manifest.files)
    ? Object.entries(manifest.files).map(([filename, sha256]) => ({
        url: `/dataset/${filename}`,
        sha256,
      }))
    : []

  await setState({ state: 'downloading', version: targetVersion, progress: 0 })

  const liveCache = await caches.open('quran-dataset-v1')

  let downloaded = 0
  for (const file of filesToDownload) {
    const staged = await getStagedResponse(file.url)
    if (staged) {
      downloaded++
      continue
    }

    const liveResponse = await liveCache.match(file.url)
    if (liveResponse) {
      const liveBuffer = await liveResponse.clone().arrayBuffer()
      const liveMatches = await verify(liveBuffer, file.sha256)
      if (liveMatches) {
        downloaded++
        await setState({
          state: 'downloading',
          version: targetVersion,
          progress: filesToDownload.length ? downloaded / filesToDownload.length : 1,
        })
        continue
      }
    }

    let response
    try {
      response = await fetch(file.url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      await setState({ state: 'failed', version: targetVersion, error: error.message })
      await deleteStaging()
      return
    }

    const buffer = await response.clone().arrayBuffer()
    const valid = await verify(buffer, file.sha256)
    if (!valid) {
      await setState({
        state: 'failed',
        version: targetVersion,
        error: `SHA-256 mismatch for ${file.url}`,
      })
      await deleteStaging()
      return
    }

    await stageFile(file.url, response)
    downloaded++
    await setState({
      state: 'downloading',
      version: targetVersion,
      progress: filesToDownload.length ? downloaded / filesToDownload.length : 1,
    })
  }

  await setState({ state: 'verifying', version: targetVersion })

  if (isMajor) {
    await setState({
      state: 'pending-confirmation',
      version: targetVersion,
      stagedAt: Date.now(),
    })
    await postToClients('DATASET_PENDING_CONFIRMATION', {
      from: meta.version,
      to: targetVersion,
    })
    return
  }

  await applyUpdate()
}

export async function applyUpdate() {
  const state = await idbGet('activationState', 'current')
  const version = state?.version

  await setState({ state: 'applying', version })

  await copyToLive()
  await idbPut('datasetMeta', { id: DATASET_META_ID, version })
  await deleteStaging()

  await setState({ state: 'idle', version })
  await postToClients('DATASET_APPLIED', { version })
}
