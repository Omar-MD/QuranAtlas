/**
 * Application bootstrap.
 * Wires all modules together and initializes the app lifecycle.
 */

import { openDB } from './db.js'
import * as router from './router.js'
import { initInstallPrompt, getActivationState, startDownload } from '../data/offline.js'
import { emit } from './events.js'

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

    // Initialize PWA install prompt capture
    initInstallPrompt()

    // Restore activation state
    await restoreActivationState()
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

/**
 * Restore activation state and re-download if interrupted.
 */
async function restoreActivationState() {
  const state = await getActivationState()

  if (state === 'downloading') {
    // Interrupted download — reset to none, user must re-tap
    const { cancelDownload } = await import('../data/offline.js')
    await cancelDownload()
  }

  // If no cached corpus and online, show download UI
  if (state === 'none' && navigator.onLine) {
    emit('app:ready-for-download')
  }
}

// Auto-init when loaded
init()
