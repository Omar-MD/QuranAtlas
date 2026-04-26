<script lang="ts">
  /**
   * Mobile (<1180px): full-screen drawer with two tabs (Surahs / Review).
   * Surahs tab: search + filter pills + surah list, auto-scrolled to the
   * currently-reading surah (highlighted with accent rail + filled circle).
   * Review tab: Hub link + 12 grouped layer rows. Tapping a layer routes
   * to #/review?layer=<name>.
   *
   * Header: tappable QuranAtlas wordmark (+ ⓘ) → #/about. ✕ closes.
   * No footer — drawer ends with the last list/menu row.
   *
   * Desktop (≥1180px) currently opens the drawer too via AmbientDock kebab;
   * styling on desktop keeps the narrow side-panel look (see nav.css).
   */
  import { onMount, tick } from 'svelte'
  import { registerNavDrawer, type DrawerTab } from './nav-drawer-bridge'
  import { reader } from '../state/reader.svelte'
  import { settings } from '../state/settings.svelte'
  import { surahs as surahsState } from '../state/surahs.svelte'
  import { getSurahs, type SurahMeta } from '../data/dataset'
  import { getMeaning } from '../data/surah-meanings'
  import { getAll as getAllMarks } from '../marks/store'
  import { get } from '../core/db'
  import { LAYER_GROUPS, LAYER_LABELS } from '../data/tag-layers'
  import { emit } from '../core/events'
  import { Events } from '../core/constants'

  let isOpen = $state(false)
  let activeTab = $state<DrawerTab>('surahs')

  let allSurahs = $state<SurahMeta[]>([])
  let bookmarkedSet = $state(new Set<number>())
  let recentSurahs = $state<number[]>([])
  let loaded = $state(false)

  let listEl: HTMLElement | null = $state(null)

  // Reader unmounts on non-reader routes (About, Review, …) and clears
  // reader.currentSurahNum, so falling back to settings.currentPosition
  // keeps the drawer's "current surah" highlight stable across navigation.
  const currentSurahN = $derived<number | null>(
    reader.currentSurahNum ?? settings.currentPosition?.surah ?? null
  )

  // Parsed search query — surface different shapes (S:V ref, surah-number,
  // big-number = verse-only, free text). Other derivations key off this.
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
      // 115–286 makes sense as a verse number — only Al-Baqarah (286) holds
      // it. Beyond 286 nothing satisfies, list goes empty.
      return { kind: 'verseNum', v: n }
    }
    return { kind: 'text', q: q.toLowerCase() }
  })

  const visibleItems = $derived.by<SurahMeta[]>(() => {
    const { filter } = surahsState
    let items: SurahMeta[] = allSurahs
    if (filter === 'bookmarked') {
      items = allSurahs.filter(s => bookmarkedSet.has(s.n))
    } else if (filter === 'recent') {
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
      // Show only the target surah if it can hold the verse. Tap or Enter
      // both navigate via goRef() — the row click is the candidate selector.
      return items.filter(s => s.n === p.surah && s.counts[settings.riwayah] >= p.verse)
    }
    return items.filter(s => {
      const name = (s.name ?? '').toLowerCase()
      const meaning = (getMeaning(s.n) ?? '').toLowerCase()
      const ar = ((s as Record<string, unknown>)['arabic'] as string | undefined ?? '').toLowerCase()
      return name.includes(p.q) || meaning.includes(p.q) || ar.includes(p.q)
    })
  })

  // Hint shown above the surah list when the query parses as a verse-jump
  // candidate. Lets the user confirm the jump before pressing Enter, instead
  // of mid-typing "2:255" firing on the partial "2:2".
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

  async function open(tab?: DrawerTab): Promise<void> {
    activeTab = tab ?? 'surahs'
    isOpen = true
    surahsState.filter = 'all'
    surahsState.searchQuery = ''

    if (!loaded) { await loadData() }

    await tick()
    if (activeTab === 'surahs') { scrollToCurrentSurah() }
  }
  function close(): void { isOpen = false }
  function toggle(tab?: DrawerTab): void {
    if (isOpen) { close() } else { void open(tab) }
  }

  async function loadData(): Promise<void> {
    const [fetchedSurahs, marks, recentRec] = await Promise.all([
      getSurahs(),
      getAllMarks().catch(() => []),
      get('settings', 'recentSurahs').catch(() => undefined),
    ])
    allSurahs = fetchedSurahs
    bookmarkedSet = new Set(marks.map(m => parseInt(m.verseKey.split(':')[0] ?? '0', 10)))
    recentSurahs = Array.isArray(recentRec?.value) ? (recentRec.value as number[]).slice(0, 5) : []
    loaded = true
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
    if (t === 'surahs') {
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

  function setFilter(f: 'all' | 'bookmarked' | 'recent'): void {
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
      // Enter on a single-surah filter (numeric / unique text match) opens it.
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
    const t = e.changedTouches[0]
    if (!t) { return }
    const dx = t.clientX - touchStartX
    const dy = Math.abs(t.clientY - touchStartY)
    if (dx < -48 && dy < 24) { close() }
  }

  onMount(() => {
    registerNavDrawer(open, close, toggle)
  })

  const FILTERS = [
    { key: 'all' as const, label: 'All' },
    { key: 'bookmarked' as const, label: '★ Bookmarked' },
    { key: 'recent' as const, label: '⏱ Recent' },
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
      <button
        type="button"
        class="qa-nav-drawer-close"
        aria-label="Close"
        onclick={close}
      >&#x2715;</button>
    </div>

    <div class="qa-nav-drawer-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'surahs'}
        class="qa-nav-drawer-tab"
        class:qa-nav-drawer-tab--on={activeTab === 'surahs'}
        onclick={() => setTab('surahs')}
      >Surahs</button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'review'}
        class="qa-nav-drawer-tab"
        class:qa-nav-drawer-tab--on={activeTab === 'review'}
        onclick={() => setTab('review')}
      >Review</button>
    </div>

    {#if activeTab === 'surahs'}
      <div class="qa-nav-drawer-tab-body">
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

        <div class="qa-nav-drawer-pills" role="tablist" aria-label="Filter">
          {#each FILTERS as f (f.key)}
            <button
              type="button"
              role="tab"
              class="qa-nav-drawer-pill"
              class:qa-nav-drawer-pill--on={surahsState.filter === f.key}
              aria-selected={surahsState.filter === f.key}
              onclick={() => setFilter(f.key)}
            >{f.label}</button>
          {/each}
        </div>

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
                {#if bookmarkedSet.has(s.n)}
                  <span class="qa-nav-drawer-surah-star" aria-hidden="true">&#9733;</span>
                {/if}
                <span class="qa-nav-drawer-surah-ar" dir="rtl" lang="ar">{(s as { arabic?: string }).arabic ?? ''}</span>
              </button>
            </li>
          {/each}
        </ul>
      </div>
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
