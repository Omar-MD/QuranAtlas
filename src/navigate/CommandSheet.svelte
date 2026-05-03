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
  import { commandSheet } from './state-command-sheet.svelte'
  import { emit } from '../core/events'
  import { Events } from '../core/constants'
  import { getSurahs, getSurah, type SurahMeta } from '../data/dataset'
  import { settings } from '../configure/state.svelte'
  import { getMeaning } from '../data/surah-meanings'
  import { getAll as getAllMarks } from '../mark/store'
  import { getAllUsedTags, getSlotForTag } from '../mark/tags.js'
  import { setTheme } from '../configure/theme'
  import { setFontSize, loadFontSize, getFontSizeOptions } from '../configure/font-size'
  import { beginFast } from '../mark/tag/session-bridge'
  import { get } from '../core/db'
  import { announce } from '../a11y/announcer'
  import { commandSheetBridge } from './command-sheet-bridge'

  const MAX_SURAH = 6
  const MAX_TAGS = 5
  const MAX_MARKS = 4

  type ResultItem = {
    kind: string
    glyph?: string
    tagSlot?: string
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
        meta: mk._canon.threads.slice(0, 3).join(', '), group: 'Recent',
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
    if (!meta || s < 1 || s > 114 || v < 1 || v > meta.counts[settings.riwayah]) {
      return { items: [], card: null }
    }

    const meaning = getMeaning(s)
    const refLabel = `${s}:${v} \u00B7 ${meta.name}${meaning ? ` \u00B7 ${meaning}` : ''}`

    let ar = '\u2026'
    let en = '\u2026'
    try {
      const data = await getSurah(s)
      ar = data.ayat[v - 1]?.aya_text ?? ''
      en = ''
    } catch {
      en = 'Content unavailable offline'
    }

    const items: ResultItem[] = [
      { kind: 'verse',  glyph: '\u21B5', surah: s, verse: v, label: 'Open verse',      meta: `Scroll reader to ${s}:${v}`, group: 'Verse' },
      { kind: 'action', glyph: '\u2726', label: 'Mark this verse', meta: `Start fast-tag on ${s}:${v}`, doMark: { verseKey: `${s}:${v}` }, shortcut: 'M', group: 'Verse' },
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
      const count = markCache.filter(m => m._canon.threads.includes(t)).length
      allItems.push({ kind: 'tag', tag: t, tagSlot: getSlotForTag(t), label: t, meta: `${count} mark${count === 1 ? '' : 's'}`, group: 'Tags' })
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
      return m._canon.threads.some(t => t.toLowerCase().includes(lower))
    }).slice(0, MAX_MARKS)
    for (const m of markMatches) {
      const parts = m.verseKey.split(':')
      const s = parseInt(parts[0] ?? '0', 10)
      const v = parseInt(parts[1] ?? '0', 10)
      const meta = surahCache.find(x => x.n === s)
      allItems.push({ kind: 'verse', glyph: '\u2726', surah: s, verse: v, label: `${m.verseKey}${meta ? ` \u00B7 ${meta.name}` : ''}`, meta: m._canon.threads.join(', '), group: 'Marks' })
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
      await beginFast(item.doMark.verseKey)
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
      window.location.hash = `#/threads/${encodeURIComponent(item.tag)}`
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

  // ── Keyboard navigation (sheet-internal only) ─────────────────────────────
  // Esc, Tab, Arrow, Enter — only meaningful while sheet is open. Boot-time
  // global shortcuts (⌘K open, /, ?, g-chord nav, reader hotkeys j/k/]/[/m/t/d/n)
  // live in src/navigate/global-shortcuts.ts so they survive lazy-mount of this
  // component (audit N22, 2026-05-01).

  function tabToNextGroup(dir: number): void {
    if (flatItems.length === 0) { return }
    const curGroup = flatItems[focusIdx]?.group
    if (!curGroup) { focusIdx = dir > 0 ? 0 : flatItems.length - 1; return }
    for (let step = 1; step <= flatItems.length; step++) {
      const i = ((focusIdx + dir * step) % flatItems.length + flatItems.length) % flatItems.length
      if (flatItems[i]?.group !== curGroup) { focusIdx = i; commandSheet.focusIndex = i; return }
    }
  }

  function handleSheetKeydown(e: KeyboardEvent): void {
    if (!isOpen) { return }
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
  }

  onMount(() => {
    commandSheetBridge.register({ open: () => { void open() }, close, isOpen: () => isOpen })
    // Load surah cache asynchronously — non-blocking
    getSurahs().then(list => { surahCache = list }).catch(() => { surahCache = [] })
    document.addEventListener('keydown', handleSheetKeydown)
    return () => {
      document.removeEventListener('keydown', handleSheetKeydown)
      commandSheetBridge.unregister()
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
              <span>{group.title}</span>
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
                  class:qa-cmd-item-glyph--dot={!!item.tagSlot}
                  aria-hidden="true"
                  data-tag-slot={item.tagSlot ?? null}
                >
                  {item.tagSlot ? '' : (item.glyph ?? '')}
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

