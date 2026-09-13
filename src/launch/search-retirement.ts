import { isReaderDatasetPath } from '../../shared/reader-assets/dataset-policy.mjs'
import { openReactDb } from '../storage/db'

// Copied from the retired shared/search/manifest.ts (SEARCH_PACK_CACHE_PREFIX)
// so retirement can identify installed search-pack caches without importing any
// removed Search module. Pack cache names are `${prefix}-${contentHash}`.
const SEARCH_PACK_CACHE_PREFIX = 'quran-atlas-search-pack-'

/**
 * Startup retirement of removed Search data. Opens the current Dexie database
 * so the declarative version 11 upgrade (dropping `savedSearches`) actually
 * runs on launches that never mount a Dexie surface. Cache retirement proceeds
 * independently so a blocked database does not retain obsolete downloaded data.
 *
 * Runs once per launch resolution, is idempotent, and never rejects. A blocked
 * upgrade is surfaced by the shared database status so the user can close old tabs.
 * Cleanup retries naturally on later launches; no irreversible "complete"
 * marker is written.
 */
export async function retireSearchData(): Promise<void> {
  // Cache reclamation must not wait for a database upgrade blocked by another tab.
  const cacheCleanup = deleteRetiredCaches()
  try {
    // Native reader reads use short-lived versionless connections, so this open
    // runs the Dexie upgrade chain (10 -> 11) once other tabs have released it.
    // Dexie versions are logical schema versions, never the native DB version.
    await openReactDb()
  } catch {
    // A blocked upgrade (an older tab still open) resolves when that tab
    // closes; the next launch reopens and retries the drop.
  }
  await cacheCleanup
}

async function deleteRetiredCaches(): Promise<void> {
  if (typeof caches === 'undefined') return
  try {
    const names = await caches.keys()
    await Promise.all([
      ...names.filter((name) => name.startsWith(SEARCH_PACK_CACHE_PREFIX)).map((name) => caches.delete(name)),
      deleteRetiredEntriesIn(names),
    ])
  } catch {
    // Cache Storage may be unavailable or evicting; retire on a later launch.
  }
}

async function deleteRetiredEntriesIn(names: string[]): Promise<void> {
  // Current and earlier versions of this app-owned dataset cache can hold
  // retired entries. Do not touch other applications or shell precaches.
  const datasetCaches = names.filter((name) => /^quran-atlas-runtime-dataset-v\d+$/.test(name))
  await Promise.all(
    datasetCaches.map(async (name) => {
      const cache = await caches.open(name)
      const requests = await cache.keys()
      await Promise.all(
        requests
          .filter((request) => {
            const url = new URL(request.url)
            return url.origin === location.origin && !isReaderDatasetPath(url.pathname)
          })
          .map((request) => cache.delete(request)),
      )
    }),
  )
}
