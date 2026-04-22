<script lang="ts">
  import { onMount } from 'svelte'
  import { getSurahs, type SurahMeta } from '../data/dataset'
  import { getMeaning } from '../data/surah-meanings'
  import { getAll as getAllMarks } from '../marks/store'
  import { get, getMostRecentPosition } from '../core/db'
  import { emit } from '../core/events'
  import { Events } from '../core/constants'
  import { announce } from '../a11y/announcer'
  import { surahs as surahsState } from '../state/surahs.svelte'
  import SurahRow from './SurahRow.svelte'

  // ---- data loaded on mount ----
  let allSurahs = $state<SurahMeta[]>([])
  let bookmarkedSet = $state(new Set<number>())
  let recentSurahs = $state<number[]>([])
  let resume = $state<{ surah: number; verse: number } | null>(null)
  let loaded = $state(false)

  // ---- derived filtered list ----
  const visibleItems = $derived.by<SurahMeta[]>(() => {
    const { filter, searchQuery } = surahsState
    const q = searchQuery.trim()
    const qLower = q.toLowerCase()
    const refMatch = q.match(/^(\d+)\s*:\s*(\d+)$/)

    // verse-ref jump is handled imperatively in the search handler
    if (refMatch) { return [] }

    let items: SurahMeta[] = allSurahs
    if (filter === 'bookmarked') {
      items = allSurahs.filter(s => bookmarkedSet.has(s.n))
    } else if (filter === 'recent') {
      const order = new Map(recentSurahs.map((n, i) => [n, i]))
      items = allSurahs
        .filter(s => order.has(s.n))
        .sort((a, b) => (order.get(a.n) ?? 0) - (order.get(b.n) ?? 0))
    }

    const numericMatch = q.match(/^(\d+)$/)
    if (numericMatch) {
      const raw = numericMatch[1]
      const jumpN = raw !== undefined ? parseInt(raw, 10) : NaN
      if (!isNaN(jumpN) && jumpN >= 1 && jumpN <= 114) {
        return items.filter(s => s.n === jumpN)
      }
    } else if (q) {
      return items.filter(s => {
        const name = (s.name ?? '').toLowerCase()
        const meaning = (getMeaning(s.n) ?? '').toLowerCase()
        const ar = ((s as Record<string, unknown>)['arabic'] as string | undefined ?? '').toLowerCase()
        return name.includes(qLower) || meaning.includes(qLower) || ar.includes(qLower)
      })
    }

    return items
  })

  const countLabel = $derived.by<string>(() => {
    const { filter, searchQuery } = surahsState
    const q = searchQuery.trim()
    const numericMatch = q.match(/^(\d+)$/)
    if (filter === 'bookmarked') {
      return `${visibleItems.length} bookmarked`
    } else if (filter === 'recent') {
      return visibleItems.length ? `${visibleItems.length} recent` : 'No recent'
    } else if (q && !numericMatch) {
      return visibleItems.length === 1 ? '1 match' : `${visibleItems.length} matches`
    } else if (numericMatch) {
      const raw = numericMatch[1]
      const jumpN = raw !== undefined ? parseInt(raw, 10) : NaN
      if (!isNaN(jumpN) && jumpN >= 1 && jumpN <= 114) {
        return visibleItems.length === 1 ? '1 match' : `${visibleItems.length} matches`
      }
    }
    return '114'
  })

  const hintText = $derived.by<string>(() => {
    const { searchQuery } = surahsState
    const q = searchQuery.trim()
    const numericMatch = q.match(/^(\d+)$/)
    if (numericMatch) {
      const raw = numericMatch[1]
      const jumpN = raw !== undefined ? parseInt(raw, 10) : NaN
      if (!isNaN(jumpN) && jumpN >= 1 && jumpN <= 114 && visibleItems.length === 1) {
        return `Jumping to #${jumpN}`
      }
    } else if (q && visibleItems.length === 0) {
      return 'No matches \u2014 try a surah name, a number 1\u201314, or a reference like 2:255.'
    }
    return ''
  })

  const showContinue = $derived(
    surahsState.filter === 'all' &&
    !surahsState.searchQuery.trim() &&
    resume !== null &&
    allSurahs.some(s => s.n === resume?.surah)
  )

  const resumeMeta = $derived(resume ? allSurahs.find(s => s.n === resume?.surah) ?? null : null)

  onMount(async () => {
    const [fetchedSurahs, marks, lastPosition, recentRec] = await Promise.all([
      getSurahs(),
      getAllMarks().catch(() => []),
      getMostRecentPosition().catch(() => null),
      get('settings', 'recentSurahs').catch(() => undefined),
    ])

    bookmarkedSet = new Set(marks.map(m => {
      const parts = m.verseKey.split(':')
      return parseInt(parts[0] ?? '0', 10)
    }))
    recentSurahs = Array.isArray(recentRec?.value) ? (recentRec.value as number[]).slice(0, 5) : []

    resume = lastPosition
      ? { surah: lastPosition.surah, verse: lastPosition.verse }
      : null

    allSurahs = fetchedSurahs
    loaded = true

    // Reset filter/search on mount
    surahsState.filter = 'all'
    surahsState.searchQuery = ''

    announce('Surah list')
  })

  function handleSearchInput(e: Event) {
    const input = e.target as HTMLInputElement
    const q = input.value
    surahsState.searchQuery = q

    // verse-ref: emit navigate immediately
    const refMatch = q.trim().match(/^(\d+)\s*:\s*(\d+)$/)
    if (refMatch) {
      const sRaw = refMatch[1]
      const vRaw = refMatch[2]
      if (sRaw !== undefined && vRaw !== undefined) {
        const sNum = parseInt(sRaw, 10)
        const vNum = parseInt(vRaw, 10)
        const meta = allSurahs.find(s => s.n === sNum)
        if (meta && vNum >= 1 && vNum <= meta.count) {
          emit(Events.NAVIGATION_NAVIGATE, { surah: sNum, verse: vNum })
        }
      }
    }
  }

  function setFilter(f: 'all' | 'bookmarked' | 'recent') {
    surahsState.filter = f
  }

  function navigateToResume() {
    if (!resume) { return }
    window.location.hash = resume.verse > 1
      ? `#/s/${resume.surah}/${resume.verse}`
      : `#/s/${resume.surah}`
  }

  const FILTERS = [
    { key: 'all' as const, label: 'All' },
    { key: 'bookmarked' as const, label: 'Bookmarked' },
    { key: 'recent' as const, label: 'Recent' },
  ]
