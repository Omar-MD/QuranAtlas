/**
 * Application bootstrap.
 * Wires all modules together and initializes the app lifecycle.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Imports from JS modules — types will be added in a later migration task
import { openDB, get, LAYER_NAMES } from './core/db.js'
import { loadGlobalPosition } from './reader/global-position'
import * as router from './core/router.js'
import { emit, on } from './core/events.js'
import { Events } from './core/constants.js'
import { logger } from './core/logger.js'
import { init as initSafetySync, suppressNextVersionChange } from './safety/sync.js'
import { initInstallListener } from './about/pwa-install'
import { initTheme } from './settings/theme.ts'
import { initFontSize } from './settings/font-size.ts'
import { initReadingTypography } from './settings/reading-typography.ts'
import { initNightMode } from './settings/night-mode.ts'
import { openSettingsSheet } from './settings/panel-bridge.ts'
import { initReaderActions } from './nav/reader-actions.js'
import { initIndicators } from './marks/indicator'
import { setupTapGestures } from './marks/long-press'
import { beginFast, openDeep } from './tag/session-bridge'
import { tagSession } from './state/tag-session.svelte'
import { registerEditor } from './marks/editor-bridge'

// Bind tap gestures to the reader container:
//   short-tap  → only while fast-tag mode is open: switch the active verse
//                being tagged. Does NOT start a new session from an idle tap.
//   long-press → fast-tag inline panel (mobile-nav-redesign 2026-04-25).
// Deep editor reached only via ⛶ in VerseTagPanel + programmatic bridges.
function setupLongPress(container: HTMLElement): () => void {
  return setupTapGestures(container, {
    onShort: (vk) => {
      if (tagSession.quickbarOpen) { void beginFast(vk) }
    },
    onLong: (vk) => {
      // Long-press on the verse already in fast-tag mode → exit (mobile has
      // no Esc key; this complements the explicit ✕ in VerseTagPanel).
      if (tagSession.quickbarOpen && tagSession.verseKey === vk) {
        tagSession.end()
        return
      }
      void beginFast(vk)
    },
  })
}

/** Module-level cleanups array — drained at the top of each initBootstrap call and on error. */
const bootCleanups: Array<() => void> = []

/** Push a value that is any callable into the cleanups array, casting for TS satisfaction. */
function pushCleanup(arr: Array<() => void>, fn: any): void {
  if (typeof fn === 'function') {
    arr.push(fn as () => void)
  }
}

/**
 * Initialize the application.
 * Returns the module-level cleanups array that callers should invoke on teardown.
 */
