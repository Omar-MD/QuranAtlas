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
  import { put } from '../core/db'
  import { LAYER_NAMES, type LayerName } from '../core/db'
  import { logger } from '../core/logger'
  import { save as saveState, load as loadState, getDefaultState } from './state'
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
        ? `#/t/${encodeURIComponent(canonical)}`
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
      await put('settings', { key: 'lastSurface', value: lastSurfaceHash })

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

  onMount(() => {
    doInit().catch(err => logger.error('Hub init failed:', { error: err }))
    return () => {
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

<style>
  .qa-review-tag-not-found {
    text-align: center;
    padding: 3rem 1rem;
  }

  .qa-review-tag-not-found h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--qa-text-primary);
    margin-bottom: 0.5rem;
  }

  .qa-review-tag-not-found p {
    color: var(--qa-text-secondary);
    margin-bottom: 1rem;
  }

  .qa-review-hub-link {
    color: var(--qa-ambient-accent);
    text-decoration: underline;
  }

  .qa-review-empty {
    padding: 2rem 1rem;
    text-align: center;
    color: var(--qa-text-secondary);
  }

  .qa-review-no-results {
    padding: 2rem 1rem;
    text-align: center;
    color: var(--qa-text-secondary);
  }

  .qa-review-clear-filter {
    margin-top: 0.5rem;
    background: none;
    border: none;
    color: var(--qa-ambient-accent);
    cursor: pointer;
    font-weight: 500;
    font-size: var(--qa-text-size-meta);
    text-decoration: underline;
  }

  .qa-review-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background-color: var(--qa-ambient-surface);
    border: 1px solid var(--qa-ambient-border);
    border-radius: 12px;
  }

  .qa-review-select {
    padding: 0.5rem 0.75rem;
    background-color: var(--qa-bg-primary);
    border: 1px solid var(--qa-ambient-border);
    border-radius: 8px;
    font-size: var(--qa-text-size-meta);
    font-weight: 500;
    color: var(--qa-text-primary);
    min-height: 44px;
    cursor: pointer;
    width: 100%;
  }

  .qa-review-select:focus-visible {
    outline: 2px solid var(--qa-ambient-accent);
    border-color: var(--qa-ambient-accent);
  }

  /* ── Value chips ──────────────────────────────────────────────────────── */

  .qa-review-value-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-bottom: 1rem;
    padding: 0 0.25rem;
  }

  .qa-review-value-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.3125rem 0.625rem;
    border-radius: 999px;
    font-size: var(--qa-text-size-meta);
    background-color: var(--qa-ambient-surface);
    border: 1px solid var(--qa-ambient-border);
    color: var(--qa-text-primary);
    cursor: pointer;
    font: inherit;
    min-height: 32px;
    transition: background-color 0.15s ease, box-shadow 0.15s ease;
  }

  .qa-review-value-chip:hover {
    background-color: color-mix(in srgb, var(--qa-ambient-accent) 8%, var(--qa-ambient-surface));
  }

  .qa-review-value-chip--on {
    background-color: var(--qa-selection-bg);
    color: var(--qa-selection-text);
    box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
  }

  .qa-review-value-chip-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .qa-review-active-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
    align-items: center;
  }

  .qa-review-filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 999px;
    font-size: var(--qa-text-size-meta);
    background-color: var(--qa-ambient-surface);
    border: 1px solid var(--qa-ambient-border);
    color: var(--qa-text-primary);
    min-height: 32px;
  }

  .qa-review-filter-chip button {
    background: none;
    border: none;
    color: var(--qa-text-secondary);
    cursor: pointer;
    font-size: 1rem;
    padding: 0;
    line-height: 1;
  }

  .qa-review-filter-chip button:hover {
    color: var(--qa-color-error);
  }

  .qa-review-clear-all-btn {
    background: none;
    border: none;
    color: var(--qa-ambient-accent);
    font-weight: 500;
    font-size: var(--qa-text-size-meta);
    cursor: pointer;
    padding: 0.375rem 0.5rem;
  }

  .qa-review-clear-all-btn:hover {
    text-decoration: underline;
  }

  .qa-review-load-more {
    display: block;
    width: 100%;
    padding: 1rem;
    margin: 2rem 0;
    background-color: var(--qa-bg-secondary);
    border: 1px dashed var(--qa-border);
    border-radius: 12px;
    font-weight: 600;
    color: var(--qa-text-primary);
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }

  .qa-review-load-more:hover {
    background-color: var(--qa-bg-surface);
    border-color: var(--qa-ambient-accent);
    color: var(--qa-ambient-accent);
  }

  /* ── Segment pill ─────────────────────────────────────────────────────── */

  .qa-review-seg {
    display: inline-flex;
    gap: 4px;
    padding: 3px;
    border-radius: 999px;
    background-color: var(--qa-ambient-surface);
    border: 1px solid var(--qa-ambient-border);
  }

  .qa-review-layer-seg {
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .qa-review-layer-seg::-webkit-scrollbar {
    display: none;
  }

  .qa-review-seg-item {
    padding: 5px 12px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--qa-ambient-dim);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  .qa-review-seg-item--on {
    background-color: var(--qa-selection-bg);
    color: var(--qa-selection-text);
    box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
  }

  /* ── Cards ────────────────────────────────────────────────────────────── */

  .qa-review-card-list {
    display: block;
  }

  /* ── Desktop — left rail + main column ──────────────────────────────── */
  @media (min-width: 1180px) {
    .qa-review-layout {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      column-gap: 2rem;
      align-items: start;
      max-width: 1180px;
      margin: 0 auto;
    }

    .qa-review-layout :global(.qa-review-controls) { display: none; }

    .qa-review-rail {
      position: sticky;
      top: 1rem;
      padding-right: 1rem;
      border-right: 1px solid var(--qa-ambient-border);
      font-size: var(--qa-text-size-meta);
      max-height: 90vh;
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .qa-review-rail-section {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--qa-ambient-accent);
      font-weight: 700;
      margin: 14px 0 6px;
    }

    .qa-review-rail-section:first-child { margin-top: 0; }

    .qa-review-rail-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 8px;
      border-radius: 6px;
      cursor: pointer;
      color: var(--qa-ambient-parchment);
      font: inherit;
      border: none;
      background: transparent;
      text-align: left;
      width: 100%;
    }

    .qa-review-rail-row:hover {
      background-color: color-mix(in srgb, var(--qa-ambient-accent) 4%, transparent);
    }

    .qa-review-rail-row--on {
      background-color: var(--qa-selection-bg);
      color: var(--qa-selection-text);
      box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
    }

    .qa-review-rail-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }

    .qa-review-rail-count {
      margin-left: auto;
      font-size: 0.6875rem;
      color: var(--qa-ambient-muted);
      font-variant-numeric: tabular-nums;
    }

    .qa-review-main { min-width: 0; }

    .qa-review-filter-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 1rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--qa-ambient-border);
      font-size: var(--qa-text-size-meta);
    }

    .qa-review-filter-bar-label {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--qa-ambient-muted);
      font-weight: 700;
      margin-right: 4px;
    }

    .qa-review-filter-bar .qa-review-filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px 4px 10px;
      border-radius: 999px;
      background: var(--qa-selection-bg);
      color: var(--qa-selection-text);
      box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
    }

    .qa-review-filter-bar .qa-review-filter-chip-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .qa-review-filter-bar .qa-review-filter-chip button {
      margin-left: 4px;
      border: none;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0 2px;
      line-height: 1;
      opacity: 0.7;
    }

    .qa-review-filter-bar .qa-review-filter-chip button:hover { opacity: 1; }

    .qa-review-filter-bar-clear {
      margin-left: auto;
      border: none;
      background: transparent;
      color: var(--qa-ambient-muted);
      cursor: pointer;
      font-size: 0.8125rem;
      text-decoration: underline;
    }
  }

  /* ── FVR layout ───────────────────────────────────────────────────────── */

  .qa-fvr-layout {
    max-width: 720px;
    margin: 0 auto;
  }

  .qa-fvr-header {
    position: relative;
    max-width: 720px;
    margin: 0 auto 14px;
    padding: 38px 16px 14px;
    border-bottom: 1px solid var(--qa-ambient-border);
  }

  .qa-fvr-back {
    position: absolute;
    top: 14px;
    left: 14px;
    font-size: 0.75rem;
    color: var(--qa-ambient-dim);
    text-decoration: none;
  }

  .qa-fvr-title-block { text-align: center; }

  .qa-fvr-label {
    font-size: 0.625rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-weight: 600;
    color: var(--qa-ambient-accent);
    margin-bottom: 4px;
  }

  .qa-fvr-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--qa-ambient-parchment);
    margin: 0 0 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 7px;
  }

  .qa-fvr-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }

  .qa-fvr-stats {
    font-size: 0.75rem;
    color: var(--qa-ambient-muted);
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }

  .qa-fvr-stats :global(strong) { color: var(--qa-ambient-parchment); font-weight: 700; }
  .qa-fvr-sep { opacity: 0.4; }

  @media (min-width: 1180px) {
    .qa-fvr-layout { max-width: 1000px; }

    .qa-fvr-header {
      max-width: 1000px;
      padding: 56px 24px 22px;
      margin-bottom: 22px;
    }

    .qa-fvr-label { margin-bottom: 10px; }
    .qa-fvr-title { font-size: 1.375rem; margin-bottom: 18px; }
    .qa-fvr-stats { font-size: 0.8125rem; gap: 14px; }
  }
</style>
