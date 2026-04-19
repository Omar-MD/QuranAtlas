<script module lang="ts">
  // Module-level re-export so callers can do:
  // import { openCommandSheet } from './CommandSheet.svelte'
  export { openCommandSheet } from './command-sheet-bridge'
</script>

<script lang="ts">
  /**
   * CommandSheet — ⌘K overlay, single unified search.
   * Groups: Surahs · Verses · Tags · Marks · Commands.
   * Direct-ref input (e.g. 2:255) promotes a verse preview card.
   */
  import { onMount } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import { commandSheet } from '../state/command-sheet.svelte'
  import { emit } from '../core/events'
  import { Events } from '../core/constants'
  import { getSurahs, getSurah, type SurahMeta } from '../data/dataset'
  import { getMeaning } from '../data/surah-meanings'
  import { getAll as getAllMarks } from '../marks/store'
  import { getAllUsedTags, getColorForTag } from '../marks/tags.js'
  import { setTheme, cycleTheme } from '../settings/theme'
  import { setFontSize, loadFontSize, getFontSizeOptions, resetFontSize } from '../settings/font-size'
  import { toggleTranslation } from '../settings/panel-bridge'
  import {
    nextVerse as readerNextVerse,
    prevVerse as readerPrevVerse,
    nextSurah as readerNextSurah,
    prevSurah as readerPrevSurah,
    firstVerse as readerFirstVerse,
    lastVerse as readerLastVerse,
    markCurrent as readerMarkCurrent,
  } from './reader-actions.js'
  import { openShortcutsSheet, isShortcutsSheetOpen } from './shortcuts-sheet.js'
  import { getMostRecentPosition, get } from '../core/db'
  import { announce } from '../a11y/announcer'
  import { registerCommandSheet } from './command-sheet-bridge'

  const MAX_SURAH = 6
  const MAX_TAGS = 5
  const MAX_MARKS = 4

  type ResultItem = {
    kind: string
    glyph?: string
    tagColor?: string
    label: string
    meta?: string
    surah?: number
    verse?: number
    tag?: string
    href?: string
    shortcut?: string
    group: string
    doMark?: { verseKey: string }
    doCopy?: string
    doCommand?: string
  }

  type GroupedItems = { title: string; items: ResultItem[] }

  type VerseCard = {
    refLabel: string
    ar: string
    en: string
  }

  let isOpen = $state(false)
  let query = $state('')
  let flatItems = $state<ResultItem[]>([])
  let focusIdx = $state(0)
  let verseCard = $state<VerseCard | null>(null)
  let inputEl: HTMLInputElement | null = $state(null)
  let _renderGen = 0
  let gChordTimer: ReturnType<typeof setTimeout> | null = null
  let gChordPending = false

  let surahCache: SurahMeta[] = []
  let markCache: Awaited<ReturnType<typeof getAllMarks>> = []
  let tagCache: string[] = []

  const groups = $derived.by<GroupedItems[]>(() => {
    const map = new SvelteMap<string, ResultItem[]>()
    for (const item of flatItems) {
      if (!map.has(item.group)) { map.set(item.group, []) }
      map.get(item.group)!.push(item)
    }
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }))
  })

  // ── Public API ────────────────────────────────────────────────────────────

  export async function open(): Promise<void> {
    isOpen = true
    commandSheet.isOpen = true
    commandSheet.query = ''
    query = ''
    focusIdx = 0
    verseCard = null
    await Promise.resolve()
    inputEl?.focus()
    try {
      markCache = await getAllMarks()
      tagCache = await getAllUsedTags()
    } catch {
      markCache = []
      tagCache = []
    }
    await doRender()
  }

  export function close(): void {
    isOpen = false
    commandSheet.isOpen = false
    flatItems = []
    verseCard = null
    focusIdx = 0
    _renderGen++
    if (gChordTimer) { clearTimeout(gChordTimer); gChordTimer = null }
    gChordPending = false
  }

  // ── Render ────────────────────────────────────────────────────────────────

  async function doRender(): Promise<void> {
    const gen = ++_renderGen
    const q = query.trim()
    commandSheet.query = q

    if (!q) {
      verseCard = null
      const items = await buildEmptyStateItems()
      if (gen !== _renderGen) { return }
      flatItems = items
      focusIdx = 0
      return
    }

    const refMatch = q.match(/^(\d+)\s*:\s*(\d+)$/)
    if (refMatch) {
      const s = parseInt(refMatch[1] ?? '0', 10)
      const v = parseInt(refMatch[2] ?? '0', 10)
      const { items, card } = await buildVersePreviewResult(s, v)
      if (gen !== _renderGen) { return }
      verseCard = card
      flatItems = items
      focusIdx = 0
      return
    }

    verseCard = null
    const resolved = resolve(q)
    if (gen !== _renderGen) { return }
    flatItems = resolved
    focusIdx = 0
  }

  // ── Item builders ─────────────────────────────────────────────────────────

  async function buildEmptyStateItems(): Promise<ResultItem[]> {
    const items: ResultItem[] = []

    try {
      const pos = await get('settings', 'lastSurface')
      const val = typeof pos?.value === 'string' ? pos.value : ''
      const m = val.match(/^#\/s\/(\d+)(?:\/(\d+))?/)
      if (m) {
        const s = parseInt(m[1] ?? '0', 10)
        const v = m[2] ? parseInt(m[2], 10) : 1
        const meta = surahCache.find(x => x.n === s)
        if (meta) {
          items.push({
            kind: 'verse', glyph: '\uD83D\uDCD6', surah: s, verse: v,
            label: `${meta.name}${v > 1 ? ` \u00B7 verse ${v}` : ''}`,
            meta: 'Continue reading', group: 'Recent',
          })
        }
      }
    } catch { /* ignore */ }

    const recentMarks = markCache.slice().sort((a, b) => ((b.updatedAt ?? 0) - (a.updatedAt ?? 0)))
    for (const mk of recentMarks.slice(0, 2)) {
      const parts = mk.verseKey.split(':')
      const s = parseInt(parts[0] ?? '0', 10)
      const v = parseInt(parts[1] ?? '0', 10)
      const meta = surahCache.find(x => x.n === s)
      items.push({
        kind: 'verse', glyph: `${s}:`, surah: s, verse: v,
        label: `${s}:${v}${meta ? ` \u00B7 ${meta.name}` : ''}`,
        meta: mk.tags.slice(0, 3).join(', '), group: 'Recent',
      })
    }

    const jumps: ResultItem[] = [
      { kind: 'action', glyph: '\u2726', label: 'Review hub',        meta: 'All your marks',             href: '#/review',   shortcut: 'G R', group: 'Jump to' },
      { kind: 'action', glyph: '\u2630', label: 'Browse all surahs', meta: '114 surahs',                 href: '#/surahs',   shortcut: 'G S', group: 'Jump to' },
      { kind: 'action', glyph: '\u24D8', label: 'About',             meta: 'Credits · version',          href: '#/about',    shortcut: 'G A', group: 'Jump to' },
      { kind: 'action', glyph: '\u2699', label: 'Preferences',       meta: 'Theme · font · translation', href: '#/settings', shortcut: 'G P', group: 'Jump to' },
    ]
    return [...items, ...jumps]
  }

  async function buildVersePreviewResult(s: number, v: number): Promise<{ items: ResultItem[]; card: VerseCard | null }> {
    const meta = surahCache.find(x => x.n === s)
    if (!meta || s < 1 || s > 114 || v < 1 || v > meta.count) {
      return { items: [], card: null }
    }

    const meaning = getMeaning(s)
    const refLabel = `${s}:${v} \u00B7 ${meta.name}${meaning ? ` \u00B7 ${meaning}` : ''}`

    let ar = '\u2026'
    let en = '\u2026'
    try {
      const data = await getSurah(s)
      ar = data.ar[v - 1] ?? ''
      en = data.en[v - 1] ?? ''
    } catch {
      en = 'Content unavailable offline'
    }

    const items: ResultItem[] = [
      { kind: 'verse',  glyph: '\u21B5', surah: s, verse: v, label: 'Open verse',      meta: `Scroll reader to ${s}:${v}`, group: 'Verse' },
      { kind: 'action', glyph: '\u2726', label: 'Mark this verse', meta: `Open mark editor for ${s}:${v}`, doMark: { verseKey: `${s}:${v}` }, shortcut: 'M', group: 'Verse' },
      { kind: 'action', glyph: '\u2398', label: 'Copy reference',  meta: `"${s}:${v}" to clipboard`,       doCopy: `${s}:${v}`, group: 'Verse' },
    ]
    return { items, card: { refLabel, ar, en } }
  }

  // ── Resolve query ─────────────────────────────────────────────────────────

  function resolve(q: string): ResultItem[] {
    const lower = q.toLowerCase()
    const allItems: ResultItem[] = []

    const nMatch = q.match(/^(\d+)$/)
    if (nMatch) {
      const n = parseInt(nMatch[1] ?? '0', 10)
      const meta = surahCache.find(x => x.n === n)
      if (meta) { allItems.push({ ...surahItem(meta), group: 'Surahs' }) }
    }

    const tagMatches = tagCache.filter(t => t.toLowerCase().includes(lower)).slice(0, MAX_TAGS)
    for (const t of tagMatches) {
      const count = markCache.filter(m => m.tags.includes(t)).length
      allItems.push({ kind: 'tag', tag: t, tagColor: getColorForTag(t), label: t, meta: `${count} mark${count === 1 ? '' : 's'}`, group: 'Tags' })
    }

    if (!nMatch) {
      const surahMatches = surahCache.filter(s => {
        const name = (s.name || '').toLowerCase()
        const meaning = (getMeaning(s.n) || '').toLowerCase()
        return name.includes(lower) || meaning.includes(lower)
      }).slice(0, MAX_SURAH)
      for (const s of surahMatches) { allItems.push({ ...surahItem(s), group: 'Surahs' }) }
    }

    const markMatches = markCache.filter(m => {
      if (m.verseKey.includes(lower)) { return true }
      return m.tags.some(t => t.toLowerCase().includes(lower))
    }).slice(0, MAX_MARKS)
    for (const m of markMatches) {
      const parts = m.verseKey.split(':')
      const s = parseInt(parts[0] ?? '0', 10)
      const v = parseInt(parts[1] ?? '0', 10)
      const meta = surahCache.find(x => x.n === s)
      allItems.push({ kind: 'verse', glyph: '\u2726', surah: s, verse: v, label: `${m.verseKey}${meta ? ` \u00B7 ${meta.name}` : ''}`, meta: m.tags.join(', '), group: 'Marks' })
    }

    const commands = buildCommands(lower)
    for (const c of commands) { allItems.push({ ...c, group: 'Commands' }) }

    return allItems
  }

  function buildCommands(q: string): Omit<ResultItem, 'group'>[] {
    const all = [
      { kind: 'action', glyph: '\uD83C\uDF19', label: 'Switch to dark theme',  doCommand: 'theme-dark',  _key: 'dark theme switch' },
      { kind: 'action', glyph: '\uD83D\uDCD6', label: 'Switch to sepia theme', doCommand: 'theme-sepia', _key: 'sepia theme paper' },
      { kind: 'action', glyph: '\u2600\uFE0F', label: 'Switch to light theme', doCommand: 'theme-light', _key: 'light theme' },
      { kind: 'action', glyph: '\u2699\uFE0F', label: 'Follow device theme',   doCommand: 'theme-auto',  _key: 'auto theme os' },
      { kind: 'action', glyph: 'A+',           label: 'Increase font size',    doCommand: 'font-up',     _key: 'font size larger bigger' },
      { kind: 'action', glyph: 'A-',           label: 'Decrease font size',    doCommand: 'font-down',   _key: 'font size smaller' },
    ]
    return all.filter(a => a._key.includes(q) || a.label.toLowerCase().includes(q)).map(a => ({ kind: a.kind, glyph: a.glyph, label: a.label, doCommand: a.doCommand }))
  }

  function surahItem(s: SurahMeta): Omit<ResultItem, 'group'> {
    return { kind: 'surah', glyph: String(s.n), surah: s.n, label: s.name, meta: getMeaning(s.n) || '' }
  }

  // ── Activation ────────────────────────────────────────────────────────────

  async function activate(item: ResultItem): Promise<void> {
    if (item.doCopy) {
      try { await navigator.clipboard.writeText(item.doCopy) } catch { /* ignore */ }
      close()
      return
    }
    if (item.doMark) {
      close()
      const { openEditor } = await import('../marks/editor-bridge')
      openEditor(item.doMark.verseKey)
      return
    }
    if (item.doCommand === 'theme-dark')   { await setTheme('dark');   close(); return }
    if (item.doCommand === 'theme-sepia')  { await setTheme('sepia');  close(); return }
    if (item.doCommand === 'theme-light')  { await setTheme('light');  close(); return }
    if (item.doCommand === 'theme-auto')   { await setTheme('auto');   close(); return }
    if (item.doCommand === 'font-up')      { await bumpFont(+1);       close(); return }
    if (item.doCommand === 'font-down')    { await bumpFont(-1);       close(); return }

    close()
    if (item.kind === 'tag' && item.tag) {
      window.location.hash = `#/t/${encodeURIComponent(item.tag)}`
    } else if (item.kind === 'surah' && item.surah != null) {
      emit(Events.NAVIGATION_NAVIGATE, { surah: item.surah })
    } else if (item.kind === 'verse' && item.surah != null) {
      emit(Events.NAVIGATION_NAVIGATE, { surah: item.surah, verse: item.verse })
    } else if (item.kind === 'action' && item.href) {
      window.location.hash = item.href
    }
  }

  async function bumpFont(dir: number): Promise<void> {
    const order = getFontSizeOptions()
    const cur = await loadFontSize()
    const idx = Math.max(0, Math.min(order.length - 1, order.indexOf(cur) + dir))
    const next = order[idx]
    if (next === cur || next == null) { return }
    await setFontSize(next)
    announce(`Font size: ${next}`)
  }

  // ── Keyboard navigation ───────────────────────────────────────────────────

  function isTextEntry(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) { return false }
    return ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable
  }

  function isReaderRoute(): boolean {
    return (window.location?.hash || '').startsWith('#/s/')
  }

  function clearChord(): void {
    gChordPending = false
    if (gChordTimer) { clearTimeout(gChordTimer); gChordTimer = null }
  }

  async function gotoHome(): Promise<void> {
    try {
      const pos = await getMostRecentPosition()
      if (pos?.surah) {
        window.location.hash = (pos.verse ?? 0) > 1 ? `#/s/${pos.surah}/${pos.verse}` : `#/s/${pos.surah}`
        return
      }
    } catch { /* ignore */ }
    window.location.hash = '#/s/1'
  }

  function tabToNextGroup(dir: number): void {
    if (flatItems.length === 0) { return }
    const curGroup = flatItems[focusIdx]?.group
    if (!curGroup) { focusIdx = dir > 0 ? 0 : flatItems.length - 1; return }
    for (let step = 1; step <= flatItems.length; step++) {
      const i = ((focusIdx + dir * step) % flatItems.length + flatItems.length) % flatItems.length
      if (flatItems[i]?.group !== curGroup) { focusIdx = i; commandSheet.focusIndex = i; return }
    }
  }

  function handleGlobalKeydown(e: KeyboardEvent): void {
    const isK = e.key === 'k' || e.key === 'K'
    if (isK && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (isOpen) { close() } else { void open() }
      return
    }

    if (isShortcutsSheetOpen()) { return }

    if (isOpen) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return }
      if (e.key === 'Tab') { e.preventDefault(); tabToNextGroup(e.shiftKey ? -1 : +1); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (flatItems.length === 0) { return }
        focusIdx = (focusIdx + 1) % flatItems.length
        commandSheet.focusIndex = focusIdx
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (flatItems.length === 0) { return }
        focusIdx = (focusIdx - 1 + flatItems.length) % flatItems.length
        commandSheet.focusIndex = focusIdx
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = flatItems[focusIdx]
        if (item) { void activate(item) }
        return
      }
      return
    }

    if (isTextEntry(e.target)) { return }
    if (e.metaKey || e.ctrlKey || e.altKey) { return }

    if (e.key === '/') { e.preventDefault(); void open(); return }
    if (e.key === '?') { e.preventDefault(); openShortcutsSheet(); return }

    if (e.key === 'g' || e.key === 'G') {
      gChordPending = true
      if (gChordTimer) { clearTimeout(gChordTimer) }
      gChordTimer = setTimeout(() => { gChordPending = false; gChordTimer = null }, 900)
      return
    }
    if (gChordPending) {
      const k = e.key.toLowerCase()
      if (k === 'h') { e.preventDefault(); clearChord(); void gotoHome(); return }
      if (k === 's') { e.preventDefault(); clearChord(); window.location.hash = '#/surahs'; return }
      if (k === 'r') { e.preventDefault(); clearChord(); window.location.hash = '#/review'; return }
      if (k === 'a') { e.preventDefault(); clearChord(); window.location.hash = '#/about'; return }
      if (k === 'p') { e.preventDefault(); clearChord(); window.location.hash = '#/settings'; return }
      clearChord()
    }

    if (!isReaderRoute()) { return }

    switch (e.key) {
      case 'j': e.preventDefault(); readerNextVerse(); return
      case 'k': e.preventDefault(); readerPrevVerse(); return
      case ']': e.preventDefault(); readerNextSurah(); return
      case '[': e.preventDefault(); readerPrevSurah(); return
      case 'Home': e.preventDefault(); readerFirstVerse(); return
      case 'End':  e.preventDefault(); readerLastVerse();  return
      case 'm': case 'M': e.preventDefault(); readerMarkCurrent(); return
      case 't': case 'T': e.preventDefault(); void toggleTranslation(); return
      case 'd': case 'D': e.preventDefault(); void cycleTheme(); return
      case '+': case '=': e.preventDefault(); void bumpFont(+1); return
      case '-': case '_': e.preventDefault(); void bumpFont(-1); return
      case '0': e.preventDefault(); void resetFontSize().then(() => announce('Font size reset')); return
    }
  }

  onMount(() => {
    registerCommandSheet(() => { void open() }, close)
    // Load surah cache asynchronously — non-blocking
    getSurahs().then(list => { surahCache = list }).catch(() => { surahCache = [] })
    document.addEventListener('keydown', handleGlobalKeydown)
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown)
      if (gChordTimer) { clearTimeout(gChordTimer); gChordTimer = null }
    }
  })