export async function initBootstrap(): Promise<Array<() => void>> {
  // Drain any partial cleanups from a previous (failed) call
  for (const fn of bootCleanups) { try { fn() } catch { /* ignore */ } }
  bootCleanups.length = 0

  performance.mark('app:start')

  // Build banner — visible in devtools so the active build is unambiguous
  // even when the About page isn't open. Mirrors the version shown there.
  // eslint-disable-next-line no-console
  console.info(
    `%cQuranAtlas v${__APP_VERSION__} · ${__BUILD_SHA__}`,
    'color:#b08040;font-weight:600',
    `(built ${__BUILD_TIME__})`
  )

  // Route `openEditor` calls (long-press, command-sheet, review) to the
  // TagSheet deep path. TagSheet subscribes to tagSession.sheetOpen.
  registerEditor((vk) => { void openDeep(vk) })

  try {
    // Open database (creates stores if first run)
    await openDB()
    performance.mark('db:open')
    performance.measure('app:db-open', 'app:start', 'db:open')

    // Initialize safety sync FIRST so its DB_VERSION_CHANGE listener is
    // guaranteed registered before any other code (tests, user actions, other
    // tabs) can trigger a versionchange.  Previously this ran much later in
    // bootstrap, which meant the E2E `__qaSuppressNextVersionChange` hatch
    // could be called before the handler existed, leaking the suppress flag
    // into a later (real) versionchange and silencing the reload banner.
    pushCleanup(bootCleanups, initSafetySync())

    // Apply saved theme + font size before router dispatches first route
    await initTheme()
    await initFontSize()
    await initReadingTypography()
    await initNightMode()

    // Expose version-change suppression so E2E clearAllData can prevent the
    // sync-banner overlay from blocking pointer events (Bug-2). Exposed in
    // both DEV and PROD because the @offline Playwright project runs against
    // a production preview build (vite preview); gating on import.meta.env.DEV
    // would tree-shake the hatch and hang the fixture waiting for it. Safe to
    // ship — the function only suppresses a single sync banner; nothing in
    // production user flows invokes the global.
    // Must be exposed AFTER initSafetySync above so the suppress flag is
    // consumed by the handler that's now guaranteed to be listening.
    ;(globalThis as unknown as Record<string, unknown>).__qaSuppressNextVersionChange = suppressNextVersionChange

    // Listen for launch restore
    pushCleanup(bootCleanups, on(Events.ROUTER_LAUNCH_RESTORE, handleLaunchRestore))

    // Register Phase 1 routes — Reader.svelte receives surah/ayah params + hook props
    router.register('#/s/:surah', async () => (await import('./reader/Reader.svelte')).default, {
      initIndicators,
      setupLongPress,
    })
    router.register('#/s/:surah/:ayah', async () => (await import('./reader/Reader.svelte')).default, {
      initIndicators,
      setupLongPress,
    })

    // Register Phase 2 routes
    router.register('#/review', async () => (await import('./review/Hub.svelte')).default)

    // Register Phase 3 routes
    router.register('#/settings', () => Promise.resolve({
      async init() {
        openSettingsSheet()
        const last = await get('settings', 'lastSurface')
        const prevVal = last?.value
        const prev = typeof prevVal === 'string' && prevVal && prevVal !== '#/settings' ? prevVal : '#/s/1'
        router.navigate(prev, { replace: true })
      },
    }))
    router.register('#/about', async () => (await import('./about/About.svelte')).default)
    // FVR: #/<layer>/:value — one route per layer (replaces legacy #/t/:tag)
    for (const layerName of LAYER_NAMES) {
      router.register(
        `#/${layerName}/:value`,
        async () => (await import('./review/Hub.svelte')).default,
        { layer: layerName },
      )
    }
    router.register('#/surahs', async () => (await import('./surahs/SurahList.svelte')).default)
    router.register('#/onboarding', async () => (await import('./onboarding/Onboarding.svelte')).default)

    // Initialize router AFTER routes are registered so first dispatch finds them
    pushCleanup(bootCleanups, router.init())
    performance.mark('router:resolve')
    performance.measure('app:router-init', 'db:open', 'router:resolve')

    // Settings panel, CommandSheet, AmbientDock, AmbientPill, NavDrawer are all
    // now mounted as components in App.svelte — no init calls needed here.
    pushCleanup(bootCleanups, await initReaderActions())

    // Handle navigation events from command sheet
    pushCleanup(bootCleanups, on(Events.NAVIGATION_NAVIGATE, ({ surah, verse }: { surah: number; verse?: number }) => {
      if (verse) {
        router.navigate(`#/s/${surah}/${verse}`)
      } else {
        router.navigate(`#/s/${surah}`)
      }
    }))

    // Recent-surahs tracking is now handled by an $effect in App.svelte that
    // watches reader.currentSurahNum — no event subscription required here.

    // Top bar intentionally empty — ambient pill + dock are the nav surfaces.

    // Capture PWA install prompt if available
    initInstallListener()

    // Safety sync already initialized above, before route handling starts.

    // Quota warning / exceeded banner is now mounted in App.svelte as <QuotaBanner />
    // and self-initializes via $effect when the component mounts.

    // Register service worker
    await registerServiceWorker()

    // Initialize PWA install prompt capture and restore activation state
    const offline = await import('./data/offline.js')
    offline.initInstallPrompt()
    await offline.checkStorageQuota()
    await restoreActivationState(offline)
  } catch (error) {
    for (const fn of bootCleanups) { try { fn() } catch { /* ignore */ } }
    bootCleanups.length = 0
    logger.error('Failed to initialize app:', {
      error,
    })
    emit(Events.APP_INIT_ERROR, { error: error as Error })
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
      retryBtn.addEventListener('click', () => initBootstrap())
      errorDiv.appendChild(br)
      errorDiv.appendChild(retryBtn)
      mainContent.appendChild(errorDiv)
    }
  }

  return bootCleanups
}

