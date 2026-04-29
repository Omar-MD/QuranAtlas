<script lang="ts">
  import { onMount } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import ReviewCard from './ReviewCard.svelte'
  import { getAll, getByLayerCanonical, getAllCanonicalValues } from '../marks/store'
  import type { Mark } from '../marks/store'
  import { getColorForTag } from '../marks/tags'
  import { getSurahs } from '../data/dataset'
  import type { SurahMeta } from '../data/dataset'
  import { emit, on } from '../core/events'
  import { Events } from '../core/constants'
  import { LAYER_NAMES, type LayerName } from '../core/db'
  import { persistLastSurface } from '../state/last-surface.svelte'
  import { logger } from '../core/logger'
  import { save as saveState, load as loadState, getDefaultState } from './state'
  import { parseLayerFromHash } from './parse-layer-query'
  import { clearUndoToast } from '../core/ui-bridge'
  import { validateLayerParam } from '../safety/input-validator'
  import { announce } from '../a11y/announcer'
  import { review } from '../state/review.svelte'
  import { openEditor as _openEditor } from '../marks/editor-bridge'

  // Props: layer + value are present when route is #/<layer>/:value (FVR)
  // tag is the legacy prop from #/t/:tag — handled as threads layer for backward compat
  const { layer: layerParam, value: valueParam, tag: tagParam }: {
    layer?: string
    value?: string
    tag?: string
  } = $props()

  function callOpenEditor(verseKey: string) {
    _openEditor(verseKey)
  }

  const PAGE_SIZE = 30

  // Human-readable labels for each layer
  const LAYER_LABELS: Record<LayerName, string> = {
    threads:      'Thread',
    subjects:     'Subject',
    audience:     'Audience',
    speaker:      'Speaker',
    quotedSpeaker:'Quoted',
    mode:         'Mode',
    form:         'Form',
    tone:         'Tone',
    people:       'People',
    places:       'Places',
    events:       'Event',
    divineNames:  'Name',
  }

  // ── View state ────────────────────────────────────────────────────────────
  type HubView = 'all' | 'fvr' | 'not-found'

  let hubView = $state<HubView>('all')
  let notFoundTag = $state('')

  // FVR header data
  let fvrLayer = $state<LayerName>('threads')
  let fvrValue = $state('')
  let fvrVerseCount = $state(0)
  let fvrSurahCount = $state(0)

  // Marks data
  let allMarks = $state<Mark[]>([])
  let sortedMarks = $state<Mark[]>([])
  let filteredMarks = $state<Mark[]>([])
  let displayedMarks = $state<Mark[]>([])
  let hasMore = $state(false)

  // Layer selector + value chips
  let valuePool = $state<string[]>([])

  // Surahs metadata
  let surahs = $state<SurahMeta[]>([])

  // Desktop rail: accumulated active groups
  const railActiveTags = new SvelteSet<string>()
  let railActiveGroup = $state<string | null>(null)

  const isDesktop = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 1180px)').matches
    : false

  // ── Helpers ───────────────────────────────────────────────────────────────

  function sortKeyToField(sortKey: string): string {
    return sortKey === 'created' ? 'createdAt' : 'updatedAt'
  }

  function sortMarks(marks: Mark[], sortKey: string): Mark[] {
    const field = sortKeyToField(sortKey) as keyof Mark
    return [...marks].sort((a, b) => {
      const av = a[field]
      const bv = b[field]
      if (typeof av === 'number' && typeof bv === 'number') { return bv - av }
      return 0
    })
  }

  function filterMarks(sorted: Mark[], activeLayer: string, activeValue: string | null, surahFilter: number | null): Mark[] {
    let result = sorted
    if (activeValue) {
      result = result.filter(m => {
        const layer = activeLayer as LayerName
        return m._canon[layer]?.includes(activeValue) ?? false
      })
    }
    if (surahFilter) {
      const surahPrefix = `${surahFilter}:`
      result = result.filter(m => m.verseKey.startsWith(surahPrefix))
    }
    return result
  }

  function getSurahMeta(verseKey: string): SurahMeta | undefined {
    const sNum = parseInt(verseKey.split(':')[0] ?? '0', 10)
    return surahs.find(s => s.n === sNum)
  }

  function computeRailBuckets(marks: Mark[], groupBy: string): { key: string; label: string; count: number; dotColor?: string }[] {
    if (groupBy === 'surah') {
      const bySurah: Record<number, number> = {}
      for (const m of marks) {
        const s = parseInt(m.verseKey.split(':')[0] ?? '0', 10)
        bySurah[s] = (bySurah[s] ?? 0) + 1
      }
      return Object.entries(bySurah)
        .map(([nStr, count]) => [parseInt(nStr, 10), count] as [number, number])
        .sort((a, b) => a[0] - b[0])
        .map(([n, count]) => {
          const meta = surahs.find(s => s.n === n)
          return { key: String(n), label: meta ? meta.name : `Surah ${n}`, count }
        })
    }
    if (groupBy === 'flat') {
      const byMonth: Record<string, number> = {}
      for (const m of marks) {
        const d = m.createdAt ? new Date(m.createdAt) : null
        if (!d) { continue }
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        byMonth[ym] = (byMonth[ym] ?? 0) + 1
      }
      return Object.entries(byMonth)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([ym, count]) => ({ key: ym, label: ym, count }))
    }
    // tag (default) — use activeLayer canonical values
    const layer = review.activeLayer as LayerName
    const byVal: Record<string, number> = {}
    for (const m of marks) {
      for (const v of m._canon[layer] ?? []) {
        byVal[v] = (byVal[v] ?? 0) + 1
      }
    }
    return Object.entries(byVal)
      .sort((a, b) => b[1] - a[1])
      .map(([val, count]) => ({ key: val, label: val, count, dotColor: getColorForTag(val) }))
  }

  // ── Derived display list ───────────────────────────────────────────────────

  $effect(() => {
    let result = filterMarks(sortedMarks, review.activeLayer, review.activeValue, review.surahFilter)

    if (isDesktop) {
      if (review.groupBy === 'tag' && railActiveTags.size > 0) {
        const layer = review.activeLayer as LayerName
        result = result.filter(m => m._canon[layer]?.some(t => railActiveTags.has(t)) ?? false)
      } else if (review.groupBy === 'surah' && railActiveGroup !== null) {
        const surahNum = parseInt(railActiveGroup, 10)
        result = result.filter(m => parseInt(m.verseKey.split(':')[0] ?? '0', 10) === surahNum)
      } else if (review.groupBy === 'flat' && railActiveGroup !== null) {
        result = result.filter(m => {
          const d = m.createdAt ? new Date(m.createdAt) : null
          if (!d) { return false }
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          return ym === railActiveGroup
        })
      }
    }

    filteredMarks = result
    displayedMarks = result.slice(0, PAGE_SIZE)
    hasMore = result.length > PAGE_SIZE
  })

  // ── Unique surahs for surah filter dropdown ────────────────────────────────

  const surahsWithMarks = $derived([...new Set(allMarks.map(m => parseInt(m.verseKey.split(':')[0] ?? '0', 10)))].sort((a, b) => a - b))
  const railBuckets = $derived(computeRailBuckets(allMarks, review.groupBy))

  // ── Reload from IDB ────────────────────────────────────────────────────────

  async function reloadMarks() {
    allMarks = await getAll()
    sortedMarks = sortMarks(allMarks, review.sort)
    valuePool = await getAllCanonicalValues(review.activeLayer as LayerName)
  }

  async function reloadValuePool() {
    valuePool = await getAllCanonicalValues(review.activeLayer as LayerName)
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleLayerChange(layer: LayerName) {
    review.activeLayer = layer
    review.activeValue = null
    review.groupBy = 'tag'
    railActiveTags.clear()
    railActiveGroup = null
    await reloadValuePool()
    await saveState({
      view: review.view,
      activeTag: null,
      activeLayer: layer,
      activeValue: null,
      surahFilter: review.surahFilter,
      sortBy: sortKeyToField(review.sort),
      groupBy: review.groupBy,
    })
  }

  async function handleValueChipClick(val: string) {
    if (review.activeValue === val) {
      review.activeValue = null
    } else {
      review.activeValue = val
    }
    await saveState({
      view: review.view,
      activeTag: null,
      activeLayer: review.activeLayer,
      activeValue: review.activeValue,
      surahFilter: review.surahFilter,
      sortBy: sortKeyToField(review.sort),
      groupBy: review.groupBy,
    })
  }

  async function handleGroupByChange(value: string) {
    review.groupBy = value
    review.activeTags = []
    railActiveTags.clear()
    railActiveGroup = null
    await saveState({
      view: review.view,
      activeTag: null,
      activeLayer: review.activeLayer,
      activeValue: review.activeValue,
      surahFilter: review.surahFilter,
      sortBy: sortKeyToField(review.sort),
      groupBy: review.groupBy,
    })
  }

  async function handleSortChange(value: string) {
    review.sort = value
    sortedMarks = sortMarks(allMarks, review.sort)
    await saveState({
      view: review.view,
      activeTag: null,
      activeLayer: review.activeLayer,
      activeValue: review.activeValue,
      surahFilter: review.surahFilter,
      sortBy: sortKeyToField(review.sort),
      groupBy: review.groupBy,
    })
  }

  async function handleSurahFilterChange(value: string) {
    review.surahFilter = value ? parseInt(value, 10) : null
    await saveState({
      view: review.view,
      activeTag: null,
      activeLayer: review.activeLayer,
      activeValue: review.activeValue,
      surahFilter: review.surahFilter,
      sortBy: sortKeyToField(review.sort),
      groupBy: review.groupBy,
    })
  }

  async function clearValueFilter() {
    review.activeValue = null
    await saveState({
      view: review.view,
      activeTag: null,
      activeLayer: review.activeLayer,
      activeValue: null,
      surahFilter: review.surahFilter,
      sortBy: sortKeyToField(review.sort),
      groupBy: review.groupBy,
    })
  }

  async function clearSurahFilter() {
    review.surahFilter = null
    await saveState({
      view: review.view,
      activeTag: null,
      activeLayer: review.activeLayer,
      activeValue: review.activeValue,
      surahFilter: null,
      sortBy: sortKeyToField(review.sort),
      groupBy: review.groupBy,
    })
  }

  async function clearAllFilters() {
    review.activeValue = null
    review.surahFilter = null
    await saveState({
      view: review.view,
      activeTag: null,
      activeLayer: review.activeLayer,
      activeValue: null,
      surahFilter: null,
      sortBy: sortKeyToField(review.sort),
      groupBy: review.groupBy,
    })
  }

  function loadMoreMarks() {
    const nextPage = filteredMarks.slice(displayedMarks.length, displayedMarks.length + PAGE_SIZE)
    displayedMarks = [...displayedMarks, ...nextPage]
    hasMore = displayedMarks.length < filteredMarks.length
  }

  function toggleRailTag(key: string) {
    if (railActiveTags.has(key)) {
      railActiveTags.delete(key)
    } else {
      railActiveTags.add(key)
    }
  }

  function toggleRailGroup(key: string) {
    railActiveGroup = railActiveGroup === key ? null : key
  }

  function removeRailTag(tag: string) {
    railActiveTags.delete(tag)
  }

  function clearAllRailTags() {
    railActiveTags.clear()
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  let _unsubSync: (() => void) | null = null
  let _unsubVisible: (() => void) | null = null

  async function doInit() {
    review.activeTags = []
    railActiveGroup = null

    try {
      surahs = await getSurahs()
    } catch (error) {
      logger.error('Failed to load surahs for Review Hub:', { error })
      surahs = []
    }

    // Resolve FVR params — new scheme: layer + value; legacy: tag (threads layer)
    const fvrLayerRaw = layerParam ?? (tagParam !== undefined ? 'threads' : undefined)
    const fvrValueRaw = valueParam ?? tagParam

    if (fvrLayerRaw !== undefined && fvrValueRaw !== undefined) {
      // FVR mode — validate layer + value
      const validation = validateLayerParam(fvrLayerRaw, fvrValueRaw)

      if (!validation.valid) {
        hubView = 'not-found'
        notFoundTag = String(fvrValueRaw ?? '').slice(0, 50)
        announce(`No marks found for "${notFoundTag}". Visit Review Hub to browse your marks.`)
        return
      }

      const { layer, canonical } = validation
      const marks = await getByLayerCanonical(layer, canonical)

      if (marks.length === 0) {
        hubView = 'not-found'
        notFoundTag = String(fvrValueRaw ?? '').slice(0, 50)
        announce(`No marks found for "${notFoundTag}". Visit Review Hub to browse your marks.`)
        return
      }

      // Persist FVR state
      const lastSurfaceHash = tagParam !== undefined
        ? `#/threads/${encodeURIComponent(canonical)}`
        : `#/${layer}/${encodeURIComponent(canonical)}`

      await saveState({
        view: 'fvr',
        activeTag: canonical,
        activeLayer: layer,
        activeValue: canonical,
        surahFilter: null,
        sortBy: 'updatedAt',
        groupBy: 'surah',
      })
      await persistLastSurface(lastSurfaceHash)

      review.view = 'fvr'
      review.groupBy = 'surah'
      review.sort = 'recent'
      review.activeTag = canonical
      review.activeLayer = layer
      review.activeValue = canonical
      review.activeTags = []
      review.surahFilter = null

      allMarks = marks
      sortedMarks = sortMarks(marks, review.sort)

      fvrLayer = layer
      fvrValue = canonical
      fvrVerseCount = marks.length
      fvrSurahCount = new Set(marks.map(m => parseInt(m.verseKey.split(':')[0] ?? '0', 10))).size

      hubView = 'fvr'
      emit(Events.REVIEW_OPEN, {})
      return
    }

    // Normal review hub flow
    const saved = await loadState()
    const loaded = saved ?? getDefaultState()

    if (loaded.view === 'fvr') { loaded.view = 'all' }

    const sortVal = loaded.sortBy === 'createdAt' ? 'created' : 'recent'

    review.view = loaded.view
    review.groupBy = loaded.groupBy ?? 'tag'
    review.sort = sortVal
    review.activeTag = loaded.activeTag ?? null
    review.activeLayer = loaded.activeLayer ?? 'threads'
    review.activeValue = loaded.activeValue ?? null
    review.activeTags = []
    review.surahFilter = loaded.surahFilter ?? null

    // Override activeLayer if URL carries ?layer=<name>; lets the NavDrawer
    // Review tab deep-link a layer without a new route pattern.
    const queryLayer = parseLayerFromHash(window.location.hash)
    if (queryLayer) {
      review.activeLayer = queryLayer
      review.activeValue = null
    }

    await reloadMarks()

    hubView = 'all'
    emit(Events.REVIEW_OPEN, {})

    _unsubSync = on(Events.SYNC_UPDATE_RECEIVED, async () => {
      await reloadMarks()
    })

    _unsubVisible = on(Events.DB_VISIBILITY_VISIBLE, async () => {
      await reloadMarks()
    })
  }

  function onHashChange(): void {
    const q = parseLayerFromHash(window.location.hash)
    if (q && q !== review.activeLayer) {
      review.activeLayer = q
      review.activeValue = null
      void reloadMarks()
    }
  }

  onMount(() => {
    doInit().catch(err => logger.error('Hub init failed:', { error: err }))
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      if (_unsubSync) { _unsubSync(); _unsubSync = null }
      if (_unsubVisible) { _unsubVisible(); _unsubVisible = null }
      review.activeTags = []
      review.view = 'all'
      review.groupBy = 'tag'
      review.sort = 'recent'
      review.activeTag = null
      review.activeLayer = 'threads'
      review.activeValue = null
      review.surahFilter = null
      allMarks = []
      sortedMarks = []
      clearUndoToast()
    }
  })
</script>

<!-- ── Not-found state ─────────────────────────────────────────────────── -->
{#if hubView === 'not-found'}
  <div class="qa-review-tag-not-found">
    <h2>Not found</h2>
    <p>No marks found for "{notFoundTag}".</p>
    <a href="#/review" class="qa-review-hub-link">Go to Review Hub</a>
  </div>

<!-- ── FVR layout ────────────────────────────────────────────────────────── -->
{:else if hubView === 'fvr'}
  <div class="qa-fvr-layout">
    <div class="qa-fvr-header">
      <a class="qa-fvr-back" href="#/review">← Marks</a>
      <div class="qa-fvr-title-block">
        <div class="qa-fvr-label">{LAYER_LABELS[fvrLayer] ?? fvrLayer}</div>
        <h1 class="qa-fvr-title">
          <span class="qa-fvr-dot" style:background-color={getColorForTag(fvrValue)}></span>
          <span class="qa-fvr-name">{fvrValue}</span>
        </h1>
        <div class="qa-fvr-stats">
          <span><strong>{fvrVerseCount}</strong> verse{fvrVerseCount === 1 ? '' : 's'}</span>
          <span class="qa-fvr-sep">·</span>
          <span><strong>{fvrSurahCount}</strong> surah{fvrSurahCount === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>

    <div class="qa-review-card-list">
      {#each displayedMarks as mark (mark.verseKey)}
        <ReviewCard
          {mark}
          surahMeta={getSurahMeta(mark.verseKey)}
          openEditor={callOpenEditor}
        />
      {/each}
    </div>

    {#if hasMore}
      <button class="qa-review-load-more" onclick={loadMoreMarks}>
        Load more
      </button>
    {/if}
  </div>

<!-- ── All-marks hub ─────────────────────────────────────────────────────── -->
{:else if hubView === 'all'}
  {#if allMarks.length === 0 && sortedMarks.length === 0}
    <div class="qa-review-empty">
      No marks yet. Start reading and mark verses to see them here.
    </div>
  {:else if isDesktop}
    <!-- Desktop: left rail + main column -->
    <div class="qa-review-layout">
      <!-- Left rail -->
      <aside class="qa-review-rail">
        <!-- Layer selector -->
        <div class="qa-review-rail-section">Layer</div>
        {#each LAYER_NAMES as ln (ln)}
          <button
            type="button"
            class="qa-review-rail-row"
            class:qa-review-rail-row--on={review.activeLayer === ln}
            data-layer={ln}
            onclick={() => handleLayerChange(ln)}
          >
            <span>{LAYER_LABELS[ln]}</span>
            <span class="qa-review-rail-count">{allMarks.filter(m => (m._canon[ln]?.length ?? 0) > 0).length}</span>
          </button>
        {/each}

        <div class="qa-review-rail-section">Group by</div>
        <div class="qa-review-seg" style="width:100%;display:flex">
          {#each [['surah', 'Surah'], ['flat', 'Date'], ['tag', 'Value']] as groupItem (groupItem[0])}
            <button
              type="button"
              class="qa-review-seg-item"
              class:qa-review-seg-item--on={review.groupBy === groupItem[0]}
              style="flex:1"
              onclick={() => { handleGroupByChange(groupItem[0] ?? 'tag'); railActiveGroup = null }}
            >{groupItem[1]}</button>
          {/each}
        </div>

        <div class="qa-review-rail-section">
          {review.groupBy === 'surah' ? 'Surahs' : review.groupBy === 'flat' ? 'Dates' : 'Values'}
        </div>

        {#each railBuckets as bucket (bucket.key)}
          {@const isOn = review.groupBy === 'tag' ? railActiveTags.has(bucket.key) : railActiveGroup === bucket.key}
          <button
            type="button"
            class="qa-review-rail-row"
            class:qa-review-rail-row--on={isOn}
            onclick={() => { if (review.groupBy === 'tag') { toggleRailTag(bucket.key) } else { toggleRailGroup(bucket.key) } }}
          >
            {#if bucket.dotColor}
              <span class="qa-review-rail-dot" style:background-color={bucket.dotColor}></span>
            {/if}
            <span>{bucket.label}</span>
            <span class="qa-review-rail-count">{bucket.count}</span>
          </button>
        {/each}
      </aside>

      <!-- Main column -->
      <div class="qa-review-main">
        <!-- Filter bar for active rail tags (desktop + tag mode) -->
        {#if review.groupBy === 'tag' && railActiveTags.size > 0}
          <div class="qa-review-filter-bar">
            <span class="qa-review-filter-bar-label">Filtering by</span>
            {#each Array.from(railActiveTags) as tag (tag)}
              <span class="qa-review-filter-chip">
                <span class="qa-review-filter-chip-dot" style:background-color={getColorForTag(tag)}></span>
                {tag}
                <button
                  type="button"
                  aria-label="Remove {tag} filter"
                  onclick={() => removeRailTag(tag)}
                >×</button>
              </span>
            {/each}
            <button type="button" class="qa-review-filter-bar-clear" onclick={clearAllRailTags}>Clear all</button>
          </div>
        {/if}

        <!-- Cards -->
        <div class="qa-review-card-list">
          {#if filteredMarks.length === 0}
            <div class="qa-review-no-results">
              No marks match your filters.
              <br />
              <button class="qa-review-clear-filter" onclick={clearAllFilters}>Clear filter</button>
            </div>
          {:else}
            {#each displayedMarks as mark (mark.verseKey)}
              <ReviewCard
                {mark}
                surahMeta={getSurahMeta(mark.verseKey)}
                openEditor={callOpenEditor}
              />
            {/each}

            {#if hasMore}
              <button class="qa-review-load-more" onclick={loadMoreMarks}>
                Load more
              </button>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <!-- Mobile: controls + cards -->
    <div class="qa-review-controls">
      <!-- Layer segment pill -->
      <div
        class="qa-review-layer-seg qa-review-seg"
        role="tablist"
        aria-label="Layer"
        style="grid-column:1/-1"
      >
        {#each LAYER_NAMES as ln (ln)}
          <button
            type="button"
            class="qa-review-seg-item"
            class:qa-review-seg-item--on={review.activeLayer === ln}
            role="tab"
            aria-selected={review.activeLayer === ln}
            data-layer={ln}
            onclick={() => handleLayerChange(ln)}
          >{LAYER_LABELS[ln]}</button>
        {/each}
      </div>

      <!-- Group segment pill -->
      <div class="qa-review-seg" role="tablist" aria-label="Group by">
        {#each [['tag', 'Value'], ['surah', 'Surah'], ['flat', 'Date']] as groupItem (groupItem[0])}
          <button
            type="button"
            class="qa-review-seg-item"
            class:qa-review-seg-item--on={review.groupBy === groupItem[0]}
            role="tab"
            aria-selected={review.groupBy === groupItem[0]}
            data-group={groupItem[0]}
            onclick={() => handleGroupByChange(groupItem[0] ?? 'tag')}
          >{groupItem[1]}</button>
        {/each}
      </div>

      <!-- Sort dropdown -->
      <select
        class="qa-review-select"
        data-control="sort"
        aria-label="Sort by"
        value={review.sort}
        onchange={(e) => handleSortChange((e.target as HTMLSelectElement).value)}
      >
        <option value="recent">Sort: Recent</option>
        <option value="created">Sort: Created</option>
      </select>

      <!-- Surah filter dropdown -->
      <select
        class="qa-review-select"
        data-control="surah"
        aria-label="Filter by surah"
        value={review.surahFilter !== null ? String(review.surahFilter) : ''}
        onchange={(e) => handleSurahFilterChange((e.target as HTMLSelectElement).value)}
      >
        <option value="">Surah: All</option>
        {#each surahsWithMarks as num (num)}
          {@const meta = surahs.find(s => s.n === num)}
          <option value={String(num)}>{meta ? `${meta.name} (${num})` : `Surah ${num}`}</option>
        {/each}
      </select>
    </div>

    <!-- Value chips for current layer -->
    {#if valuePool.length > 0}
      <div class="qa-review-value-chips" aria-label="Filter by {LAYER_LABELS[review.activeLayer as LayerName] ?? review.activeLayer} value">
        {#each valuePool as val (val)}
          <button
            type="button"
            class="qa-review-value-chip"
            class:qa-review-value-chip--on={review.activeValue === val}
            data-value={val}
            onclick={() => handleValueChipClick(val)}
          >
            <span class="qa-review-value-chip-dot" style:background-color={getColorForTag(val)}></span>
            {val}
          </button>
        {/each}
      </div>
    {/if}

    <!-- Active filter chips -->
    {#if review.activeValue || review.surahFilter}
      <div class="qa-review-active-filters">
        {#if review.activeValue}
          <span class="qa-review-filter-chip">
            {review.activeValue}
            <button onclick={clearValueFilter} aria-label="Clear {review.activeValue} filter">✕</button>
          </span>
        {/if}
        {#if review.surahFilter !== null}
          {@const meta = surahs.find(s => s.n === review.surahFilter)}
          <span class="qa-review-filter-chip">
            {meta ? meta.name : `Surah ${review.surahFilter}`}
            <button onclick={clearSurahFilter} aria-label="Clear surah filter">✕</button>
          </span>
        {/if}
        <button class="qa-review-clear-all-btn" onclick={clearAllFilters}>Clear all</button>
      </div>
    {/if}

    <!-- Cards -->
    <div class="qa-review-card-list">
      {#if filteredMarks.length === 0}
        <div class="qa-review-no-results">
          No marks match your filters.
          <br />
          <button class="qa-review-clear-filter" onclick={clearAllFilters}>Clear filter</button>
        </div>
      {:else}
        {#each displayedMarks as mark (mark.verseKey)}
          <ReviewCard
            {mark}
            surahMeta={getSurahMeta(mark.verseKey)}
            openEditor={callOpenEditor}
          />
        {/each}

        {#if hasMore}
          <button class="qa-review-load-more" data-action="load-more" onclick={loadMoreMarks}>
            Load more
          </button>
        {/if}
      {/if}
    </div>
  {/if}
{/if}