</script>

<button
  type="button"
  class="qa-cmd-scrim"
  class:qa-cmd--hidden={!isOpen}
  aria-label="Close command sheet"
  onclick={close}
></button>
<div
  class="qa-cmd-sheet"
  class:qa-cmd--hidden={!isOpen}
  role="dialog"
  aria-modal="true"
  aria-label="Command sheet"
>
    <div class="qa-cmd-input-row">
      <span class="qa-cmd-input-glyph" aria-hidden="true">&#x2315;</span>
      <input
        bind:this={inputEl}
        bind:value={query}
        type="search"
        class="qa-cmd-input"
        placeholder="Search surah, verse, tag, or command"
        aria-label="Search surah, verse, tag, or command"
        autocomplete="off"
        maxlength="80"
        oninput={() => { void doRender() }}
      />
      <span class="qa-cmd-input-hint">esc</span>
    </div>

    <div class="qa-cmd-results" role="listbox" aria-label="Search results" tabindex="-1">
      {#if verseCard}
        <div class="qa-cmd-vcard">
          <div class="qa-cmd-vcard-ref">{verseCard.refLabel}</div>
          <div class="qa-cmd-vcard-ar" dir="rtl">{verseCard.ar}</div>
          <div class="qa-cmd-vcard-en">{verseCard.en}</div>
        </div>
      {/if}

      {#if flatItems.length === 0 && query.trim() !== '' && !verseCard}
        <div class="qa-cmd-empty">No matches</div>
      {:else}
        {#each groups as group (group.title)}
          <div class="qa-cmd-group">
            <div class="qa-cmd-group-head">
              <span class="qa-cmd-group-title">{group.title}</span>
              <span class="qa-cmd-group-count">{group.items.length}</span>
            </div>
            {#each group.items as item (item.kind + (item.label ?? '') + (item.surah ?? '') + (item.verse ?? '') + (item.tag ?? '') + (item.doCommand ?? ''))}
              {@const globalIdx = flatItems.indexOf(item)}
              <button
                type="button"
                class="qa-cmd-item"
                class:qa-cmd--active={globalIdx === focusIdx}
                role="option"
                aria-selected={globalIdx === focusIdx}
                data-kind={item.kind}
                onclick={() => { void activate(item) }}
              >
                <span
                  class="qa-cmd-item-glyph"
                  class:qa-cmd-item-glyph--dot={!!item.tagColor}
                  aria-hidden="true"
                  style={item.tagColor ? `--qa-cmd-dot: ${item.tagColor}` : undefined}
                >
                  {item.tagColor ? '' : (item.glyph ?? '')}
                </span>
                <span class="qa-cmd-item-body">
                  <span class="qa-cmd-item-label">{item.label}</span>
                  {#if item.meta}
                    <span class="qa-cmd-item-meta">{item.meta}</span>
                  {/if}
                </span>
                {#if item.shortcut}
                  <span class="qa-cmd-kbd qa-cmd-item-kbd">{item.shortcut}</span>
                {/if}
              </button>
            {/each}
          </div>
        {/each}
      {/if}
    </div>

    <div class="qa-cmd-foot">
      <span class="qa-cmd-foot-group"><span class="qa-cmd-kbd">&#x2191;&#x2193;</span> <span>navigate</span></span>
      <span class="qa-cmd-foot-group"><span class="qa-cmd-kbd">&#x21B5;</span> <span>open</span></span>
      <span class="qa-cmd-foot-group"><span class="qa-cmd-kbd">esc</span> <span>close</span></span>
    </div>
</div>

<style>
  .qa-cmd-scrim {
    position: fixed;
    inset: 0;
    z-index: 299;
    background: rgba(14, 14, 12, 0.62);
    backdrop-filter: blur(6px);
    opacity: 1;
    transition: opacity 0.18s ease;
    border: none;
    cursor: default;
    padding: 0;
  }

  .qa-cmd-scrim.qa-cmd--hidden,
  .qa-cmd-sheet.qa-cmd--hidden {
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.18s ease, visibility 0s linear 0.18s;
  }

  .qa-cmd-sheet {
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: min(640px, calc(100vw - 24px));
    max-height: calc(100dvh - 24px);
    z-index: 300;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--qa-ambient-accent-soft);
    border-radius: 16px;
    background-color: var(--qa-ambient-surface);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    transition: transform 0.18s ease, visibility 0s linear 0s;
  }

  .qa-cmd-input-row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--qa-ambient-border);
  }

  .qa-cmd-input-glyph {
    font-size: 1.125rem;
    color: var(--qa-ambient-dim);
    line-height: 1;
  }

  .qa-cmd-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    color: var(--qa-ambient-parchment);
    font-size: 1rem;
    line-height: 1.4;
    min-width: 0;
  }

  .qa-cmd-input::placeholder {
    color: var(--qa-ambient-dim);
  }

  .qa-cmd-input-hint {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.6875rem;
    color: var(--qa-ambient-dim);
    border: 1px solid var(--qa-ambient-accent-soft);
    border-radius: 4px;
    padding: 1px 6px;
  }

  .qa-cmd-results {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0;
  }

  .qa-cmd-group {
    padding: 0.375rem 0 0.5rem;
  }

  .qa-cmd-group-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 1rem 0.375rem;
    font-size: 0.6875rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--qa-ambient-dim);
  }

  .qa-cmd-group-count {
    font-variant-numeric: tabular-nums;
    color: var(--qa-ambient-dim);
  }

  .qa-cmd-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.625rem 1rem;
    border: none;
    background: transparent;
    color: var(--qa-ambient-parchment);
    text-align: left;
    cursor: pointer;
    font: inherit;
    transition: background-color 0.12s ease;
  }

  .qa-cmd-item:hover,
  .qa-cmd-item.qa-cmd--active {
    background-color: var(--qa-ambient-accent-soft);
  }

  .qa-cmd-item-glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background-color: var(--qa-ambient-accent-soft);
    color: var(--qa-ambient-accent);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  .qa-cmd-item-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .qa-cmd-item-label {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--qa-ambient-parchment);
  }

  .qa-cmd-item-meta {
    font-size: 0.75rem;
    color: var(--qa-ambient-dim);
  }

  .qa-cmd-empty {
    padding: 1.25rem 1rem;
    text-align: center;
    color: var(--qa-ambient-dim);
    font-size: 0.875rem;
  }

  .qa-cmd-foot {
    border-top: 1px solid var(--qa-ambient-border);
    padding: 8px 14px;
    display: flex;
    gap: 14px;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--qa-ambient-dim);
  }

  @media (max-width: 640px) {
    .qa-cmd-foot { display: none; }
  }

  @media (min-width: 768px) {
    .qa-cmd-foot { display: flex; }
  }

  @media (min-width: 1180px) {
    .qa-cmd-sheet { max-width: 640px; }
  }

  .qa-cmd-foot-group { display: inline-flex; align-items: center; gap: 6px; }

  .qa-cmd-kbd {
    display: inline-flex;
    align-items: center;
    padding: 1px 5px;
    border-radius: 4px;
    background-color: var(--qa-ambient-accent-soft);
    color: var(--qa-ambient-kbd-color, var(--qa-ambient-accent));
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.6875rem;
    letter-spacing: 0;
  }

  .qa-cmd-item-kbd { margin-left: auto; }

  .qa-cmd-item-glyph--dot {
    background: transparent;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .qa-cmd-item-glyph--dot::before {
    content: '';
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background-color: var(--qa-cmd-dot, var(--qa-ambient-accent));
  }

  .qa-cmd-vcard {
    margin: 8px 12px 10px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--qa-ambient-accent-soft);
    background-color: color-mix(in srgb, var(--qa-ambient-accent) 6%, transparent);
  }

  .qa-cmd-vcard-ref {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--qa-ambient-accent);
    margin-bottom: 6px;
  }

  .qa-cmd-vcard-ar {
    font-family: var(--qa-font-arabic);
    font-size: 1rem;
    line-height: 1.85;
    color: var(--qa-ambient-parchment);
    margin-bottom: 4px;
  }

  .qa-cmd-vcard-en {
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--qa-ambient-muted);
  }
</style>
