<script lang="ts">
  /**
   * Mobile / tablet (<1180px) top navigation — single-row layout (2026-04-25):
   *   [ ≡ ]            <Arabic surah name>                         [ ⚙ ]
   *                       AL-FATIHAH ▾
   *
   * Auto-hides on scroll-down; reveals on scroll-up or `ambient:surface`.
   * Tap label = surah list; swipe l/r on label = prev/next surah;
   * swipe down on header = surah list. Long-press gear = cycle theme.
   */

  import { onMount } from 'svelte'
  import { on, emit } from '../core/events'
  import { Events } from '../core/constants'
  import { reader } from '../state/reader.svelte'
  import { get } from '../core/db'
  import { loadGlobalPosition } from '../reader/global-position'
  import { getSurahs } from '../data/dataset'
  import { toggleNavDrawer } from './nav-drawer-bridge'
  import { openSettingsSheet } from '../settings/panel-bridge'
  import { cycleTheme } from '../settings/theme'
  import { classifySwipe, clampSurah } from './swipe-gestures'

  const HIDE_DELTA = 36
  const SHOW_NEAR_TOP = 20
  const LONG_PRESS_MS = 350
  const LONG_PRESS_JITTER_PX = 10

  let hidden = $state(false)
  let lastTop = 0
  let surahName = $state('')
  let surahArabicName = $state('')
  let lastSurahHref = $state('#/s/1')

  const currentSurahNum = $derived(reader.currentSurahNum)

  const labelEnglish = $derived.by(() => {
    if (!currentSurahNum) { return 'QuranAtlas' }
    return (surahName || `SURAH ${currentSurahNum}`).toUpperCase()
  })
  const labelHasSurah = $derived(currentSurahNum != null)

  function isReaderRoute(h: string): boolean { return (h || '').startsWith('#/s/') }

  function openDrawer(): void {
    emit(Events.AMBIENT_SURFACE, { reason: 'margin-header' })
    toggleNavDrawer()
  }

  async function tapLabel(): Promise<void> {
    const h = window.location.hash || ''
    if (h.startsWith('#/surahs')) {
      window.location.hash = lastSurahHref
      return
    }
    if (!labelHasSurah) {
      // Non-reader screen with no in-memory surah (e.g. cold load on About).
      // Resume from the most recent reading position rather than hard-resetting
      // to Fatihah verse 1. Reader picks up the per-surah saved verse from IDB.
      const pos = await loadGlobalPosition()
      if (pos) {
        window.location.hash = `#/s/${pos.surah}`
        return
      }
      window.location.hash = '#/s/1'
      return
    }
    window.location.hash = '#/surahs'
  }

  // ---- Swipe gestures ----
  let labelTouchT0 = 0
  let labelTouchX0 = 0
  let labelTouchY0 = 0

  function onLabelTouchStart(e: TouchEvent): void {
    const t = e.touches[0]
    if (!t) { return }
    labelTouchT0 = performance.now()
    labelTouchX0 = t.clientX
    labelTouchY0 = t.clientY
  }
  function onLabelTouchEnd(e: TouchEvent): void {
    const t = e.changedTouches[0]
    if (!t || !labelHasSurah) { return }
    const dir = classifySwipe({
      dx: t.clientX - labelTouchX0,
      dy: t.clientY - labelTouchY0,
      dtMs: performance.now() - labelTouchT0,
    })
    if (dir === 'left') {
      const next = clampSurah((currentSurahNum ?? 1) + 1)
      if (next !== currentSurahNum) {
        window.location.hash = `#/s/${next}`
      } else {
        navigator.vibrate?.(10)
      }
    } else if (dir === 'right') {
      const prev = clampSurah((currentSurahNum ?? 1) - 1)
      if (prev !== currentSurahNum) {
        window.location.hash = `#/s/${prev}`
      } else {
        navigator.vibrate?.(10)
      }
    }
  }

  let headerTouchT0 = 0
  let headerTouchX0 = 0
  let headerTouchY0 = 0
  function onHeaderTouchStart(e: TouchEvent): void {
    const t = e.touches[0]
    if (!t) { return }
    headerTouchT0 = performance.now()
    headerTouchX0 = t.clientX
    headerTouchY0 = t.clientY
  }
  function onHeaderTouchEnd(e: TouchEvent): void {
    const t = e.changedTouches[0]
    if (!t) { return }
    const dir = classifySwipe({
      dx: t.clientX - headerTouchX0,
      dy: t.clientY - headerTouchY0,
      dtMs: performance.now() - headerTouchT0,
    })
    if (dir === 'down') { window.location.hash = '#/surahs' }
  }

  // ---- Settings gear: short tap → settings; long-press → cycle theme ----
  let settingsTimer: ReturnType<typeof setTimeout> | null = null
  let settingsLongFired = false
  let settingsStartX = 0
  let settingsStartY = 0

  function onSettingsPointerDown(e: PointerEvent): void {
    // Suppress native iOS callout (Copy / Look up / image action) that would
    // otherwise race the long-press timer.
    e.preventDefault()
    settingsLongFired = false
    settingsStartX = e.clientX
    settingsStartY = e.clientY
    if (settingsTimer) { clearTimeout(settingsTimer) }
    settingsTimer = setTimeout(() => {
      settingsLongFired = true
      void cycleTheme()
      navigator.vibrate?.(8)
    }, LONG_PRESS_MS)
  }
  function onSettingsPointerMove(e: PointerEvent): void {
    if (!settingsTimer) { return }
    const dx = e.clientX - settingsStartX
    const dy = e.clientY - settingsStartY
    if (dx * dx + dy * dy > LONG_PRESS_JITTER_PX * LONG_PRESS_JITTER_PX) {
      clearTimeout(settingsTimer); settingsTimer = null
    }
  }
  function onSettingsPointerUp(): void {
    if (settingsTimer) { clearTimeout(settingsTimer); settingsTimer = null }
    if (settingsLongFired) { return }
    openSettingsSheet()
  }
  function onSettingsPointerCancel(): void {
    if (settingsTimer) { clearTimeout(settingsTimer); settingsTimer = null }
    settingsLongFired = false
  }
  function onSettingsContextMenu(e: Event): void {
    // Defensive: if the OS still surfaces a context menu (e.g. trackpad
    // right-click on macOS desktop / Android long-press fallback), block it
    // so the long-press → cycleTheme contract isn't masked by a menu.
    e.preventDefault()
  }

  // ---- Mount ----
  onMount(() => {
    get('settings', 'lastSurface').then((rec) => {
      const v = typeof rec?.value === 'string' ? rec.value : ''
      const m = v.match(/^#\/s\/(\d+)/)
      if (m && m[1]) { lastSurahHref = `#/s/${m[1]}` }
    }).catch(() => { /* ignore */ })

    const refreshSurahName = () => {
      getSurahs().then((list) => {
        const s = reader.currentSurahNum
        const meta = list.find((x) => x.n === s) as { name?: string; arabic?: string } | undefined
        surahName = meta?.name ?? ''
        surahArabicName = meta?.arabic ?? ''
      }).catch(() => { /* ignore */ })
    }
    refreshSurahName()
    const unsubRoute = on(Events.ROUTER_ROUTE_CHANGE, refreshSurahName)
    const unsubSurface = on(Events.AMBIENT_SURFACE, () => { hidden = false })

    const main = document.getElementById('main-content')
    const onScroll = () => {
      const top = main?.scrollTop ?? 0
      const delta = top - lastTop
      if (!isReaderRoute(window.location.hash)) { hidden = false; return }
      if (top < SHOW_NEAR_TOP) { hidden = false }
      else if (delta > HIDE_DELTA) { hidden = true; lastTop = top }
      else if (delta < -HIDE_DELTA) { hidden = false; lastTop = top }
    }
    main?.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      unsubRoute()
      unsubSurface()
      main?.removeEventListener('scroll', onScroll)
      if (settingsTimer) { clearTimeout(settingsTimer); settingsTimer = null }
    }
  })
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<header
  class="qa-mh"
  class:qa-mh--hidden={hidden}
  aria-label="Primary navigation"
  ontouchstart={onHeaderTouchStart}
  ontouchend={onHeaderTouchEnd}
