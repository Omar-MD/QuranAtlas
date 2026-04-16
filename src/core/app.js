/**
 * Application bootstrap.
 * Wires all modules together and initializes the app lifecycle.
 */

import { openDB, get, getMostRecentPosition } from './db.js'
import * as router from './router.js'
import { emit, on } from './events.js'
import { Events } from './constants.js'
import { logger } from './logger.js'
import { init as initSafetySync } from '../safety/sync.js'
import { initInstallListener } from '../about/pwa-install.js'
import { initTheme } from '../settings/theme.js'
import { initFontSize } from '../settings/font-size.js'
import { initSettingsPanel } from '../settings/panel.js'
import { initAmbientDock } from '../nav/ambient-dock.js'
import { initAmbientPill } from '../nav/ambient-pill.js'
import { initCommandSheet } from '../nav/command-sheet.js'
import { init as initQuotaBanner } from './quota-banner.js'
import { init as initIndicators } from '../marks/indicator.js'
import { setupLongPress, openEditor } from '../marks/editor.js'

const bootCleanups = []

/**
 * Initialize the application.
 */
export async function init() {
  performance.mark('app:start')

  // Drain previous cleanups for safe re-init
  for (const fn of bootCleanups) {
    if (typeof fn === 'function') { fn() }
  }
  bootCleanups.length = 0

  try {
    // Open database (creates stores if first run)
    await openDB()
    performance.mark('db:open')
    performance.measure('app:db-open', 'app:start', 'db:open')

    // Apply saved theme + font size before router dispatches first route
    await initTheme()
    await initFontSize()

    // Listen for launch restore
    bootCleanups.push(on(Events.ROUTER_LAUNCH_RESTORE, handleLaunchRestore))

    // Register Phase 1 routes
    router.register('#/s/:surah', () => import('../reader/index.js'), {
      initIndicators,
      setupLongPress,
    })
    router.register('#/s/:surah/:ayah', () => import('../reader/index.js'), {
      initIndicators,
      setupLongPress,
    })

    // Register Phase 2 routes
    router.register('#/review', () => import('../review/hub.js'), {
      openEditor,
    })

    // Register Phase 3 routes
    router.register('#/settings', () => import('../settings/index.js'))
    router.register('#/about', () => import('../about/index.js'))
    router.register('#/t/:tag', () => import('../review/hub.js'), {
      openEditor,
    })

    // Initialize router AFTER routes are registered so first dispatch finds them
    bootCleanups.push(router.init())
    performance.mark('router:resolve')
    performance.measure('app:router-init', 'db:open', 'router:resolve')

    // Initialize settings gear panel, command sheet, and ambient nav chrome (pill + dock)
    bootCleanups.push(await initSettingsPanel())
    bootCleanups.push(await initCommandSheet())
    bootCleanups.push(await initAmbientDock())
    bootCleanups.push(await initAmbientPill())

    // Handle navigation events from command sheet
    bootCleanups.push(on(Events.NAVIGATION_NAVIGATE, ({ surah, verse }) => {
      if (verse) {
        router.navigate(`#/s/${surah}/${verse}`)
      } else {
        router.navigate(`#/s/${surah}`)
      }
    }))

    // Top bar intentionally empty — ambient pill + dock are the nav surfaces.

    // Capture PWA install prompt if available
    initInstallListener()

    // Initialize safety sync (handles IDB versionchange reload banner)
    bootCleanups.push(initSafetySync())

    // Initialize quota warning / exceeded banners
    bootCleanups.push(initQuotaBanner())

    // Register service worker
    await registerServiceWorker()

    // Initialize PWA install prompt capture and restore activation state
    const offline = await import('../data/offline.js')
    offline.initInstallPrompt()
    await offline.checkStorageQuota()
    await restoreActivationState(offline)
  } catch (error) {
    logger.error('Failed to initialize app:', {
      error,
    })
    emit(Events.APP_INIT_ERROR, { error })
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      while (mainContent.firstChild) { mainContent.removeChild(mainContent.firstChild) }
      const errorDiv = document.createElement('div')
      errorDiv.className = 'qa-error-state'
      errorDiv.textContent = 'Failed to load QuranAtlas.'
      const br = document.createElement('br')
      const retryBtn = document.createElement('button')
      retryBtn.className = 'qa-retry-btn'
      retryBtn.textContent = 'Retry'
      retryBtn.addEventListener('click', () => init())
      errorDiv.appendChild(br)
      errorDiv.appendChild(retryBtn)
      mainContent.appendChild(errorDiv)
    }
  }
}

/**
 * Handle launch restore: navigate to last-read position or default surah.
 */
async function handleLaunchRestore() {
  const lastSurface = await get('settings', 'lastSurface')
  if (lastSurface?.value) {
    logger.info('Session restore: lastSurface', { surface: lastSurface.value })
    router.navigate(lastSurface.value, { replace: true })
    return
  }
  const position = await getMostRecentPosition()
  if (position) {
    logger.info('Session restore: most recent position', { surah: position.surah, verse: position.verse })
    router.navigate(`#/s/${position.surah}/${position.verse}`, { replace: true })
  } else {
    logger.info('Session restore: default surah 1')
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
      await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
    } catch (error) {
      logger.error('SW registration failed:', {
        error,
      })
      emit(Events.APP_INIT_ERROR, { error, context: 'service-worker' })
      showOfflineBanner()
    }
  }
}

/**
 * Show a non-dismissible banner when SW registration fails.
 * Offline mode will be unavailable.
 */
function showOfflineBanner() {
  const existing = document.getElementById('qa-offline-banner')
  if (existing) { return }

  const banner = document.createElement('div')
  banner.id = 'qa-offline-banner'
  banner.setAttribute('role', 'alert')
  banner.setAttribute('aria-live', 'assertive')
  banner.style.cssText = [
    'position:fixed', 'bottom:0', 'left:0', 'right:0',
    'background:var(--qa-color-error,#dc2626)', 'color:#fff',
    'text-align:center', 'padding:0.75rem 1rem',
    'font-size:0.875rem', 'z-index:9999',
  ].join(';')
  banner.textContent = 'Offline mode unavailable. The app will not work without an internet connection.'
  document.body.appendChild(banner)
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
