<script lang="ts">
  /**
   * Mobile / tablet (<1180px) top navigation.
   *   Row 1: [surah crumb pill ▼]    [tag-icon]  [kebab]
   *   Row 2: Read · Review N · Marks · Threads
   *
   * Auto-hides on scroll down; reveals on scroll up or `ambient:surface`.
   */

  import { onMount } from 'svelte'
  import { on, emit } from '../core/events'
  import { Events } from '../core/constants'
  import { reader } from '../state/reader.svelte'
  import { get, LAYER_NAMES } from '../core/db'
  import { getSurahs } from '../data/dataset'
  import { getAll as getAllMarks } from '../marks/store'
  import { openCommandSheet } from './command-sheet-bridge'
  import { openMoreSheet } from './more-sheet-bridge'
  import { beginFast } from '../tag/session-bridge'
  import { tagSession } from '../state/tag-session.svelte'

  const HIDE_DELTA = 36
  const SHOW_NEAR_TOP = 20

  let hidden = $state(false)
  let currentHash = $state(typeof window !== 'undefined' ? window.location.hash || '' : '')
  let lastTop = 0
  let lastSurahHref = $state('#/s/1')
  let surahName = $state('')
  let reviewCount = $state(0)

  type Tab = { id: 'read' | 'review' | 'marks' | 'threads'; label: string; active: (h: string) => boolean }
  const TABS: Tab[] = [
    { id: 'read',    label: 'Read',    active: (h) => h.startsWith('#/s/') },
    { id: 'review',  label: 'Review',  active: (h) => h.startsWith('#/review') },
    { id: 'marks',   label: 'Marks',   active: () => false },
    { id: 'threads', label: 'Threads', active: (h) => LAYER_NAMES.some(ln => h.startsWith(`#/${ln}/`)) },
  ]

  function isReaderRoute(h: string): boolean { return (h || '').startsWith('#/s/') }

  const crumbText = $derived.by(() => {
    const s = reader.currentSurahNum
    const vk = reader.currentVerseKey
    const verse = vk ? vk.split(':')[1] ?? '1' : '1'
    if (!s) { return 'QuranAtlas' }
    return `${s} : ${verse} · ${surahName || `Surah ${s}`}`
  })

  function handleTab(e: Event, id: Tab['id']): void {
    e.preventDefault()
    emit(Events.AMBIENT_SURFACE, { reason: 'margin-header' })
    if (id === 'read')    { window.location.hash = lastSurahHref; return }
    if (id === 'review')  { window.location.hash = '#/review';    return }
    if (id === 'marks')   { window.location.hash = '#/review';    return }
    if (id === 'threads') { window.location.hash = '#/review';    return }
  }

  function openSurahPicker(): void {
    openCommandSheet()
  }

  function openTagMode(): void {
    if (tagSession.quickbarOpen) { tagSession.end(); return }
    const vk = reader.currentVerseKey
    if (!vk) { return }
    void beginFast(vk)
  }

  function loadCounts(): void {
    getAllMarks().then((m) => { reviewCount = m.length }).catch(() => { /* ignore */ })
  }

  onMount(() => {
    currentHash = window.location.hash || ''

    get('settings', 'lastSurface').then((rec) => {
      const v = typeof rec?.value === 'string' ? rec.value : ''
      const m = v.match(/^#\/s\/(\d+)/)
      if (m && m[1]) { lastSurahHref = `#/s/${m[1]}` }
    }).catch(() => { /* ignore */ })

    getSurahs().then((list) => {
      const s = reader.currentSurahNum
      const meta = list.find((x) => x.n === s)
      surahName = meta?.name ?? ''
    }).catch(() => { /* ignore */ })

    loadCounts()
    const unsubMarks = on(Events.MARKS_SAVED, loadCounts)
    const unsubDel = on(Events.MARKS_DELETED, loadCounts)

    const onHash = () => { currentHash = window.location.hash || '' }
    window.addEventListener('hashchange', onHash)
    const unsubRoute = on(Events.ROUTER_ROUTE_CHANGE, () => {
      currentHash = window.location.hash || ''
      getSurahs().then((list) => {
        const s = reader.currentSurahNum
        const meta = list.find((x) => x.n === s)
        surahName = meta?.name ?? ''
      }).catch(() => { /* ignore */ })
    })
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
      window.removeEventListener('hashchange', onHash)
      unsubRoute()
      unsubSurface()
      unsubMarks()
      unsubDel()
      main?.removeEventListener('scroll', onScroll)
    }
  })
</script>

