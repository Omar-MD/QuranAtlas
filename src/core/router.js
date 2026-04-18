/**
 * Hash-based router.
 * Handles route registration, navigation, and launch restore logic.
 *
 * Route contract: modules export `async init(params, hooks)` called by router.
 * params shape: { surah?, ayah?, tag? }
 */

import { emit } from './events.js'
import { put } from './db.js'
import { Events } from './constants.js'
import { logger } from './logger.js'

const routes = new Map()
let currentCleanup = null
let lastHashHandled = null

/**
 * Register a route handler.
 * @param {string} pattern - Route pattern (e.g., '#/s/:surah')
 * @param {Function} loader - Async function that returns the module's init()
 * @param {object} [hooks] - Dependencies injected by the app wiring layer
 */
export function register(pattern, loader, hooks = {}) {
  routes.set(pattern, { loader, hooks })
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
 * @returns {Function} cleanup function that removes listeners and cleans up current route
 */
export function init() {
  const onHashChange = () => handleRoute(location.hash)
  const onPopState = () => {
    // Skip re-render if the hash is unchanged (e.g. a modal popped its own history entry)
    if (location.hash !== lastHashHandled) {
      handleRoute(location.hash)
    }
  }
  window.addEventListener('hashchange', onHashChange)
  window.addEventListener('popstate', onPopState)
  handleRoute(location.hash)

  return () => {
    window.removeEventListener('hashchange', onHashChange)
    window.removeEventListener('popstate', onPopState)
    if (currentCleanup) { currentCleanup(); currentCleanup = null }
  }
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
    const dangerous = /<script|javascript:|vbscript:|data:|expression\(|url\(|import\(|on\w+=/i
    if (dangerous.test(value)) {
      logger.warn('Router: rejected param with XSS pattern:', { key })
      return null
    }

    // Basic HTML tag detection
    if (/<[^>]+>/i.test(value)) {
      logger.warn('Router: rejected param with HTML tags:', { key })
      return null
    }

    // Length limit to prevent DoS
    if (value.length > 100) {
      logger.warn('Router: rejected oversized param:', { key })
      return null
    }

    // Reject params containing protocol schemes (e.g. https://, ftp://)
    if (value.includes('://')) {
      logger.warn('Router: rejected param with protocol scheme:', { key })
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
  lastHashHandled = hash
  if (!hash || hash === '#' || hash === '#/') {
    // Launch restore: check positions/settings for last surface
    // Phase 0: default to reader
    emit(Events.ROUTER_LAUNCH_RESTORE)
    return
  }

  const match = matchRoute(hash)
  if (match) {
    const { loader, params, hooks } = match

    // Clean up previous route module
    if (currentCleanup) {
      currentCleanup()
      currentCleanup = null
    }

    const module = await loader()

    if (module.init) {
      try {
        // Sanitize params before passing to module
        const sanitizedParams = sanitizeParams(params)
        if (sanitizedParams === null) {
          logger.error('Route rejected: invalid parameters', { route: hash })
          emit(Events.ROUTER_ROUTE_ERROR, { route: hash, error: new Error('Invalid parameters') })
          showNotFound()
          return
        }
        emit(Events.ROUTER_ROUTE_CHANGE, { hash })
        currentCleanup = await module.init(sanitizedParams, hooks) ?? null
        await put('settings', { key: 'lastSurface', value: hash })
      } catch (error) {
        logger.error('Route failed:', {
          route: hash,
          error,
        })
        emit(Events.ROUTER_ROUTE_ERROR, { route: hash, error })
      }
    }
  } else {
    showNotFound(hash)
  }
}

/**
 * Render a user-visible not-found message.
 * @param {string} [hash] - The unmatched hash for diagnostic display
 */
function showNotFound(_hash) {
  const mainContent = document.getElementById('main-content')
  if (!mainContent) { return }

  while (mainContent.firstChild) { mainContent.removeChild(mainContent.firstChild) }

  const wrapper = document.createElement('div')
  wrapper.className = 'qa-error-state'

  const msg = document.createElement('p')
  msg.textContent = `Page not found.`
  wrapper.appendChild(msg)

  const link = document.createElement('a')
  link.href = '#/s/1'
  link.textContent = 'Go to Al-Fatihah (Surah 1)'
  wrapper.appendChild(link)

  mainContent.appendChild(wrapper)
}

/**
 * Match a hash against registered routes.
 * @param {string} hash
 * @returns {{ loader: Function, params: object, hooks: object } | null}
 */
function matchRoute(hash) {
  for (const [pattern, { loader, hooks }] of routes) {
    const params = extractParams(pattern, hash)
    if (params) {
      return { loader, params, hooks }
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
  lastHashHandled = null
}
