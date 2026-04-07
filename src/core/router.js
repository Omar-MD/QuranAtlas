/**
 * Hash-based router.
 * Handles route registration, navigation, and launch restore logic.
 *
 * Route contract: modules export `async init(params)` called by router.
 * params shape: { surah?, ayah?, tag? }
 */

import { emit } from './events.js'
import { put } from './db.js'
import { Events } from './constants.js'

const routes = new Map()
let currentModule = null

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
 * Sanitize route parameters to prevent XSS injection.
 * @param {object} params
 * @returns {object | null} Sanitized params or null if invalid
 */
function sanitizeParams(params) {
  const sanitized = {}
  for (const [key, value] of Object.entries(params)) {
    // Reject if value contains HTML/script tags or dangerous characters
    if (typeof value !== 'string') {
      sanitized[key] = value
      continue
    }

    // Check for XSS payloads: <script>, javascript:, data:, etc.
    const dangerous = /<script|javascript:|data:text\/html|on\w+=/i
    if (dangerous.test(value)) {
      console.warn('Router: rejected param with XSS pattern:', key)
      return null
    }

    // Basic HTML tag detection
    if (/<[^>]+>/i.test(value)) {
      console.warn('Router: rejected param with HTML tags:', key)
      return null
    }

    // Length limit to prevent DoS
    if (value.length > 100) {
      console.warn('Router: rejected oversized param:', key)
      return null
    }

    sanitized[key] = value
  }
  return sanitized
}

/**
 * Handle a route change.
 * @param {string} hash
 */
async function handleRoute(hash) {
  if (!hash || hash === '#' || hash === '#/') {
    // Launch restore: check positions/settings for last surface
    // Phase 0: default to reader
    emit(Events.ROUTER_LAUNCH_RESTORE)
    return
  }

  const match = matchRoute(hash)
  if (match) {
    const { loader, params } = match

    // Clean up previous module before loading new one
    if (currentModule && currentModule.cleanup) {
      currentModule.cleanup()
      currentModule = null
    }

    const module = await loader()
    currentModule = module

    await put('settings', { key: 'lastSurface', value: hash })

    if (module.init) {
      try {
        // Sanitize params before passing to module
        const sanitizedParams = sanitizeParams(params)
        if (sanitizedParams === null) {
          console.error(`Route ${hash} rejected: invalid parameters`)
          emit(Events.ROUTER_ROUTE_ERROR, { route: hash, error: new Error('Invalid parameters') })
          return
        }
        await module.init(sanitizedParams)
      } catch (error) {
        console.error(`Route ${hash} failed:`, error)
        emit(Events.ROUTER_ROUTE_ERROR, { route: hash, error })
      }
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
  const patternParts = pattern.replace('#', '').split('/').filter(Boolean)
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
 * Clear all registered routes. Test use only.
 */
export function clearRoutes() {
  routes.clear()
}
