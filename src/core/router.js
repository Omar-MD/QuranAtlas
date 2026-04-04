/**
 * Hash-based router.
 * Handles route registration, navigation, and launch restore logic.
 *
 * Route contract: modules export `async init(params)` called by router.
 * params shape: { surah?, ayah?, tag? }
 */

import { emit } from './events.js'

const routes = new Map()

/**
 * Register a route handler.
 * @param {string} pattern - Route pattern (e.g., '#/s/:surah')
 * @param {Function} loader - Async function that returns the module's init()
 */
export function register(pattern, loader) {
  routes.set(pattern, loader)
}

/**
 * Navigate to a hash path.
 * @param {string} hash - Hash path (e.g., '#/s/2/255')
 * @param {object} [options]
 * @param {boolean} [options.replace] - Use replaceState instead of pushState
 */
export function navigate(hash, { replace = false } = {}) {
  const url = hash.startsWith('#') ? hash : `#${hash}`
  if (replace) {
    history.replaceState(null, '', url)
  } else {
    history.pushState(null, '', url)
  }
  handleRoute(url)
}

/**
 * Initialize the router. Call once on app start.
 */
export function init() {
  window.addEventListener('hashchange', () => handleRoute(location.hash))
  window.addEventListener('popstate', () => handleRoute(location.hash))
  handleRoute(location.hash)
}

/**
 * Handle a route change.
 * @param {string} hash
 */
async function handleRoute(hash) {
  if (!hash || hash === '#' || hash === '#/') {
    // Launch restore: check positions/settings for last surface
    // Phase 0: default to reader
    emit('router:launch-restore')
    return
  }

  const match = matchRoute(hash)
  if (match) {
    const { loader, params } = match
    const module = await loader()
    if (module.init) {
      await module.init(params)
    }
  }
}

/**
 * Match a hash against registered routes.
 * @param {string} hash
 * @returns {{ loader: Function, params: object } | null}
 */
function matchRoute(hash) {
  for (const [pattern, loader] of routes) {
    const params = extractParams(pattern, hash)
    if (params) {
      return { loader, params }
    }
  }
  return null
}

/**
 * Extract params from a hash based on a pattern.
 * Pattern: '#/s/:surah/:ayah' → { surah: '2', ayah: '255' }
 * @param {string} pattern
 * @param {string} hash
 * @returns {object | null}
 */
function extractParams(pattern, hash) {
  const patternParts = pattern.split('/').filter(Boolean)
  const hashParts = hash.replace('#', '').split('/').filter(Boolean)

  if (patternParts.length !== hashParts.length) {
    return null
  }

  const params = {}
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i]
    if (p.startsWith(':')) {
      params[p.slice(1)] = hashParts[i]
    } else if (p !== hashParts[i]) {
      return null
    }
  }

  return params
}

/**
 * Get the most recently saved reading position.
 * @returns {Promise<{surah: number, verse: number} | null>}
 */
export async function getMostRecentPosition() {
  try {
    const { getDb } = await import('./db.js')
    const db = await getDb()
    const tx = db.transaction('positions', 'readonly')
    const store = tx.objectStore('positions')
    const request = store.getAll()

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const positions = request.result || []
        if (positions.length === 0) {
          resolve(null)
          return
        }
        // Find the most recent by savedAt
        const mostRecent = positions.reduce((latest, pos) => {
          return pos.savedAt > latest.savedAt ? pos : latest
        }, positions[0])
        resolve(mostRecent)
      }
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}