>
  <button
    type="button"
    class="qa-mh-hamburger"
    aria-label="Open navigation"
    onclick={openDrawer}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="4" y1="7"  x2="20" y2="7"/>
      <line x1="4" y1="12" x2="20" y2="12"/>
      <line x1="4" y1="17" x2="20" y2="17"/>
    </svg>
  </button>

  <button
    type="button"
    class="qa-mh-label"
    aria-label={labelHasSurah ? 'Open surah list' : 'Go to Al-Fatihah'}
    onclick={tapLabel}
    ontouchstart={onLabelTouchStart}
    ontouchend={onLabelTouchEnd}
  >
    {#if labelHasSurah}
      <span class="qa-mh-label-ar" dir="rtl" lang="ar">{surahArabicName}</span>
      <span class="qa-mh-label-en">
        <span>{labelEnglish}</span>
        <svg class="qa-mh-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </span>
    {:else}
      <span class="qa-mh-wordmark">QuranAtlas</span>
    {/if}
  </button>

  <button
    type="button"
    class="qa-mh-settings"
    aria-label="Open settings"
    onpointerdown={onSettingsPointerDown}
    onpointermove={onSettingsPointerMove}
    onpointerup={onSettingsPointerUp}
    onpointercancel={onSettingsPointerCancel}
    onpointerleave={onSettingsPointerCancel}
    oncontextmenu={onSettingsContextMenu}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
    </svg>
  </button>
</header>
