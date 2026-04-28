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
import { initRiwayah } from './settings/riwayah.ts'
import { initReadingTypography } from './settings/reading-typography.ts'
import { initNightMode } from './settings/night-mode.ts'
import { initSurahHeaderHidden } from './settings/surah-header-visibility.ts'
import { openSettingsSheet } from './settings/panel-bridge.ts'
import { initReaderActions } from './nav/reader-actions.js'
import { initIndicators } from './marks/indicator'
import { initBookmarkIndicators } from './bookmarks/indicator'
import { initBookmarkClickHandler } from './bookmarks/click-handler'
import { initBookmarkPulse } from './bookmarks/pulse'
import { setupTapGestures } from './marks/long-press'
import { beginFast, openDeep } from './tag/session-bridge'
import { tagSession } from './state/tag-session.svelte'
import { registerEditor } from './marks/editor-bridge'
import { startSwUpdatePolling } from './core/sw-update-poll.ts'
import { openNavDrawer } from './nav/nav-drawer-bridge'
import { loadArabicQuranFontProgrammatically } from './core/font-loader.ts'

// Bind tap gestures to the reader container:
//   short-tap   → only while fast-tag mode is open: switch the active verse
//                 being tagged. Does NOT start a new session from an idle tap.
//   double-tap  → open the fast-tag inline panel (replaces long-press since
//                 2026-04-25 — long-press is reserved for OS-native gestures
//                 like text selection and the iOS callout).
// Deep editor reached only via ⛶ in VerseTagPanel + programmatic bridges.
function setupLongPress(container: HTMLElement): () => void {
  return setupTapGestures(container, {
    onShort: (vk) => {
      if (tagSession.quickbarOpen) { void beginFast(vk) }
    },
    onDouble: (vk) => {
      // Open fast-tag, or switch the active verse if another is already in
      // session. The toggle-to-exit behavior of the old long-press contract
      // doesn't translate to double-tap: a tap-then-double-tap on a *new*
      // verse already calls onShort first (which switches the active verse),
      // so a "same verse → exit" rule would fire spuriously. Mobile exits
      // via the explicit ✕ in VerseTagPanel.
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
  console.info(
    `%cQuranAtlas v${__APP_VERSION__} · ${__BUILD_SHA__}`,
    'color:#b08040;font-weight:600',
    `(built ${__BUILD_TIME__})`
  )

  // Route `openEditor` calls (long-press, command-sheet, review) to the
  // TagSheet deep path. TagSheet subscribes to tagSession.sheetOpen.
  registerEditor((vk) => { void openDeep(vk) })

  // Programmatic font kickoff (iOS WebKit defense-in-depth — Apple Dev Forum
  // 671608). The hidden divs in index.html cover the render-tree-side route;
  // the CSS Font Loading API call below covers the script route. Together
  // they survive iOS WebKit defects that skip one or the other (off-viewport
  // paint elision, dynamic-only-use deferral). Fire-and-forget — no await,
  // since this just primes the network fetch and registers the family;
  // failure to load is tolerable because @font-face will still be tried when
  // the reader actually mounts. Guard against environments without the
  // Font Loading API (jsdom in unit tests).
  if (typeof document !== 'undefined' && document.fonts && typeof document.fonts.load === 'function') {
    void document.fonts.load('16px "Amiri Quran"', 'ا').catch(() => { /* ignore — fallback chain handles it */ })
    // Belt-and-braces for iOS Safari: bypass CSS @font-face activation
    // entirely by constructing the FontFace from the woff2 ArrayBuffer
    // and adding to document.fonts. Survives every iOS-specific defect
    // we have hit on the CSS path (combining marks not engaging GPOS,
    // late paint with fallback, render-tree-side activation race).
    loadArabicQuranFontProgrammatically()
    // iOS Safari paints the reader DOM with a fallback font when verses
    // mount before Amiri Quran swaps in, then doesn't re-shape RTL Arabic
    // text when font-display:swap brings in the real face — combining
    // marks (sukun, dagger alif, small high seen) collapse to base
    // position. Force a re-paint once fonts are ready AND each time the
    // reader mounts new verses (router navigation, riwayah switch).
    // Toggling a no-op transform invalidates the layout cache + re-runs
    // glyph shaping with the now-loaded Amiri Quran font.
    const reshape = (root: ParentNode = document) => {
      const verses = root.querySelectorAll('.qa-verse-arabic')
      for (const el of verses) {
        const v = el as HTMLElement
        v.style.transform = 'translateZ(0)'
        void v.offsetHeight
        v.style.transform = ''
      }
    }
    let fontsAreReady = false
    void document.fonts.ready.then(() => { fontsAreReady = true; reshape() }).catch(() => { /* ignore */ })
    // Observe #main-content for new verse subtrees so post-mount renders
    // also get the kick. Cheap — only fires when the router replaces the
    // reader subtree, not on tashkeel toggles or font-size slider.
    const observer = new MutationObserver(() => { if (fontsAreReady) reshape() })
    const startObserve = () => {
      const main = document.getElementById('main-content')
      if (main) observer.observe(main, { childList: true, subtree: true })
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserve, { once: true })
    } else {
      startObserve()
    }
  }

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
    await initRiwayah()
    await initReadingTypography()
    await initNightMode()
    await initSurahHeaderHidden()

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
    router.register('#/surahs', async () => {
      const isMobile = window.matchMedia('(max-width: 1179px)').matches
      if (isMobile) {
        // Redirect: replace hash with last surface (or Fatihah default), open the
        // drawer on Surahs tab. The replaceState avoids a back-stack entry that
        // would loop the user through #/surahs again on Back.
        const lastRec = await get('settings', 'lastSurface').catch(() => undefined)
        const last = (typeof lastRec?.value === 'string' && lastRec.value && lastRec.value !== '#/surahs')
          ? lastRec.value
          : '#/s/1'
        history.replaceState(null, '', last)
        queueMicrotask(() => { openNavDrawer('read') })
        return (await import('./nav/EmptyRoute.svelte')).default
      }
      return (await import('./surahs/SurahList.svelte')).default
    })
    router.register('#/bookmarks', async () => {
      const isMobile = window.matchMedia('(max-width: 1179px)').matches
      if (isMobile) {
        // Mobile users get the drawer's Read>Bookmarks sub-tab instead — the
        // route exists so desktop links + share URLs still resolve. Redirect to
        // the last reader surface so the drawer overlays the reader, not a
        // blank shell.
        const lastRec = await get('settings', 'lastSurface').catch(() => undefined)
        const last = (typeof lastRec?.value === 'string' && lastRec.value && lastRec.value !== '#/bookmarks')
          ? lastRec.value
          : '#/s/1'
        history.replaceState(null, '', last)
        queueMicrotask(() => { openNavDrawer('read', 'bookmarks') })
        return (await import('./nav/EmptyRoute.svelte')).default
      }
      return (await import('./bookmarks/BookmarksPage.svelte')).default
    })
    router.register('#/onboarding', async () => (await import('./onboarding/Onboarding.svelte')).default)

    // Bookmarks: global click toggle (verse-id tap), indicator cache + glyph
    // decoration, and pulse-on-jump landing. All three are app-wide and live
    // outside the reader unit lifecycle (the indicator stays in sync across
    // route changes via events).
    pushCleanup(bootCleanups, initBookmarkClickHandler())
    pushCleanup(bootCleanups, initBookmarkIndicators())
    pushCleanup(bootCleanups, initBookmarkPulse())

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
        scope: '/',
        // Bypass HTTP cache when fetching /sw.js so installed PWAs pick up
        // new builds without waiting for the browser's 24h cache TTL.
        updateViaCache: 'none'
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

      startSwUpdatePolling(reg)
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