</script>

<div class="qa-surah-list-page">
  <header class="qa-sl-header">
    <h1 class="qa-sl-title">Surahs</h1>
    <span class="qa-sl-count">{loaded ? countLabel : '114'}</span>
  </header>

  <label class="qa-sl-search">
    <span class="qa-sl-search-icon" aria-hidden="true">&#x2315;</span>
    <input
      type="search"
      class="qa-sl-search-input"
      placeholder="Search surah or number"
      aria-label="Search surah by name or number"
      autocomplete="off"
      maxlength={20}
      value={surahsState.searchQuery}
      oninput={handleSearchInput}
    />
    <span class="qa-sl-search-kbd">&#x2318;K</span>
  </label>

  <div class="qa-sl-seg" role="tablist">
    {#each FILTERS as f (f.key)}
      <button
        type="button"
        class="qa-sl-seg-item"
        class:qa-sl-seg-item--on={surahsState.filter === f.key}
        role="tab"
        aria-selected={surahsState.filter === f.key}
        data-filter={f.key}
        onclick={() => setFilter(f.key)}
      >{f.label}</button>
    {/each}
  </div>

  {#if hintText}
    <div class="qa-sl-hint">{hintText}</div>
  {/if}

  <ul class="qa-sl-list">
    {#if showContinue && resumeMeta}
      <li class="qa-sl-continue">
        <button
          type="button"
          class="qa-sl-continue-inner"
          onclick={navigateToResume}
          aria-label={`Continue reading ${resumeMeta.name} verse ${resume?.verse ?? 1}`}
        >
          <span class="qa-sl-continue-icon" aria-hidden="true">&#x21BB;</span>
          <span class="qa-sl-continue-body">
            <span class="qa-sl-continue-eyebrow">Continue reading</span>
            <span class="qa-sl-continue-ref">{resumeMeta.name} &middot; verse {resume?.verse ?? 1}</span>
          </span>
          <span class="qa-sl-continue-chev" aria-hidden="true">&#x203A;</span>
        </button>
      </li>
    {/if}

    {#each visibleItems as s (s.n)}
      <SurahRow surah={s} bookmarked={bookmarkedSet.has(s.n)} />
    {/each}
  </ul>
</div>

