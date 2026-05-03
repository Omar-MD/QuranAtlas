/**
 * Hash-based router.
 * Handles route registration, navigation, and launch restore logic.
 *
 * Route contract: modules export `async init(params, hooks)` called by router.
 * params shape: { surah?, ayah?, tag? }
 */

import { emit } from './events'
import { Events } from './constants'
import { logger } from './logger'
import { persistLastSurface } from '../configure/state-last-surface.svelte'

export type RouteParams = Record<string, string>

export type RouteHooks = Record<string, unknown>

export type RouteModuleWithInit = { init?: (params: RouteParams, hooks: RouteHooks) => Promise<(() => void) | void | null | undefined> }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteLoaderResult = RouteModuleWithInit | (new (...args: any[]) => any) | ((...args: any[]) => any)

export type RouteHandler = {
  loader: () => Promise<RouteLoaderResult>
  hooks: RouteHooks
}

type RouteChangeCallback = (Component: unknown | null, params: RouteParams, hooks: RouteHooks) => void
let _onRouteChange: RouteChangeCallback | null = null

export function onRouteChange(cb: RouteChangeCallback): void {
  _onRouteChange = cb
}

const routes = new Map<string, RouteHandler>()
let currentCleanup: (() => void) | null = null
let lastHashHandled: string | null = null

/**
 * Register a route handler.
 */
export function register(
  pattern: string,
  loader: RouteHandler['loader'],
  hooks: RouteHooks = {}
): void {
  routes.set(pattern, { loader, hooks })
}

/**
 * Navigate to a hash path.
 */
export function navigate(hash: string, { replace = false } = {}): void {
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
 * Returns a cleanup function that removes listeners and cleans up current route.
 */
export function init(): () => void {
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
 */
// Param keys come from author-defined route patterns (e.g. `:surah`, `:value`),
// but CodeQL can't statically prove that — `params` is typed as a generic
// record and the keys flow from the regex match. Restrict writes to a
// conservative identifier shape (matches the `:name` syntax our route registry
// accepts) so the assignments below cannot mutate prototype slots even if a
// future caller passes attacker-controlled keys.
const SAFE_KEY = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function sanitizeParams(params: RouteParams): RouteParams | null {
  const sanitized: RouteParams = Object.create(null) as RouteParams
  for (const [key, value] of Object.entries(params)) {
    if (!SAFE_KEY.test(key)) {
      logger.warn('Router: rejected param with unsafe key shape:', { key })
      return null
    }

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
 */
async function handleRoute(hash: string): Promise<void> {
  lastHashHandled = hash
  if (!hash || hash === '#' || hash === '#/') {
    // Launch restore: check positions/settings for last surface
    // Phase 0: default to reader
    emit(Events.ROUTER_LAUNCH_RESTORE, {})
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

    // Svelte component routes: loader returns a function/class (the component constructor)
    if (typeof module === 'function') {
      const sanitizedParams = sanitizeParams(params)
      if (!sanitizedParams) {
        logger.error('Route rejected: invalid parameters', { route: hash })
        emit(Events.ROUTER_ROUTE_ERROR, { route: hash, error: new Error('Invalid parameters') })
        showNotFound()
        return
      }
      emit(Events.ROUTER_ROUTE_CHANGE, { hash })
      _onRouteChange?.(module, sanitizedParams, hooks)
      currentCleanup = () => { _onRouteChange?.(null, {}, {}) }
      await persistLastSurface(hash)
      return
    }

    const moduleWithInit = module as RouteModuleWithInit
    if (moduleWithInit.init) {
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
        currentCleanup = await moduleWithInit.init(sanitizedParams, hooks) ?? null
        await persistLastSurface(hash)
      } catch (error) {
        logger.error('Route failed:', {
          route: hash,
          error,
        })
        emit(Events.ROUTER_ROUTE_ERROR, { route: hash, error: error as Error })
      }
    }
  } else {
    showNotFound(hash)
  }
}

// persistLastSurface lives in state/last-surface.svelte.ts so router +
// review/Hub.svelte share a sole-writer path (audit R-08 / R-25 / CC-3).

/**
 * Render a user-visible not-found message.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function showNotFound(_hash?: string): void {
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
 */
function matchRoute(hash: string): { loader: RouteHandler['loader']; params: RouteParams; hooks: RouteHooks } | null {
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
 */
function extractParams(pattern: string, hash: string): RouteParams | null {
  const patternParts = pattern.replace('#', '').split('/').filter(Boolean)
  const hashParts = hash.replace('#', '').split('/').filter(Boolean)

  if (patternParts.length !== hashParts.length) {
    return null
  }

  const params: RouteParams = {}
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i]
    const h = hashParts[i]
    if (p === undefined || h === undefined) { return null }
    if (p.startsWith(':')) {
      params[p.slice(1)] = h
    } else if (p !== h) {
      return null
    }
  }

  return params
}

/**
 * Clear all registered routes. Test use only.
 */
export function clearRoutes(): void {
  routes.clear()
  lastHashHandled = null
}
