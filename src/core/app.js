/**
 * Application bootstrap.
 * Wires all modules together and initializes the app lifecycle.
 */

import { openDB, get, getMostRecentPosition } from './db.js'
import * as router from './router.js'
import { emit, on } from './events.js'
import { Events } from './constants.js'

let unsubLaunchRestore = null
let unsubNavNavigate = null

/**
 * Initialize the application.
 */
export async function init() {
  performance.mark('app:start')

  try {
    // Open database (creates stores if first run)
    await openDB()
    performance.mark('db:open')

    // Initialize router
    router.init()
    performance.mark('router:resolve')

    // Listen for launch restore (clean up previous if re-init)
    if (unsubLaunchRestore) {
      unsubLaunchRestore()
    }
    unsubLaunchRestore = on(Events.ROUTER_LAUNCH_RESTORE, handleLaunchRestore)

    // Register Phase 1 routes
    router.register('#/s/:surah', () => import('../reader/index.js'))
    router.register('#/s/:surah/:ayah', () => import('../reader/index.js'))

    // Register Phase 2 routes
    router.register('#/review', () => import('../review/hub.js'))

    // Register Phase 3 routes
    router.register('#/settings', () => import('../settings/index.js'))
    router.register('#/about', () => import('../about/index.js'))
    router.register('#/t/:tag', () => import('../review/hub.js'))

    // Initialize nav panel
    const { init: initNav } = await import('../nav/index.js')
    await initNav()

    // Handle navigation events from nav panel
    if (unsubNavNavigate) { unsubNavNavigate() }
    unsubNavNavigate = on(Events.NAVIGATION_NAVIGATE, ({ surah, verse }) => {
      if (verse) {
        router.navigate(`#/s/${surah}/${verse}`)
      } else {
        router.navigate(`#/s/${surah}`)
      }
    })

    // Set initial theme
    applyThemeFromSettings()

    // Register service worker
    await registerServiceWorker()

    // Initialize PWA install prompt capture and restore activation state
    const offline = await import('../data/offline.js')
    offline.initInstallPrompt()
    await restoreActivationState(offline)
  } catch (error) {
    console.error('Failed to initialize app:', error)
    emit(Events.APP_INIT_ERROR, { error })
  }
}

/**
 * Apply saved theme or default to light.
 */
async function applyThemeFromSettings() {
  try {
    const setting = await get('settings', 'theme')
    const theme = setting?.value || 'light'
    document.documentElement.setAttribute('data-theme', theme)
  } catch {
    // Default to light
    document.documentElement.setAttribute('data-theme', 'light')
  }
}

/**
 * Handle launch restore: navigate to last-read position or default surah.
 */
async function handleLaunchRestore() {
  const lastSurface = await get('settings', 'lastSurface')
  if (lastSurface?.value) {
    router.navigate(lastSurface.value, { replace: true })
    return
  }
  const position = await getMostRecentPosition()
  if (position) {
    router.navigate(`#/s/${position.surah}/${position.verse}`, { replace: true })
  } else {
    router.navigate('#/s/1', { replace: true })
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
async function restoreActivationState(offline) {
  const state = await offline.getActivationState()

  if (state === 'downloading') {
    // Interrupted download — reset to none, user must re-tap
    await offline.cancelDownload()
  }

  // If no cached corpus and online, show download UI
  if (state === 'none' && navigator.onLine) {
    emit(Events.APP_READY_FOR_DOWNLOAD)
  }
}

// Auto-init when loaded
init()
