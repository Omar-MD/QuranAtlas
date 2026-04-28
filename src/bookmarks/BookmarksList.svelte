<script lang="ts">
  /**
   * Shared bookmark list — renders grouped-by-surah verse rows for the active
   * riwayah. Used by NavDrawer (Read sub-tab) and BookmarksPage (desktop /bookmarks).
   *
   * Row interactions:
   *   - tap row    → emit BOOKMARK_JUMP_LANDED + navigate via #/s/<n>/<v> (caller closes drawer)
   *   - swipe-left → reveal Delete button (mobile)
   *   - hover-×    → delete button visible (desktop)
   *
   * Empty-state copy: "Tap a verse number in the reader to bookmark it."
   */
  import { onMount, onDestroy } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import { settings } from '../state/settings.svelte'
  import { getGroupedForRiwayah, del as delBookmark, type Bookmark } from './store'
  import { getSurahs, getSurah, type SurahMeta } from '../data/dataset'
  import { on, emit } from '../core/events'
  import { Events } from '../core/constants'
  import type { Riwayah } from '../core/db'

  interface Props {
    onNavigate?: (verseKey: string) => void
  }
  const { onNavigate }: Props = $props()

  const grouped = new SvelteMap<number, Bookmark[]>()
  const surahMetas = new SvelteMap<number, SurahMeta>()
  const snippets = new SvelteMap<string, string>()
  let openSwipeKey = $state<string | null>(null)
  let loaded = $state(false)

  let touchStartX = 0
  let touchStartY = 0
  let touchKey: string | null = null

  const SNIPPET_CHARS = 50

  async function load(): Promise<void> {
    const riwayah = (settings.riwayah ?? 'qaloon') as Riwayah
    const [g, metas] = await Promise.all([
      getGroupedForRiwayah(riwayah),
      getSurahs(),
    ])
    grouped.clear()
    for (const [k, v] of g) { grouped.set(k, v) }
    surahMetas.clear()
    for (const m of metas) { surahMetas.set(m.n, m) }
    await ensureSnippets(riwayah)
    loaded = true
  }

  async function ensureSnippets(riwayah: Riwayah): Promise<void> {
    snippets.clear()
    const surahCache = new SvelteMap<number, Awaited<ReturnType<typeof getSurah>>>()
    for (const [surahN, list] of grouped) {
      let surah = surahCache.get(surahN)
      if (!surah) {
        try {
          surah = await getSurah(surahN)
          surahCache.set(surahN, surah)
        } catch {
          continue
        }
      }
      for (const b of list) {
        const verseN = parseInt(b.verseKey.split(':')[1] ?? '0', 10)
        const ayah = surah.ayat.find(a => a.aya_no === verseN)
        if (ayah) { snippets.set(b.verseKey, truncateArabic(ayah.aya_text)) }
      }
    }
    void riwayah
  }

  function truncateArabic(text: string): string {
    if (text.length <= SNIPPET_CHARS) { return text }
    return text.slice(0, SNIPPET_CHARS).trimEnd() + '…'
  }

  function handleRowClick(b: Bookmark): void {
    if (openSwipeKey === b.verseKey) {
      // Swipe is open — first click closes it instead of navigating.
      openSwipeKey = null
      return
    }
    const verse = parseInt(b.verseKey.split(':')[1] ?? '0', 10)
    emit(Events.BOOKMARK_JUMP_LANDED, { verseKey: b.verseKey })
    onNavigate?.(b.verseKey)
    emit(Events.NAVIGATION_NAVIGATE, { surah: b.surah, verse })
  }

  async function handleDelete(b: Bookmark): Promise<void> {
    openSwipeKey = null
    try {
      await delBookmark(b.verseKey, b.riwayah)
    } catch {
      // bookmarks/store already logs + emits BOOKMARKS_SAVE_FAILED
    }
  }

  function onTouchStart(e: TouchEvent, key: string): void {
    const t = e.touches[0]
    if (!t) { return }
    touchStartX = t.clientX
    touchStartY = t.clientY
    touchKey = key
  }

  function onTouchMove(e: TouchEvent, key: string): void {
    if (touchKey !== key) { return }
    const t = e.touches[0]
    if (!t) { return }
    const dx = t.clientX - touchStartX
    const dy = Math.abs(t.clientY - touchStartY)
    // Once horizontal intent is clear, claim the gesture so the parent
    // drawer's left-swipe-to-close handler does not also fire on touchend.
    if (Math.abs(dx) > 12 && Math.abs(dx) > dy * 1.5) {
      e.stopPropagation()
    }
  }

  function onTouchEnd(e: TouchEvent, key: string): void {
    if (touchKey !== key) { return }
    const t = e.changedTouches[0]
    if (!t) { touchKey = null; return }
    const dx = t.clientX - touchStartX
    const dy = Math.abs(t.clientY - touchStartY)
    // Generous threshold (32px) so a deliberate flick reliably reveals the
    // delete button — was 48px which felt sluggish + matched the drawer's
    // own close threshold.
    if (dx < -32 && dy < 28) {
      openSwipeKey = key
      e.stopPropagation()
    } else if (dx > 24 && openSwipeKey === key) {
      openSwipeKey = null
      e.stopPropagation()
    }
    touchKey = null
  }

  let unsubs: Array<() => void> = []

  onMount(() => {
    void load()

    unsubs = [
      on(Events.BOOKMARKS_SAVED, () => { void load() }),
      on(Events.BOOKMARKS_DELETED, () => { void load() }),
      on(Events.SYNC_BOOKMARKS_UPDATED, () => { void load() }),
      on(Events.SETTINGS_RIWAYAH_CHANGED, () => { void load() }),
    ]
  })

  onDestroy(() => {
    for (const u of unsubs) { u() }
    unsubs = []
  })
