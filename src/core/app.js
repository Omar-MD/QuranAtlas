/**
 * Application bootstrap.
 * Wires all modules together and initializes the app lifecycle.
 */

import { openDB } from './db.js'
import * as router from './router.js'

/**
 * Initialize the application.
 */
export async function init() {
  try {
    // Open database (creates stores if first run)
    await openDB()

    // Initialize router
    router.init()

    // Register Phase 1 routes
    router.register('#/s/:surah', () => import('../reader/index.js'))
    router.register('#/s/:surah/:ayah', () => import('../reader/index.js'))

    // Set initial theme
    applyThemeFromSettings()

    // Register service worker
    await registerServiceWorker()
  } catch (error) {
    console.error('Failed to initialize app:', error)
  }
}

/**
 * Apply saved theme or default to light.
 */
async function applyThemeFromSettings() {
  try {
    const { get } = await import('./db.js')
    const setting = await get('settings', 'theme')
    const theme = setting?.value || 'light'
    document.documentElement.setAttribute('data-theme', theme)
  } catch {
    // Default to light
    document.documentElement.setAttribute('data-theme', 'light')
  }
}

/**
 * Register the service worker.
 * Skipped in dev mode — SW is only meaningful in production builds.
 */
async function registerServiceWorker() {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      console.log('SW registered:', registration.scope)
    } catch (error) {
      console.error('SW registration failed:', error)
    }
  }
}

// Auto-init when loaded
init()
