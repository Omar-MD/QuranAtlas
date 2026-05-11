/**
 * Application bootstrap.
 * Wires all modules together and initializes the app lifecycle.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Imports from JS modules — types will be added in a later migration task
import { openDB, get, LAYER_NAMES } from './core/db.js'
import { loadGlobalPosition } from './read/global-position'
import { reshapeArabicVerses, reshapeAddedNodes } from './read/font-reshape'
import * as router from './core/router.js'
import { emit, on } from './core/events.js'
import { Events } from './core/constants.js'
import { logger } from './core/logger.js'
import { init as initSafetySync, suppressNextVersionChange } from './infra/safety/sync.js'
import { initInstallListener } from './configure/about/pwa-install'
import { initTheme } from './configure/theme.ts'
import { initFontSize } from './configure/font-size.ts'
import { initRiwayah } from './configure/riwayah.ts'
import { initOfflineCategories } from './configure/offline-categories.ts'
import { initReadingTypography } from './configure/reading-typography.ts'
import { initNightMode } from './configure/night-mode.ts'
import { initSurahHeaderHidden } from './configure/surah-header-visibility.ts'
import { openSettingsSheet } from './configure/panel-bridge.ts'
import { initReaderActions } from './navigate/reader-actions.js'
import { initIndicators } from './mark/indicator'
import { initBookmarkIndicators } from './navigate/bookmarks/indicator'
import { initBookmarkClickHandler } from './navigate/bookmarks/click-handler'
import { initBookmarkPulse } from './navigate/bookmarks/pulse'
import { setupTapGestures } from './mark/long-press'
import { openDeep } from './mark/tag/session-bridge'
import { registerEditor } from './mark/editor-bridge'
import { startSwUpdatePolling } from './core/sw-update-poll.ts'
import { openNavDrawer } from './navigate/nav-drawer-bridge'
import { loadArabicQuranFontProgrammatically } from './core/font-loader.ts'
import { initAudio } from './listen/init'
import { initGlobalShortcuts } from './navigate/global-shortcuts'
import { openTafsirPreview } from './read/tafsir-bridge'
import { tafsirState } from './read/tafsir-state.svelte'

// Bind tap gestures to the reader container:
//   short-tap   → while tafsir preview is open, move it to the tapped verse.
//   double-tap  → open tafsir preview for the tapped verse.
function setupLongPress(container: HTMLElement): () => void {
  return setupTapGestures(container, {
    onShort: (vk) => {
      if (tafsirState.previewOpen) { void openTafsirPreview(vk) }
    },
    onDouble: (vk) => {
      void openTafsirPreview(vk)
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
  //
  // Active-riwayah font is fetched after `initRiwayah()` resolves below;
  // here we only do the iOS-defense reshape observer setup that doesn't
  // depend on a specific riwayah.
  if (typeof document !== 'undefined' && document.fonts && typeof document.fonts.load === 'function') {
    // Reshape logic + reasoning live in src/read/font-reshape.ts. The
    // observer scopes work to mutation.addedNodes — re-walking the whole
    // document on every chunk-append turned Al-Baqarah's render into
    // ~1700 forced reflows (audit R-04, 2026-04-29).
    let fontsAreReady = false
    void document.fonts.ready.then(() => { fontsAreReady = true; reshapeArabicVerses() }).catch(() => { /* ignore */ })
    const observer = new MutationObserver((mutations) => {
      if (fontsAreReady) reshapeAddedNodes(mutations)
    })
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
    const activeRiwayah = await initRiwayah()
    await initReadingTypography()
    await initNightMode()
    await initSurahHeaderHidden()

    // Offline categories rune (N21) — must precede `restoreActivationState`
    // below so `getActivationState()` reads the loaded selector state. Cheap;
    // a single IDB read.
    await initOfflineCategories()

    // Audio (v2.0 milestone). Loads audio settings, wires cross-tab
    // gating, registers reader-highlight + auto-scroll subscribers.
    // Runs after initRiwayah so the active riwayah is in scope; audio
    // dataset URLs themselves don't depend on riwayah today (per spec)
    // but future per-riwayah reciter filtering (e.g. Warsh-only reciters
    // in Warsh mode) plugs in here.
    pushCleanup(bootCleanups, await initAudio())

    // Active-riwayah KFGQPC font kickoff — fetch only the cut the user is
    // actually viewing. CSS Font Loading API call primes the family name;
    // programmatic FontFace construction (font-loader.ts) bypasses iOS
    // WebKit's @font-face GPOS-activation race. Fire-and-forget; failure
    // tolerable (CSS @font-face + Amiri Quran fallback both still active).
    if (typeof document !== 'undefined' && document.fonts && typeof document.fonts.load === 'function') {
      const familyMap: Record<typeof activeRiwayah, string> = {
        hafs: 'KFGQPC Uthmanic Hafs',
        warsh: 'KFGQPC Uthmanic Warsh',
        qaloon: 'KFGQPC Uthmanic Qaloon',
      }
      void document.fonts.load(`16px "${familyMap[activeRiwayah]}"`, 'ا').catch(() => { /* ignore */ })
      loadArabicQuranFontProgrammatically(activeRiwayah)
    }
    // Lazy-load the new riwayah's font when user switches via Settings.
    pushCleanup(bootCleanups, on(Events.SETTINGS_RIWAYAH_CHANGED, ({ to }) => {
      loadArabicQuranFontProgrammatically(to)
    }))

    // Prefetch al-Fatiha for the active riwayah — ~1.5 KB primes the
    // SW NetworkFirst cache so the most-likely first reader open hits a
    // warm cache. Below idle priority; the browser drops the request
    // under contention.
    if (typeof document !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.as = 'fetch'
      link.crossOrigin = 'anonymous'
      link.href = `/dataset/riwayat/${activeRiwayah}/001.json`
      document.head.appendChild(link)
    }

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
    router.register('#/s/:surah', async () => (await import('./read/Reader.svelte')).default, {
      initIndicators,
      setupLongPress,
    })
    router.register('#/s/:surah/:ayah', async () => (await import('./read/Reader.svelte')).default, {
      initIndicators,
      setupLongPress,
    })
    router.register('#/m/:page', async () => (await import('./read/mushaf/MushafReader.svelte')).default)

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
    router.register('#/about', async () => (await import('./configure/about/About.svelte')).default)
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
        return (await import('./navigate/EmptyRoute.svelte')).default
      }
      return (await import('./navigate/surahs/SurahList.svelte')).default
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
        return (await import('./navigate/EmptyRoute.svelte')).default
      }
      return (await import('./navigate/bookmarks/BookmarksPage.svelte')).default
    })
    router.register('#/onboarding', async () => (await import('./onboard/Onboarding.svelte')).default)

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

    // Global keyboard shortcuts (⌘K, /, ?, g-chord nav, reader hotkeys).
    // Lives outside any overlay component so it survives lazy-mount of the
    // command sheet (audit N22 / N25, 2026-05-01).
    pushCleanup(bootCleanups, initGlobalShortcuts())

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
    // N21 wipe-and-re-opt-in migration: drop legacy 'cached' marker so
    // selector renders empty when categories rune is also empty.
    await offline.initOfflineMigration()
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
  const { isComplete } = await import('./onboard/state')
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