/**
 * Handle launch restore: navigate to last-read position or default surah.
 */
async function handleLaunchRestore() {
  const { isComplete } = await import('./onboarding/Onboarding.svelte')
  const done = await isComplete()
  if (!done) {
    logger.info('First-run: onboarding')
    router.navigate('#/onboarding', { replace: true })
    return
  }
  const lastSurface = await get('settings', 'lastSurface')
  const lastSurfaceVal = typeof lastSurface?.value === 'string' ? lastSurface.value : null
  if (lastSurfaceVal && lastSurfaceVal !== '#/onboarding') {
    logger.info('Session restore: lastSurface', { surface: lastSurfaceVal })
    router.navigate(lastSurfaceVal, { replace: true })
    return
  }
  const position = await loadGlobalPosition()
  if (position) {
    logger.info('Session restore: global position', { surah: position.surah, verse: position.verse })
    router.navigate(`#/s/${position.surah}/${position.verse}`, { replace: true })
  } else {
    logger.info('Session restore: default surah 1')
    router.navigate('#/s/1', { replace: true })
  }
}

/**
 * Register the service worker.
 * Skipped in dev mode — SW is only meaningful in production builds.
 *
 * Detects when a new SW version is waiting (rolled-out new release) and
 * emits APP_UPDATE_AVAILABLE so the UpdateBanner can prompt the user.
 */
let _swReg: ServiceWorkerRegistration | null = null

async function registerServiceWorker() {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      _swReg = reg

      // If a new SW is already waiting at register time (e.g. user opens a
      // new tab while a previous tab installed the new version), surface
      // immediately.
      if (reg.waiting && navigator.serviceWorker.controller) {
        emit(Events.APP_UPDATE_AVAILABLE, {})
      }

      // New version found while this tab is open: wait for the installing
      // SW to reach 'installed' state with an existing controller (= the
      // new build is fully ready, just waiting to activate).
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing
        if (!installing) { return }
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            emit(Events.APP_UPDATE_AVAILABLE, {})
          }
        })
      })
    } catch (error) {
      logger.error('SW registration failed:', {
        error,
      })
      emit(Events.APP_INIT_ERROR, { error: error as Error, context: 'service-worker' })
      showOfflineBanner()
    }
  }
}

/**
 * User-initiated app update: tell the waiting SW to activate, then reload
 * once it takes control. Called from UpdateBanner.
 */
export async function applyAppUpdate(): Promise<void> {
  const reg = _swReg ?? (await navigator.serviceWorker.getRegistration())
  if (!reg?.waiting) {
    // No waiting SW (already activated, or banner stale) — just reload.
    location.reload()
    return
  }
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) { return }
    reloaded = true
    location.reload()
  })
  reg.waiting.postMessage({ type: 'SKIP_WAITING' })
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
    'background:var(--qa-text-error,#dc2626)', 'color:#fff',
    'text-align:center', 'padding:0.75rem 1rem',
    'font-size:0.875rem', 'z-index:9999',
  ].join(';')
  banner.textContent = 'Offline mode unavailable. The app will not work without an internet connection.'
  document.body.appendChild(banner)
}

/**
 * Restore activation state and re-download if interrupted.
 */
async function restoreActivationState(offline: { getActivationState(): Promise<string>; cancelDownload(): Promise<void> }) {
  const state = await offline.getActivationState()

  if (state === 'downloading') {
    // Interrupted download — reset to none, user must re-tap
    await offline.cancelDownload()
  }

  // If no cached corpus and online, show download UI
  if (state === 'none' && navigator.onLine) {
    emit(Events.APP_READY_FOR_DOWNLOAD, {})
  }
}
