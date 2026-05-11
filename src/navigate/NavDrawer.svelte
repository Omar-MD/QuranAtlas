<script lang="ts">
  /**
   * Mobile (<1180px): full-screen drawer with two top-level mode tabs:
   *   - Read   — Surahs (default) and Bookmarks sub-tabs.
   *   - Study  — Hub link + 12 grouped layer rows (was the legacy "Review" tab).
   *
   * Read sources:
   *   - Surah     — search + All/Recent above the list, auto-scrolled to and
   *                 highlighting the currently-reading surah.
   *   - Juz       — 30 Juz rows with current/Wird markers.
   *   - Bookmarks — verse-level list grouped by surah, swipe-left to delete.
   *
   * Header: tappable QuranAtlas wordmark (+ ⓘ) → #/about. ✕ closes.
   * No footer — drawer ends with the last list/menu row.
   *
   * Desktop (≥1180px) currently opens the drawer too via AmbientDock kebab;
   * styling on desktop keeps the narrow side-panel look (see nav.css).
   */
  import { onMount, onDestroy, tick } from 'svelte'
  import { SvelteDate } from 'svelte/reactivity'
  import { navDrawerBridge, type DrawerTab, type ReadSubTab } from './nav-drawer-bridge'
  import { reader } from '../read/state.svelte'
  import { settings } from '../configure/state.svelte'
  import { surahs as surahsState } from './surahs/state.svelte'
  import { getSurahs, type SurahMeta } from '../data/dataset'
  import { navigate } from '../core/router'
  import type { SurahCount } from '../data/juz'
  import { getMeaning } from '../data/surah-meanings'
  import { loadRecentSurahs } from '../configure/state-recent-surahs.svelte'
  import { LAYER_GROUPS, LAYER_LABELS } from '../data/tag-layers'
  import { emit, on } from '../core/events'
  import { Events } from '../core/constants'
  import { mushafHrefForCurrentVerse, verseHrefForMushafPage } from '../read/mushaf/mode-switch'
  import { pageHref, parseMushafPageParam } from '../read/mushaf/navigation'
  import BookmarksList from './bookmarks/BookmarksList.svelte'
  import DailyWirdCard from '../read/wird/DailyWirdCard.svelte'
  import WirdDetail, { type SetupPayload } from '../read/wird/WirdDetail.svelte'
  import JuzList from './JuzList.svelte'
  import { createWirdBoundaries } from '../read/wird/metadata'
  import { requestBrowserNotifications } from '../read/wird/notifications'
  import { createWirdPlan, deriveWirdSummary, getLocalDayKey } from '../read/wird/progress'
  import { clearWirdPlan, saveWirdPlan } from '../read/wird/store'
  import type { BrowserNotificationState, QuranRef } from '../read/wird/types'

  const RECENT_SURAHS_CAP = 7
  const MUSHAF_PAGE_COUNT = 604

  let isOpen = $state(false)
  let activeTab = $state<DrawerTab>('read')
  type ReaderMode = 'verse' | 'mushaf'
  type ReadSource = 'surah' | 'juz' | 'bookmarks'
  let readSource = $state<ReadSource>('surah')
  let showingWirdDetail = $state(false)
  let currentHash = $state(typeof window !== 'undefined' ? window.location.hash || '' : '')

  let allSurahs = $state<SurahMeta[]>([])
  let recentSurahs = $state<number[]>([])
  let loaded = $state(false)

  let listEl: HTMLElement | null = $state(null)
  let modeSwitchRequestId = 0

  // Reader unmounts on non-reader routes (About, Review, …) and clears
  // reader.currentSurahNum, so falling back to settings.currentPosition
  // keeps the drawer's "current surah" highlight stable across navigation.
  const currentSurahN = $derived<number | null>(
    reader.currentSurahNum ?? settings.currentPosition?.surah ?? null
  )
  const surahCounts = $derived<SurahCount[]>(
    allSurahs.map((surah) => ({
      n: surah.n,
      count: surah.counts[settings.riwayah] ?? surah.counts.qaloon,
    })),
  )
  const currentRef = $derived<QuranRef | null>(
    settings.currentPosition ? { surah: settings.currentPosition.surah, verse: settings.currentPosition.verse } : null,
  )
  const onMushafRoute = $derived((currentHash || '').startsWith('#/m/'))
  const readerMode = $derived<ReaderMode>(onMushafRoute ? 'mushaf' : 'verse')
  const activeMushafPage = $derived.by(() => {
    const fromRoute = onMushafRoute
      ? parseMushafPageParam((currentHash || '').replace('#/m/', ''))
      : null
    return fromRoute ?? reader.currentMushafPage ?? 1
  })
  const wirdBoundaries = $derived(createWirdBoundaries(surahCounts))
  const wirdSummary = $derived(deriveWirdSummary(settings.wirdPlan ?? null, surahCounts, wirdBoundaries, getLocalDayKey()))

  type ParsedQuery =
    | { kind: 'empty' }
    | { kind: 'ref'; surah: number; verse: number }
    | { kind: 'surahNum'; n: number }
    | { kind: 'verseNum'; v: number }
    | { kind: 'text'; q: string }
  const parsedQuery = $derived.by<ParsedQuery>(() => {
    const q = surahsState.searchQuery.trim()
    if (!q) { return { kind: 'empty' } }
    const ref = q.match(/^(\d+)\s*:\s*(\d+)$/)
    if (ref) {
      return { kind: 'ref', surah: parseInt(ref[1] ?? '0', 10), verse: parseInt(ref[2] ?? '0', 10) }
    }
    const num = q.match(/^(\d+)$/)
    if (num) {
      const n = parseInt(num[1] ?? '0', 10)
      if (n >= 1 && n <= 114) { return { kind: 'surahNum', n } }
      return { kind: 'verseNum', v: n }
    }
    return { kind: 'text', q: q.toLowerCase() }
  })

  const visibleItems = $derived.by<SurahMeta[]>(() => {
    const { filter } = surahsState
    let items: SurahMeta[] = allSurahs
    if (filter === 'recent') {
      const order = new Map(recentSurahs.map((n, i) => [n, i]))
      items = allSurahs
        .filter(s => order.has(s.n))
        .sort((a, b) => (order.get(a.n) ?? 0) - (order.get(b.n) ?? 0))
    }

    const p = parsedQuery
    if (p.kind === 'empty') { return items }
    if (p.kind === 'surahNum') { return items.filter(s => s.n === p.n) }
    if (p.kind === 'verseNum') { return items.filter(s => s.counts[settings.riwayah] >= p.v) }
    if (p.kind === 'ref') {
      return items.filter(s => s.n === p.surah && s.counts[settings.riwayah] >= p.verse)
    }
    return items.filter(s => {
      const name = (s.name ?? '').toLowerCase()
      const meaning = (getMeaning(s.n) ?? '').toLowerCase()
      const ar = (s.name_ar ?? '').toLowerCase()
      return name.includes(p.q) || meaning.includes(p.q) || ar.includes(p.q)
    })
  })

  const searchHint = $derived.by<string | null>(() => {
    const p = parsedQuery
    if (p.kind === 'ref') {
      const meta = allSurahs.find(s => s.n === p.surah)
      if (!meta) { return `No surah ${p.surah}` }
      if (p.verse < 1 || p.verse > meta.counts[settings.riwayah]) {
        return `${meta.name} has ${meta.counts[settings.riwayah]} verses`
      }
      return `Press Enter to jump to ${meta.name} ${p.verse}`
    }
    if (p.kind === 'verseNum') {
      const matchCount = allSurahs.filter(s => s.counts[settings.riwayah] >= p.v).length
      if (matchCount === 0) { return `No surah has ${p.v} verses` }
      return `Surahs with at least ${p.v} verses (${matchCount})`
    }
    return null
  })

  async function open(tab?: DrawerTab, subTab?: ReadSubTab): Promise<void> {
    activeTab = tab ?? 'read'
    readSource = subTab === 'bookmarks' ? 'bookmarks' : 'surah'
    showingWirdDetail = false
    currentHash = window.location.hash || ''
    isOpen = true
    surahsState.filter = 'all'
    surahsState.searchQuery = ''

    // Heavy: surah list (114 entries + meta) — fetch once, reuse.
    // Light: recents — refresh every open so a surah visited since the
    //                  last open shows up. Closes the "sometimes works,
    //                  sometimes doesn't" gap from the prior cache-on-first-
    //                  open behavior.
    if (!loaded) { await loadAllSurahs() }
    await loadRecents()

    await tick()
    if (activeTab === 'read' && readSource === 'surah') { scrollToCurrentSurah() }
  }
  function close(): void { isOpen = false }
  function toggle(tab?: DrawerTab): void {
    if (isOpen) { close() } else { void open(tab) }
  }

  async function loadAllSurahs(): Promise<void> {
    allSurahs = await getSurahs()
    loaded = true
  }

  async function loadRecents(): Promise<void> {
    const surahs = await loadRecentSurahs()
    recentSurahs = surahs.slice(0, RECENT_SURAHS_CAP)
  }

  function scrollToCurrentSurah(): void {
    if (!listEl) { return }
    const cur = currentSurahN
    if (!cur) { return }
    const row = listEl.querySelector<HTMLElement>(`[data-surah="${cur}"]`)
    if (!row) { return }
    const rows = Array.from(listEl.querySelectorAll<HTMLElement>('.qa-nav-drawer-surah-row'))
    const currentIndex = rows.indexOf(row)
    const firstIndex = Math.max(0, currentIndex - 4)
    const firstRow = rows[firstIndex]
    if (firstRow) {
      listEl.scrollTop = firstRow.offsetTop - listEl.offsetTop
      return
    }
    row.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
  }

  function setTab(t: DrawerTab): void {
    activeTab = t
    if (t === 'read' && readSource === 'surah') {
      void tick().then(scrollToCurrentSurah)
    }
  }

  function go(href: string): void {
    close()
    window.location.hash = href
  }

  function goAbout(): void { go('#/about') }
  function goSurah(n: number): void { go(`#/s/${n}`) }
  function goMushafPage(page: number): void {
    const clamped = Math.min(MUSHAF_PAGE_COUNT, Math.max(1, page))
    close()
    navigate(pageHref(clamped))
  }
  function goReviewHub(): void { go('#/review') }
  function goReviewLayer(layer: string): void { go(`#/review?layer=${layer}`) }
  function openWirdDetail(): void { showingWirdDetail = true }
  function closeWirdDetail(): void { showingWirdDetail = false }
  function syncHash(hash: string): void {
    currentHash = hash
  }

  async function switchReaderMode(mode: ReaderMode): Promise<void> {
    if (mode === readerMode) { return }
    const startHash = window.location.hash || currentHash || ''
    const startMode = readerMode
    const requestId = ++modeSwitchRequestId
    close()
    const nextHref = mode === 'mushaf'
      ? await mushafHrefForCurrentVerse()
      : await verseHrefForMushafPage(activeMushafPage)
    if (requestId !== modeSwitchRequestId) { return }
    if ((window.location.hash || '') !== startHash || readerMode !== startMode) {
      return
    }
    navigate(nextHref)
  }

  function continueWird(): void {
    const ref = wirdSummary.nextRef
    if (!ref) { return }
    emit(Events.NAVIGATION_NAVIGATE, { surah: ref.surah, verse: ref.verse })
    close()
  }

  async function createOrUpdateWird(payload: SetupPayload): Promise<void> {
    const today = getLocalDayKey()
    const startRef = payload.startMode === 'beginning' || !settings.currentPosition
      ? { surah: 1, verse: 1 }
      : { surah: settings.currentPosition.surah, verse: settings.currentPosition.verse }
    const last = surahCounts[surahCounts.length - 1]
    if (!last) { return }
    const endRef = { surah: last.n, verse: last.count }
    let targetEndOn = payload.targetEndOn
    if (!targetEndOn && payload.targetDays !== null) {
      const date = new SvelteDate(`${today}T00:00:00`)
      date.setDate(date.getDate() + payload.targetDays - 1)
      targetEndOn = getLocalDayKey(date)
    }
    if (!targetEndOn) { return }

    const plan = createWirdPlan({
      startRef,
      endRef,
      targetEndOn,
      startedOn: today,
      unit: payload.unit,
      reminder: {
        enabled: payload.reminderEnabled,
        time: payload.reminderTime,
        browserNotifications: payload.browserNotifications,
      },
    }, surahCounts, today)

    if (settings.wirdPlan) {
      plan.id = settings.wirdPlan.id
      plan.history = settings.wirdPlan.history
      plan.progress.completedThroughRef = settings.wirdPlan.progress.completedThroughRef
      plan.progress.lastReadRef = settings.wirdPlan.progress.lastReadRef
      plan.progress.nextRef = settings.wirdPlan.progress.nextRef
    }

    await saveWirdPlan(plan)
    showingWirdDetail = false
  }

  async function requestWirdBrowserNotifications(): Promise<BrowserNotificationState> {
    const state = await requestBrowserNotifications()
    if (settings.wirdPlan && settings.wirdPlan.reminder.browserNotifications !== state) {
      await saveWirdPlan({
        ...settings.wirdPlan,
        reminder: {
          ...settings.wirdPlan.reminder,
          browserNotifications: state,
        },
      })
    }
    return state
  }

  function setFilter(f: 'all' | 'recent'): void {
    if (readSource !== 'surah') { return }
    surahsState.filter = f
  }

  function handleSearchInput(e: Event): void {
    if (readSource !== 'surah') { return }
    const input = e.target as HTMLInputElement
    surahsState.searchQuery = input.value
  }

  function commitRefJump(): boolean {
    const p = parsedQuery
    if (p.kind !== 'ref') { return false }
    const meta = allSurahs.find(s => s.n === p.surah)
    if (!meta || p.verse < 1 || p.verse > meta.counts[settings.riwayah]) { return false }
    emit(Events.NAVIGATION_NAVIGATE, { surah: p.surah, verse: p.verse })
    close()
    return true
  }

  function handleSearchKeydown(e: KeyboardEvent): void {
    if (readSource !== 'surah') { return }
    if (e.key === 'Enter') {
      if (commitRefJump()) { e.preventDefault(); return }
      if (visibleItems.length === 1 && visibleItems[0]) {
        e.preventDefault()
        goSurah(visibleItems[0].n)
      }
    }
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') { close() }
  }

  let touchStartX = 0
  let touchStartY = 0
  function onTouchStart(e: TouchEvent): void {
    const t = e.touches[0]
    if (!t) { return }
    touchStartX = t.clientX
    touchStartY = t.clientY
  }
  function onTouchEnd(e: TouchEvent): void {
    // Ignore swipes that started inside the bookmarks list — the row-level
    // swipe-to-delete gesture handles its own horizontal swipe and would
    // otherwise lose to the drawer-close handler (which uses the same
    // dx<-48 threshold).
    const target = e.target as HTMLElement | null
    if (target?.closest('.qa-bookmarks-list')) { return }
    const t = e.changedTouches[0]
    if (!t) { return }
    const dx = t.clientX - touchStartX
    const dy = Math.abs(t.clientY - touchStartY)
    if (dx < -48 && dy < 24) { close() }
  }

  let recentsUnsub: (() => void) | null = null
  let routeUnsub: (() => void) | null = null

  onMount(() => {
    navDrawerBridge.register({ open, close, toggle, isOpen: () => isOpen })
    syncHash(window.location.hash || '')
    // Live-update the Recent list while the drawer is open — App.svelte's
    // trackRecentSurah emits this after each successful IDB write. Without
    // the listener, opening the drawer once + navigating to a new surah +
    // switching to the Recent pill would show stale data until full reload.
    recentsUnsub = on(Events.SETTINGS_RECENT_SURAHS_UPDATED, ({ surahs }) => {
      recentSurahs = surahs.slice(0, RECENT_SURAHS_CAP)
    })
    routeUnsub = on(Events.ROUTER_ROUTE_CHANGE, (payload) => {
      syncHash((payload as { hash?: string } | undefined)?.hash ?? window.location.hash ?? '')
    })
    const onHashChange = () => syncHash(window.location.hash || '')
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
    }
  })

  onDestroy(() => {
    modeSwitchRequestId += 1
    recentsUnsub?.()
    recentsUnsub = null
    routeUnsub?.()
    routeUnsub = null
    navDrawerBridge.unregister()
  })

  function setReadSource(source: ReadSource): void {
    readSource = source
    if (source === 'surah') { void tick().then(scrollToCurrentSurah) }
  }

  const FILTERS = [
    { key: 'all' as const, label: 'All' },
    { key: 'recent' as const, label: 'Recent' },
  ]
