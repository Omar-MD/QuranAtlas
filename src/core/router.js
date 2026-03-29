/**
 * Hash-based router with lazy module loading.
 *
 * Routes are registered with a pattern (string prefix or RegExp) and an async
 * loader function that returns the page module. The router calls loader() on
 * match and passes parsed params to the module's init() function.
 *
 * All navigation emits 'router:navigate' on the event bus before loading.
 */

import { emit } from './events.js';

/**
 * @typedef {{ pattern: string | RegExp, loader: () => Promise<{ init: Function }> }} Route
 */

/** @type {Route[]} */
const routes = [];

/** @type {string | null} */
let currentPath = null;

/**
 * Register a route.
 * @param {string | RegExp} pattern - Matched against the hash path (leading # stripped)
 * @param {() => Promise<{ init: Function }>} loader - Dynamic import returning a module with init()
 */
export function registerRoute(pattern, loader) {
  routes.push({ pattern, loader });
}

/**
 * Navigate to the current hash or a given hash string.
 * @param {string} [hash] - Defaults to window.location.hash
 */
export async function navigate(hash) {
  const raw = (hash ?? window.location.hash).replace(/^#\/?/, '') || '/';
  if (raw === currentPath) return;

  currentPath = raw;
  emit('router:navigate', { path: raw });

  for (const route of routes) {
    const match =
      typeof route.pattern === 'string' ? raw.startsWith(route.pattern) : route.pattern.test(raw);

    if (match) {
      try {
        const mod = await route.loader();
        const params = parseParams(raw);
        await mod.init(params);
      } catch (err) {
        emit('router:error', { path: raw, error: err });
      }
      return;
    }
  }

  // No route matched — emit for error handling
  emit('router:not-found', { path: raw });
}

/**
 * Parse a hash path into a params object.
 * e.g. "s/2/255" → { surah: "2", ayah: "255" }
 * e.g. "t/favorites" → { tag: "favorites" }
 * @param {string} path
 * @returns {Record<string, string>}
 */
function parseParams(path) {
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 's') return { surah: parts[1] ?? '', ayah: parts[2] ?? '' };
  if (parts[0] === 't') return { tag: decodeURIComponent(parts[1] ?? '') };
  return {};
}

/**
 * Initialise the router — attach hashchange listener and handle the initial URL.
 */
export function initRouter() {
  window.addEventListener('hashchange', () => navigate(window.location.hash));
  navigate(window.location.hash);
}
