<script lang="ts">
  /**
   * Mobile / tablet (<1180px) top navigation — single-row layout:
   *   [ ≡ ]            <Arabic surah name>                         [ ⚙ ]
   *                       AL-FATIHAH ▾
   *
   * Auto-hides on scroll-down; reveals on scroll-up or `ambient:surface`.
   * Tap label = surah list; swipe l/r on label = prev/next surah;
   * swipe down on header = surah list. Double-tap gear = cycle theme
   * (replaced long-press 2026-04-26: double-tap is more accessible, avoids
   * the iOS callout race that long-press fought against, and matches the
   * reader verse double-tap convention).
   */

  import { onMount } from 'svelte'
  import { on, emit } from '../core/events'
  import { Events } from '../core/constants'
  import { reader } from './state.svelte'
  import { getSurahs } from '../data/dataset'
  import { openNavDrawer, toggleNavDrawer } from '../navigate/nav-drawer-bridge'
  import { openSettingsSheet } from '../configure/panel-bridge'
  import { cycleTheme } from '../configure/theme'
  import { toggleSurahHeaderHidden } from '../configure/surah-header-visibility'
  import { classifySwipe, clampSurah } from '../navigate/swipe-gestures'

  const HIDE_DELTA = 36
  const SHOW_NEAR_TOP = 20
  const DOUBLE_TAP_MS = 300

  let hidden = $state(false)
  let lastTop = 0
  let surahName = $state('')
  let surahArabicName = $state('')
  let currentHash = $state(typeof window !== 'undefined' ? window.location.hash : '')
  const currentSurahNum = $derived(reader.currentSurahNum)

  const currentMushafPage = $derived.by(() => {
    const page = reader.currentMushafPage
    if (page !== null) { return page }
    const match = (currentHash || '').match(/^#\/m\/(\d+)$/)
    return match ? Number.parseInt(match[1] ?? '1', 10) : null
  })
  const onMushafRoute = $derived((currentHash || '').startsWith('#/m/'))
  const labelHasPage = $derived(onMushafRoute && currentMushafPage != null)
  const labelHasSurah = $derived(!onMushafRoute && currentSurahNum != null)
  const labelIsInteractive = $derived(labelHasSurah && isVerseRoute(currentHash))
  const onOnboardingRoute = $derived((currentHash || '').startsWith('#/onboarding'))
  const onAssetsRoute = $derived((currentHash || '').startsWith('#/assets'))

  function isVerseRoute(h: string): boolean { return (h || '').startsWith('#/s/') }

  function openDrawer(): void {
    emit(Events.AMBIENT_SURFACE, { reason: 'margin-header' })
    toggleNavDrawer()
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
    if (!t || !labelHasSurah || !isVerseRoute(window.location.hash)) { return }
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
      return
    }
    if (dir === 'right') {
      const prev = clampSurah((currentSurahNum ?? 1) - 1)
      if (prev !== currentSurahNum) {
        window.location.hash = `#/s/${prev}`
      } else {
        navigator.vibrate?.(10)
      }
      return
    }
    // dir === null → tap. Toggle SurahHeader visibility on reader route only.
    // Mouse + keyboard share onLabelClick / onLabelKeyDown below; this branch
    // covers the touch path. preventDefault stops the synthetic click that
    // some browsers fire after touchend, which would otherwise double-toggle.
    if (isVerseRoute(window.location.hash)) {
      void toggleSurahHeaderHidden()
      e.preventDefault()
    }
  }

  function onLabelClick(): void {
    if (!isVerseRoute(window.location.hash) || !labelHasSurah) { return }
    void toggleSurahHeaderHidden()
  }

  function onLabelKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Enter' && e.key !== ' ') { return }
    if (!isVerseRoute(window.location.hash) || !labelHasSurah) { return }
    e.preventDefault()
    void toggleSurahHeaderHidden()
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
    if (dir === 'down') { openNavDrawer('read') }
  }

  // ---- Settings gear: single tap → settings; double tap → cycle theme ----
  // Tap counter mirrors the reader's setupTapGestures so touch + mouse share
  // the same path; we deliberately avoid the native `dblclick` event because
  // mobile browsers fire it inconsistently when the first tap also opens a
  // sheet. Single-tap is committed after the DOUBLE_TAP_MS window expires so
  // the second tap can rewrite the action to cycleTheme without the sheet
  // flashing open first.
  let settingsTapTimer: ReturnType<typeof setTimeout> | null = null
  let settingsLastTapAt = 0

  function commitSingleTap(): void {
    settingsTapTimer = null
    openSettingsSheet(onMushafRoute ? 'mushaf' : 'verse')
  }

  function onSettingsTap(): void {
    const now = performance.now()
    if (settingsTapTimer && (now - settingsLastTapAt) < DOUBLE_TAP_MS) {
      clearTimeout(settingsTapTimer)
      settingsTapTimer = null
      settingsLastTapAt = 0
      void cycleTheme()
      navigator.vibrate?.(8)
      return
    }
    settingsLastTapAt = now
    if (settingsTapTimer) { clearTimeout(settingsTapTimer) }
    settingsTapTimer = setTimeout(commitSingleTap, DOUBLE_TAP_MS)
  }

  function onSettingsContextMenu(e: Event): void {
    // Defensive: trackpad right-click on macOS desktop / Android long-press
    // fallback can still surface a native menu. Block it — the gear has no
    // contextual affordance.
    e.preventDefault()
  }

  // ---- Mount ----
  onMount(() => {
    const refreshSurahName = () => {
      getSurahs().then((list) => {
        const s = reader.currentSurahNum
        const meta = list.find((x) => x.n === s) as { name?: string; name_ar?: string } | undefined
        surahName = meta?.name ?? ''
        surahArabicName = meta?.name_ar ?? ''
      }).catch(() => { /* ignore */ })
    }
    refreshSurahName()
    const unsubRoute = on(Events.ROUTER_ROUTE_CHANGE, ({ hash }) => {
      currentHash = hash
      refreshSurahName()
    })
    const onHashChange = () => {
      currentHash = window.location.hash || ''
      refreshSurahName()
    }
    window.addEventListener('hashchange', onHashChange)
    const unsubSurface = on(Events.AMBIENT_SURFACE, () => { hidden = false })

    const main = document.getElementById('main-content')
    const onScroll = () => {
      const top = main?.scrollTop ?? 0
      const delta = top - lastTop
      if (!isVerseRoute(window.location.hash)) { hidden = false; return }
      if (top < SHOW_NEAR_TOP) { hidden = false }
      else if (delta > HIDE_DELTA) { hidden = true; lastTop = top }
      else if (delta < -HIDE_DELTA) { hidden = false; lastTop = top }
    }
    main?.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      unsubRoute()
      unsubSurface()
      window.removeEventListener('hashchange', onHashChange)
      main?.removeEventListener('scroll', onScroll)
      if (settingsTapTimer) { clearTimeout(settingsTapTimer); settingsTapTimer = null }
    }
  })
</script>

{#if !onOnboardingRoute && !onAssetsRoute}
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

  {#if labelIsInteractive}
    <div
      class="qa-mh-label"
      role="button"
      tabindex="0"
      aria-label={`Toggle surah header for ${surahName}`}
      ontouchstart={onLabelTouchStart}
      ontouchend={onLabelTouchEnd}
      onclick={onLabelClick}
      onkeydown={onLabelKeyDown}
    >
      <span class="qa-mh-label-ar" dir="rtl" lang="ar">{surahArabicName}</span>
    </div>
  {:else}
    <div
      class="qa-mh-label qa-mh-label--static"
      aria-label={labelHasPage ? `Mushaf page ${currentMushafPage}` : 'QuranAtlas'}
    >
      {#if labelHasPage}
        <span class="qa-mh-page-label">Page {currentMushafPage}</span>
      {:else}
        <span class="qa-mh-wordmark">QuranAtlas</span>
      {/if}
    </div>
  {/if}

  <button
    type="button"
    class="qa-mh-settings"
    aria-label="Open settings"
    onclick={onSettingsTap}
    oncontextmenu={onSettingsContextMenu}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
    </svg>
  </button>
</header>
{/if}