</script>

<div class="qa-bookmarks-list" data-bookmarks-list="">
  {#if !loaded}
    <div class="qa-bookmarks-empty" aria-live="polite">Loading…</div>
  {:else if grouped.size === 0}
    <div class="qa-bookmarks-empty" data-bookmarks-empty="">
      Tap a verse number in the reader to bookmark it.
    </div>
  {:else}
    {#each [...grouped.entries()] as [surahN, list] (surahN)}
      <div class="qa-bookmarks-section" data-surah={surahN}>
        <div class="qa-bookmarks-section-hdr">
          <span class="qa-bookmarks-section-name">{surahMetas.get(surahN)?.name ?? `Surah ${surahN}`}</span>
          <span class="qa-bookmarks-section-count" aria-label="{list.length} bookmarks">{list.length}</span>
        </div>
        <ul class="qa-bookmarks-rows">
          {#each list as b (b.verseKey)}
            <li
              class="qa-bookmarks-row"
              class:qa-bookmarks-row--swiped={openSwipeKey === b.verseKey}
              data-verse-key={b.verseKey}
            >
              <button
                type="button"
                class="qa-bookmarks-row-btn"
                onclick={() => handleRowClick(b)}
                ontouchstart={(e) => onTouchStart(e, b.verseKey)}
                ontouchmove={(e) => onTouchMove(e, b.verseKey)}
                ontouchend={(e) => onTouchEnd(e, b.verseKey)}
                aria-label={`Jump to verse ${b.verseKey}`}
              >
                <span class="qa-bookmarks-row-ref">{b.verseKey}</span>
                <span class="qa-bookmarks-row-ar" dir="rtl" lang="ar" data-riwayah={b.riwayah}>{snippets.get(b.verseKey) ?? ''}</span>
              </button>
              <button
                type="button"
                class="qa-bookmarks-row-del"
                aria-label={`Delete bookmark ${b.verseKey}`}
                onclick={() => handleDelete(b)}
              >&#x2715;</button>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  {/if}
</div>
