/**
 * Dataset update orchestrator for service worker activate.
 * Manages check, download, verify, and apply lifecycle.
 */

import { CACHE_DATASET } from '../../core/constants.js'
import { fetchManifest } from './manifest-fetcher.js'
import { verify } from './sha256-verifier.js'
import { stageFile, getStagedResponse, deleteStaging, copyToLive } from './staging-cache.js'
import { DB_NAME, DB_VERSION } from '../../core/db/migrations.js'

const DATASET_META_ID = 'current'

/** Session-scoped cached IDB connection. Cleared on versionchange. */
let _db = null

async function getDb() {
  if (_db) {
    return _db
  }
  _db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  _db.addEventListener('versionchange', () => {
    _db.close()
    _db = null
  })
  return _db
}

function closeDb() {
  if (_db) {
    _db.close()
    _db = null
  }
}

async function idbGet(storeName, key) {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbPut(storeName, value) {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(value)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function postToClients(type, payload = {}) {
  try {
    const allClients = await self.clients.matchAll()
    for (const client of allClients) {
      try {
        client.postMessage({ type, ...payload })
      } catch (error) {
        console.warn('postToClients: failed to notify client', client.id, error.message)
      }
    }
  } catch (error) {
    console.warn('postToClients: clients.matchAll() failed:', error.message)
  }
}

function getClientMessageType(status) {
  switch (status) {
    case 'downloading':
      return 'DATASET_DOWNLOADING'
    case 'pending-confirmation':
      return 'DATASET_PENDING_CONFIRMATION'
    case 'failed':
      return 'DATASET_UPDATE_FAILED'
    default:
      return `DATASET_${status.toUpperCase().replace(/-/g, '_')}`
  }
}

async function setState(stateObj) {
  const record = { id: 'current', status: stateObj.status }
  if (stateObj.version !== undefined) {
    record.version = stateObj.version
  }
  if (stateObj.progress !== undefined) {
    record.progress = stateObj.progress
  }
  if (stateObj.error !== undefined) {
    record.error = stateObj.error
  }
  if (stateObj.stagedAt !== undefined) {
    record.stagedAt = stateObj.stagedAt
  }
  await idbPut('activationState', record)
  await postToClients(getClientMessageType(stateObj.status), stateObj)
}

function parseMajor(version) {
  return parseInt(String(version || '').split('.')[0], 10) || 0
}

export async function checkForUpdate() {
  try {
    const meta = await idbGet('datasetMeta', DATASET_META_ID)
    if (!meta || !meta.version) {
      return
    }

    let manifest
    try {
      manifest = await fetchManifest()
    } catch (error) {
      console.warn('Dataset update check failed:', error.message)
      return
    }

    if (manifest.packageVersion === meta.version) {
      return
    }

    const isMajor = parseMajor(manifest.packageVersion) > parseMajor(meta.version)
    const targetVersion = manifest.packageVersion
    // manifest.files is { "riwayat/hafs/001.json": "sha256hex", ... } (build-riwayat.mjs format)
    const filesToDownload = manifest.files && typeof manifest.files === 'object' && !Array.isArray(manifest.files)
      ? Object.entries(manifest.files).map(([filename, sha256]) => ({
          url: `/dataset/${filename}`,
          sha256,
        }))
      : []

    await postToClients('DATASET_UPDATE_AVAILABLE', {
      from: meta.version,
      to: targetVersion,
    })

    await setState({ status: 'downloading', version: targetVersion, progress: 0 })

    const liveCache = await caches.open(CACHE_DATASET)

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
            status: 'downloading',
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
        await setState({ status: 'failed', version: targetVersion, error: error.message })
        await deleteStaging()
        return
      }

      const buffer = await response.clone().arrayBuffer()
      const valid = await verify(buffer, file.sha256)
      if (!valid) {
        await setState({
          status: 'failed',
          version: targetVersion,
          error: `SHA-256 mismatch for ${file.url}`,
        })
        await deleteStaging()
        return
      }

      await stageFile(file.url, response)
      downloaded++
      await setState({
        status: 'downloading',
        version: targetVersion,
        progress: filesToDownload.length ? downloaded / filesToDownload.length : 1,
      })
    }

    await setState({ status: 'verifying', version: targetVersion })

    if (isMajor) {
      await setState({
        status: 'pending-confirmation',
        version: targetVersion,
        stagedAt: Date.now(),
        from: meta.version,
        to: targetVersion,
      })
      return
    }

    await applyUpdate()
  } finally {
    closeDb()
  }
}

export async function applyUpdate() {
  try {
    const state = await idbGet('activationState', 'current')
    const version = state?.version

    await setState({ status: 'applying', version })

    await copyToLive()
    await idbPut('datasetMeta', { id: DATASET_META_ID, version })
    await deleteStaging()

    await setState({ status: 'idle', version })
    await postToClients('DATASET_APPLIED', { version })
  } finally {
    closeDb()
  }
}