<header class="qa-mh" class:qa-mh--hidden={hidden} aria-label="Primary navigation">
  <div class="qa-mh-row">
    <button type="button" class="qa-mh-crumb" onclick={openSurahPicker} aria-label="Open surah picker">
      <span class="qa-mh-crumb-text">{crumbText}</span>
      <svg class="qa-mh-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
    <button type="button" class="qa-mh-tag" class:qa-mh-tag--on={tagSession.quickbarOpen} aria-label="Tag mode" aria-pressed={tagSession.quickbarOpen} onclick={openTagMode}>
      <span class="qa-mh-tag-dot" aria-hidden="true"></span>
    </button>
    <button type="button" class="qa-mh-icon" data-tab="more" aria-label="More" onclick={openMoreSheet}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="6" cy="12" r="1.6"/>
        <circle cx="12" cy="12" r="1.6"/>
        <circle cx="18" cy="12" r="1.6"/>
      </svg>
    </button>
  </div>
  <nav class="qa-mh-tabs" aria-label="Sections">
    {#each TABS as tab (tab.id)}
      <button
        type="button"
        class="qa-mh-tab"
        class:qa-mh-tab--on={tab.active(currentHash)}
        aria-current={tab.active(currentHash) ? 'page' : undefined}
        onclick={(e) => handleTab(e, tab.id)}
      >
        {tab.label}{#if tab.id === 'review' && reviewCount > 0}&nbsp;<span class="qa-mh-count">{reviewCount}</span>{/if}
      </button>
    {/each}
  </nav>
</header>

<style>
  .qa-mh {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 95;
    padding: calc(env(safe-area-inset-top) + 10px) 14px 10px;
    background: color-mix(in srgb, var(--qa-bg-primary) 92%, transparent);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: transform var(--qa-transition-base), opacity var(--qa-transition-base);
  }
  .qa-mh--hidden {
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
  }
  .qa-mh-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .qa-mh-crumb {
    flex: 0 1 auto;
    margin-right: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px 7px 14px;
    border-radius: var(--qa-radius-pill);
    border: 1px solid var(--qa-ambient-border);
    background: var(--qa-ambient-surface);
    color: var(--qa-ambient-parchment);
    font: inherit;
    cursor: pointer;
    min-width: 0;
    max-width: 100%;
  }
  .qa-mh-crumb-text {
    text-align: left;
    font-family: var(--qa-font-mono);
    font-size: 0.8125rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .qa-mh-chevron {
    width: 14px;
    height: 14px;
    color: var(--qa-ambient-dim);
    flex-shrink: 0;
  }
  .qa-mh-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--qa-radius-circle);
    border: 1px solid var(--qa-ambient-border);
    background: var(--qa-ambient-surface);
    color: var(--qa-ambient-parchment);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .qa-mh-icon svg {
    width: 18px;
    height: 18px;
  }
  .qa-mh-icon:hover { border-color: var(--qa-ambient-accent); color: var(--qa-ambient-accent); }
  .qa-mh-tag {
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--qa-radius-circle);
    border: 1px solid var(--qa-ambient-border);
    background: var(--qa-ambient-surface);
    color: var(--qa-ambient-parchment);
    cursor: pointer;
    flex-shrink: 0;
  }
  .qa-mh-tag:hover { border-color: var(--qa-ambient-accent); }
  .qa-mh-tag-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--qa-radius-circle);
    background: transparent;
    border: 1.5px solid var(--qa-ambient-accent);
  }
  .qa-mh-tag--on .qa-mh-tag-dot {
    background: var(--lh-themes);
    border-color: var(--lh-themes);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--lh-themes) 28%, transparent);
  }

  .qa-mh-tabs {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .qa-mh-tabs::-webkit-scrollbar { display: none; }
  .qa-mh-tab {
    padding: 6px 14px;
    border-radius: var(--qa-radius-pill);
    border: none;
    background: transparent;
    color: var(--qa-ambient-dim);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .qa-mh-tab:hover { color: var(--qa-ambient-parchment); }
  .qa-mh-tab--on {
    background-color: var(--qa-ambient-surface);
    border: 1px solid var(--qa-ambient-border);
    color: var(--qa-ambient-parchment);
    font-weight: 600;
  }
  .qa-mh-count {
    font-family: var(--qa-font-mono);
    font-weight: 500;
    color: var(--qa-ambient-dim);
  }
  .qa-mh-tab--on .qa-mh-count { color: var(--qa-ambient-accent); }

  @media (min-width: 1180px) {
    .qa-mh { display: none; }
  }
</style>
