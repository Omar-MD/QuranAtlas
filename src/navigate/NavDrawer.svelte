<script lang="ts">
  /**
   * Mobile (<1180px): full-screen drawer with two top-level mode tabs:
   *   - Read   — Surahs (default) and Bookmarks sub-tabs.
   *   - Study  — Hub link + 12 grouped layer rows (was the legacy "Review" tab).
   *
   * Read sub-tabs:
   *   - Surahs    — compact header rail (Browse / Surahs + All | Recent
   *                 switch) above search + scrolling surah list,
   *                 auto-scrolled to and highlighting the currently-reading
   *                 surah.
   *   - Bookmarks — verse-level list grouped by surah, swipe-left to delete.
   *                 Reading-mode entry replacing the legacy ★ Bookmarked pill.
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
  import type { SurahCount } from '../data/juz'
  import { getMeaning } from '../data/surah-meanings'
  import { loadRecentSurahs } from '../configure/state-recent-surahs.svelte'
  import { LAYER_GROUPS, LAYER_LABELS } from '../data/tag-layers'
  import { emit, on } from '../core/events'
  import { Events } from '../core/constants'
  import BookmarksList from './bookmarks/BookmarksList.svelte'
  import DailyWirdCard from '../read/wird/DailyWirdCard.svelte'
  import WirdDetail, { type SetupPayload } from '../read/wird/WirdDetail.svelte'
  import JuzList from './JuzList.svelte'
  import { createWirdPlan, deriveWirdSummary, getLocalDayKey } from '../read/wird/progress'
  import { clearWirdPlan, saveWirdPlan } from '../read/wird/store'
  import type { QuranRef } from '../read/wird/types'

  const RECENT_SURAHS_CAP = 7

  let isOpen = $state(false)
  let activeTab = $state<DrawerTab>('read')
  type ReadDestination = 'browse' | 'bookmarks'
  type BrowseMode = 'surah' | 'juz'
  let readDestination = $state<ReadDestination>('browse')
  let browseMode = $state<BrowseMode>('surah')
  let showingWirdDetail = $state(false)

  let allSurahs = $state<SurahMeta[]>([])
  let recentSurahs = $state<number[]>([])
  let loaded = $state(false)

  let listEl: HTMLElement | null = $state(null)

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
  const wirdSummary = $derived(deriveWirdSummary(settings.wirdPlan ?? null, surahCounts, getLocalDayKey()))

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
    readDestination = subTab === 'bookmarks' ? 'bookmarks' : 'browse'
    browseMode = 'surah'
    showingWirdDetail = false
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
    if (activeTab === 'read' && readDestination === 'browse' && browseMode === 'surah') { scrollToCurrentSurah() }
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
    if (row) { row.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }) }
  }

  function setTab(t: DrawerTab): void {
    activeTab = t
    if (t === 'read' && readDestination === 'browse' && browseMode === 'surah') {
      void tick().then(scrollToCurrentSurah)
    }
  }

  function go(href: string): void {
    close()
    window.location.hash = href
  }

  function goAbout(): void { go('#/about') }
  function goSurah(n: number): void { go(`#/s/${n}`) }
  function goReviewHub(): void { go('#/review') }
  function goReviewLayer(layer: string): void { go(`#/review?layer=${layer}`) }
  function openWirdDetail(): void { showingWirdDetail = true }
  function closeWirdDetail(): void { showingWirdDetail = false }

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
        browserNotifications: payload.browserNotifications ? 'granted' : 'default',
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

  function setFilter(f: 'all' | 'recent'): void {
    surahsState.filter = f
  }

  function handleSearchInput(e: Event): void {
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

  onMount(() => {
    navDrawerBridge.register({ open, close, toggle, isOpen: () => isOpen })
    // Live-update the Recent list while the drawer is open — App.svelte's
    // trackRecentSurah emits this after each successful IDB write. Without
    // the listener, opening the drawer once + navigating to a new surah +
    // switching to the Recent pill would show stale data until full reload.
    recentsUnsub = on(Events.SETTINGS_RECENT_SURAHS_UPDATED, ({ surahs }) => {
      recentSurahs = surahs.slice(0, RECENT_SURAHS_CAP)
    })
  })

  onDestroy(() => {
    recentsUnsub?.()
    recentsUnsub = null
    navDrawerBridge.unregister()
  })

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
      <button
        type="button"
        class="qa-nav-drawer-wordmark"
        aria-label="About QuranAtlas"
        onclick={goAbout}
      >
        <span class="qa-nav-drawer-wordmark-text">QuranAtlas</span>
        <span class="qa-nav-drawer-info" aria-hidden="true">about</span>
      </button>
      <div class="qa-nav-drawer-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'read'}
          class="qa-nav-drawer-tab"
          class:qa-nav-drawer-tab--on={activeTab === 'read'}
          onclick={() => setTab('read')}
        >Read</button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'study'}
          class="qa-nav-drawer-tab"
          class:qa-nav-drawer-tab--on={activeTab === 'study'}
          onclick={() => setTab('study')}
        >Study</button>
      </div>
      <button
        type="button"
        class="qa-nav-drawer-close"
        aria-label="Close"
        onclick={close}
      >&#x2715;</button>
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
          onRequestBrowserNotifications={() => {}}
        />
      {:else}
        <div class="qa-nav-drawer-read">
          <DailyWirdCard summary={wirdSummary} onOpen={openWirdDetail} />
          <div class="qa-nav-drawer-dest-switch" role="tablist" aria-label="Read destination">
            <button
              type="button"
              role="tab"
              aria-selected={readDestination === 'browse'}
              class="qa-nav-drawer-dest"
              class:qa-nav-drawer-dest--on={readDestination === 'browse'}
              onclick={() => { readDestination = 'browse' }}
            >Browse</button>
            <button
              type="button"
              role="tab"
              aria-selected={readDestination === 'bookmarks'}
              class="qa-nav-drawer-dest"
              class:qa-nav-drawer-dest--on={readDestination === 'bookmarks'}
              onclick={() => { readDestination = 'bookmarks' }}
            >Bookmarks</button>
          </div>

          {#if readDestination === 'browse'}
            <div class="qa-nav-drawer-tab-body">
          <div class="qa-nav-drawer-surah-rail">
            <div class="qa-nav-drawer-surah-rail-copy">
              <span class="qa-nav-drawer-surah-rail-eyebrow">Browse</span>
                  <span class="qa-nav-drawer-surah-rail-title">{browseMode === 'surah' ? 'Surahs' : 'Juz'}</span>
            </div>

            <div class="qa-nav-drawer-rail-switch" role="tablist" aria-label="Browse mode">
                <button
                  type="button"
                  role="tab"
                      data-testid="browse-mode-surah"
                  class="qa-nav-drawer-rail-switch-option"
                      class:qa-nav-drawer-rail-switch-option--on={browseMode === 'surah'}
                      aria-selected={browseMode === 'surah'}
                      onclick={() => { browseMode = 'surah'; void tick().then(scrollToCurrentSurah) }}
                    >Surah</button>
                    <button
                      type="button"
                      role="tab"
                      data-testid="browse-mode-juz"
                      class="qa-nav-drawer-rail-switch-option"
                      class:qa-nav-drawer-rail-switch-option--on={browseMode === 'juz'}
                      aria-selected={browseMode === 'juz'}
                      onclick={() => { browseMode = 'juz' }}
                    >Juz</button>
            </div>
          </div>
              {#if browseMode === 'surah'}
                <div class="qa-nav-drawer-surah-legacy">
                  <div class="qa-nav-drawer-rail-switch" role="tablist" aria-label="Surah filter">
                    {#each FILTERS as f (f.key)}
                      <button
                        type="button"
                        role="tab"
                        class="qa-nav-drawer-rail-switch-option"
                        class:qa-nav-drawer-rail-switch-option--on={surahsState.filter === f.key}
                        aria-selected={surahsState.filter === f.key}
                        onclick={() => setFilter(f.key)}
                      >{f.label}</button>
                    {/each}
                  </div>

                  <label class="qa-nav-drawer-search">
                    <span class="qa-nav-drawer-search-icon" aria-hidden="true">&#x2315;</span>
                    <input
                      type="search"
                      class="qa-nav-drawer-search-input"
                      placeholder="Search surah or 2:255"
                      aria-label="Search surah by name, number, or verse reference"
                      autocomplete="off"
                      maxlength={20}
                      value={surahsState.searchQuery}
                      oninput={handleSearchInput}
                      onkeydown={handleSearchKeydown}
                    />
                  </label>

                  {#if searchHint}
                    <div class="qa-nav-drawer-search-hint" role="status">{searchHint}</div>
                  {/if}

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
                          <span class="qa-nav-drawer-surah-name">{s.name}</span>
                          <span class="qa-nav-drawer-surah-ar" dir="rtl" lang="ar">{s.name_ar}</span>
                        </button>
                      </li>
                    {/each}
                  </ul>
                </div>
              {:else}
                <JuzList
                  counts={surahCounts}
                  names={allSurahs}
                  currentRef={currentRef}
                  wirdRef={wirdSummary.nextRef}
                  onNavigate={(ref) => { emit(Events.NAVIGATION_NAVIGATE, { surah: ref.surah, verse: ref.verse }); close() }}
                />
              {/if}
            </div>
          {:else}
            <div class="qa-nav-drawer-tab-body qa-nav-drawer-bookmarks-body">
              <BookmarksList onNavigate={() => close()} />
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