</script>

{#if isOpen}
  <button
    type="button"
    class="qa-nav-drawer-backdrop"
    aria-label="Close navigation"
    onclick={close}
  ></button>
  <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
  <aside
    class="qa-nav-drawer"
    role="dialog"
    aria-modal="true"
    aria-label="Navigation"
    tabindex="-1"
    ontouchstart={onTouchStart}
    ontouchend={onTouchEnd}
    onkeydown={handleKeydown}
  >
    <div class="qa-nav-drawer-hdr">
      <div class="qa-nav-drawer-product-row">
        <button
          type="button"
          class="qa-nav-drawer-wordmark"
          aria-label="About QuranAtlas"
          onclick={goAbout}
        >
          <span class="qa-nav-drawer-logo" aria-hidden="true">
            <svg class="qa-nav-drawer-logo-svg" data-icon="brand-rosette" viewBox="0 0 48 48" fill="none">
              <path d="M24 4.5l4.1 5.2 6.6-1.1 1.6 6.4 6.2 2.6-2.9 6 2.9 6-6.2 2.6-1.6 6.4-6.6-1.1L24 43.5l-4.1-5.2-6.6 1.1-1.6-6.4-6.2-2.6 2.9-6-2.9-6 6.2-2.6 1.6-6.4 6.6 1.1L24 4.5Z" />
              <circle cx="24" cy="24" r="12.2" />
              <circle cx="24" cy="24" r="6.2" />
              <path d="M24 16.8v14.4M20.4 21.2c2.4-1.2 4.8-1.2 7.2 0" />
            </svg>
          </span>
          <span class="qa-nav-drawer-wordmark-text">QuranAtlas</span>
        </button>
        <button
          type="button"
          class="qa-nav-drawer-about"
          aria-label="About QuranAtlas"
          onclick={goAbout}
        >
          <span aria-hidden="true">
            <svg data-icon="info" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 10.6v5.6" />
              <path d="M12 7.7h.01" />
            </svg>
          </span>
        </button>
        <button
          type="button"
          class="qa-nav-drawer-close"
          aria-label="Close"
          onclick={close}
        >
          <svg data-icon="close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div class="qa-nav-drawer-mode-rail">
        <div class="qa-nav-drawer-tabs" role="tablist" aria-label="Drawer mode">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'read'}
            class="qa-nav-drawer-tab"
            class:qa-nav-drawer-tab--on={activeTab === 'read'}
            onclick={() => setTab('read')}
          >
            <span class="qa-nav-drawer-tab-icon" aria-hidden="true">
              <svg data-icon="read-book" viewBox="0 0 24 24" fill="none">
                <path d="M5.8 5.8h4.6c1.4 0 2.6 1.1 2.6 2.6v9.8c0-1.2-1.1-2.1-2.6-2.1H5.8V5.8Z" />
                <path d="M18.2 5.8h-4.6c-1.4 0-2.6 1.1-2.6 2.6v9.8c0-1.2 1.1-2.1 2.6-2.1h4.6V5.8Z" />
              </svg>
            </span>
            <span>Read</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'study'}
            class="qa-nav-drawer-tab"
            class:qa-nav-drawer-tab--on={activeTab === 'study'}
            onclick={() => setTab('study')}
          >
            <span class="qa-nav-drawer-tab-icon" aria-hidden="true">
              <svg data-icon="study-cap" viewBox="0 0 24 24" fill="none">
                <path d="M3.8 9.2 12 5.4l8.2 3.8L12 13 3.8 9.2Z" />
                <path d="M7.3 11.1v4.1c1.5 1.3 3.1 2 4.7 2s3.2-.7 4.7-2v-4.1" />
                <path d="M20.2 9.2v5.1" />
              </svg>
            </span>
            <span>Study</span>
          </button>
        </div>
      </div>
    </div>

    {#if activeTab === 'read'}
      {#if showingWirdDetail}
        <WirdDetail
          summary={wirdSummary}
          currentPosition={settings.currentPosition}
          onBack={closeWirdDetail}
          onCreate={(payload) => { void createOrUpdateWird(payload) }}
          onContinue={continueWird}
          onReset={() => { void clearWirdPlan(); closeWirdDetail() }}
          onRequestBrowserNotifications={requestWirdBrowserNotifications}
        />
      {:else}
        <div class="qa-nav-drawer-read">
          <DailyWirdCard summary={wirdSummary} onOpen={openWirdDetail} />

          <div class="qa-nav-drawer-reader-mode" data-testid="reader-mode-switch" aria-label="Reader mode">
            <button
              type="button"
              data-testid="reader-mode-verse"
              aria-pressed={readerMode === 'verse'}
              class="qa-nav-drawer-reader-mode-btn"
              class:qa-nav-drawer-reader-mode-btn--on={readerMode === 'verse'}
              onclick={() => { void switchReaderMode('verse') }}
            >
              <span class="qa-nav-drawer-reader-mode-icon" aria-hidden="true">
                <svg data-icon="mode-verse" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h7a3 3 0 0 1 3 3v13"/>
                  <path d="M20 4h-7a3 3 0 0 0-3 3v13"/>
                  <path d="M4 4v13a2 2 0 0 0 2 2h6"/>
                  <path d="M20 4v13a2 2 0 0 1-2 2h-6"/>
                </svg>
              </span>
              <span>Verse</span>
            </button>
            <button
              type="button"
              data-testid="reader-mode-mushaf"
              aria-pressed={readerMode === 'mushaf'}
              class="qa-nav-drawer-reader-mode-btn"
              class:qa-nav-drawer-reader-mode-btn--on={readerMode === 'mushaf'}
              onclick={() => { void switchReaderMode('mushaf') }}
            >
              <span class="qa-nav-drawer-reader-mode-icon" aria-hidden="true">
                <svg data-icon="mode-mushaf" viewBox="0 0 24 24" fill="none">
                  <path d="M5 4h14v16H5z"/>
                  <path d="M8 8h8"/>
                  <path d="M8 12h8"/>
                  <path d="M8 16h5"/>
                </svg>
              </span>
              <span>Mushaf</span>
            </button>
          </div>

          {#if readerMode === 'mushaf'}
            <div class="qa-nav-drawer-page-controls" data-testid="mushaf-drawer-page" aria-label="Mushaf page controls">
              <div class="qa-nav-drawer-page-summary">
                <span class="qa-nav-drawer-page-kicker">Mushaf</span>
                <span class="qa-nav-drawer-page-title">Page {activeMushafPage}</span>
              </div>
              <div class="qa-nav-drawer-page-actions">
                <button
                  type="button"
                  data-testid="mushaf-prev-page"
                  class="qa-nav-drawer-page-action"
                  aria-label="Previous Mushaf page"
                  disabled={activeMushafPage <= 1}
                  onclick={() => goMushafPage(activeMushafPage - 1)}
                >Prev</button>
                <button
                  type="button"
                  data-testid="mushaf-open-page"
                  class="qa-nav-drawer-page-action qa-nav-drawer-page-action--primary"
                  onclick={() => goMushafPage(activeMushafPage)}
                >Open</button>
                <button
                  type="button"
                  data-testid="mushaf-next-page"
                  class="qa-nav-drawer-page-action"
                  aria-label="Next Mushaf page"
                  disabled={activeMushafPage >= MUSHAF_PAGE_COUNT}
                  onclick={() => goMushafPage(activeMushafPage + 1)}
                >Next</button>
              </div>
            </div>
          {:else}
            <div class="qa-nav-drawer-source-panel">
              <div class="qa-nav-drawer-source-tabs" role="tablist" aria-label="Read source">
                <button
                  type="button"
                  role="tab"
                  data-testid="read-source-surah"
                  aria-selected={readSource === 'surah'}
                  class="qa-nav-drawer-source-tab"
                  class:qa-nav-drawer-source-tab--on={readSource === 'surah'}
                  onclick={() => setReadSource('surah')}
                >Surah</button>
                <button
                  type="button"
                  role="tab"
                  data-testid="read-source-juz"
                  aria-selected={readSource === 'juz'}
                  class="qa-nav-drawer-source-tab"
                  class:qa-nav-drawer-source-tab--on={readSource === 'juz'}
                  onclick={() => setReadSource('juz')}
                >Juz</button>
                <button
                  type="button"
                  role="tab"
                  data-testid="read-source-bookmarks"
                  aria-selected={readSource === 'bookmarks'}
                  class="qa-nav-drawer-source-tab"
                  class:qa-nav-drawer-source-tab--on={readSource === 'bookmarks'}
                  onclick={() => setReadSource('bookmarks')}
                >Bookmarks</button>
              </div>

            {#if readSource === 'surah'}
              <div class="qa-nav-drawer-source-tools" aria-label="Surah controls">
                <label class="qa-nav-drawer-source-search qa-nav-drawer-search">
                  <span class="qa-nav-drawer-search-icon" aria-hidden="true">&#x2315;</span>
                  <input
                    type="search"
                    class="qa-nav-drawer-search-input"
                    placeholder="Search..."
                    aria-label="Search surah by name, number, or verse reference"
                    autocomplete="off"
                    maxlength={20}
                    value={surahsState.searchQuery}
                    oninput={handleSearchInput}
                    onkeydown={handleSearchKeydown}
                  />
                </label>

                <div class="qa-nav-drawer-source-filter" role="tablist" aria-label="Surah filter">
                  {#each FILTERS as f (f.key)}
                    <button
                      type="button"
                      role="tab"
                      class="qa-nav-drawer-filter-option"
                      class:qa-nav-drawer-filter-option--on={surahsState.filter === f.key}
                      aria-selected={surahsState.filter === f.key}
                      onclick={() => setFilter(f.key)}
                    >{f.label}</button>
                  {/each}
                </div>
              </div>
            {/if}
            </div>
          {/if}

          {#if readerMode === 'verse'}
            {#if searchHint && readSource === 'surah'}
              <div class="qa-nav-drawer-search-hint" role="status">{searchHint}</div>
            {/if}

            <div class="qa-nav-drawer-tab-body">
              {#if readSource === 'surah'}
              <div class="qa-nav-drawer-surah-legacy">
                {#if !loaded}
                  <div class="qa-nav-drawer-list-state" aria-live="polite">Loading...</div>
                {:else if visibleItems.length === 0}
                  <div class="qa-nav-drawer-list-state" role="status">No surahs match your search.</div>
                {:else}
                  <ul class="qa-nav-drawer-surah-list" bind:this={listEl}>
                    {#each visibleItems as s (s.n)}
                      <li
                        class="qa-nav-drawer-surah-row"
                        class:qa-nav-drawer-surah-row--current={s.n === currentSurahN}
                        data-surah={s.n}
                      >
                        <button
                          type="button"
                          class="qa-nav-drawer-surah-btn"
                          onclick={() => { if (!commitRefJump()) { goSurah(s.n) } }}
                          aria-label={parsedQuery.kind === 'ref' && parsedQuery.surah === s.n
                            ? `Open ${s.name} verse ${parsedQuery.verse}`
                            : `Open ${s.name}`}
                        >
                          <span class="qa-nav-drawer-surah-num">{s.n}</span>
                          <span class="qa-nav-drawer-surah-copy">
                            <span class="qa-nav-drawer-surah-name">{s.name}</span>
                            <span class="qa-nav-drawer-surah-meta">
                              <span class="qa-nav-drawer-surah-meta-type">Surah &#x2022; </span>{s.counts[settings.riwayah]} verses
                            </span>
                          </span>
                          <span class="qa-nav-drawer-surah-ar" dir="rtl" lang="ar">{s.name_ar}</span>
                          <span class="qa-nav-drawer-surah-chev" aria-hidden="true">&#x203A;</span>
                        </button>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            {:else if readSource === 'juz'}
              <JuzList
                counts={surahCounts}
                names={allSurahs}
                currentRef={currentRef}
                wirdRef={wirdSummary.nextRef}
                onNavigate={(ref) => { emit(Events.NAVIGATION_NAVIGATE, { surah: ref.surah, verse: ref.verse }); close() }}
              />
            {:else}
              <div class="qa-nav-drawer-bookmarks-body">
                <BookmarksList onNavigate={() => close()} />
              </div>
            {/if}
            </div>
          {/if}
        </div>
      {/if}
    {:else}
      <div class="qa-nav-drawer-tab-body qa-nav-drawer-review-body">
        <button
          type="button"
          class="qa-nav-drawer-hub-row"
          onclick={goReviewHub}
        >
          <span class="qa-nav-drawer-hub-icon" aria-hidden="true">&#x25CE;</span>
          <span class="qa-nav-drawer-hub-name">Hub &mdash; all marks</span>
          <span class="qa-nav-drawer-chev" aria-hidden="true">&#x203A;</span>
        </button>

        {#each LAYER_GROUPS as group (group.id)}
          <div class="qa-nav-drawer-group-hdr">{group.name}</div>
          {#each group.layers as layerName (layerName)}
            <button
              type="button"
              class="qa-nav-drawer-layer-row"
              data-layer={layerName}
              onclick={() => goReviewLayer(layerName)}
            >
              <span class="qa-nav-drawer-layer-dot qa-nav-drawer-layer-dot--{group.id}" aria-hidden="true"></span>
              <span class="qa-nav-drawer-layer-name">{LAYER_LABELS[layerName]}</span>
              <span class="qa-nav-drawer-chev" aria-hidden="true">&#x203A;</span>
            </button>
          {/each}
        {/each}
      </div>
    {/if}
  </aside>
{/if}
