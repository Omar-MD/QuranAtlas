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
  import { settings } from '../../configure/state.svelte'
  import { getGroupedForRiwayah, del as delBookmark, type Bookmark } from './store'
  import { getSurahs, getSurah, type SurahMeta } from '../../data/dataset'
  import { on, emit } from '../../core/events'
  import { Events } from '../../core/constants'
  import type { Riwayah } from '../../core/db'

  interface Props {
    onNavigate?: (verseKey: string) => void
  }
  const { onNavigate }: Props = $props()

  const grouped = new SvelteMap<number, Bookmark[]>()
  const surahMetas = new SvelteMap<number, SurahMeta>()
  const snippets = new SvelteMap<string, string>()
  let openSwipeKey = $state<string | null>(null)
  let loaded = $state(false)

  // iOS-style progressive swipe: row tracks the finger live during touchmove,
  // snaps to revealed/closed on touchend by threshold OR velocity.
  let activeSwipeKey = $state<string | null>(null)
  let activeSwipeDx = $state(0)
  let touchStart: { x: number; y: number; key: string; t: number } | null = null
  let scrollAxis: 'horizontal' | 'vertical' | null = null
  let suppressClickKey: string | null = null
  let suppressClickAt = 0

  const REVEAL_PX = 76                 // delete button width — open-state translateX
  const SNAP_THRESHOLD_PX = 38         // half the button: past this snaps revealed
  const VELOCITY_SNAP = 0.45           // px/ms — past this any leftward flick reveals
  const AXIS_LOCK_PX = 8               // intent-detection threshold
  const SUPPRESS_CLICK_MS = 600        // ignore the synthetic click that follows touchend
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
    // Suppress the synthetic click that follows a touchend whose gesture was
    // a horizontal swipe — without this guard, even a small left swipe that
    // didn't pass the snap threshold would trigger navigation.
    if (suppressClickKey === b.verseKey && Date.now() - suppressClickAt < SUPPRESS_CLICK_MS) {
      suppressClickKey = null
      return
    }
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

  function rowBaseDx(key: string): number {
    return openSwipeKey === key ? -REVEAL_PX : 0
  }

  function onTouchStart(e: TouchEvent, key: string): void {
    const t = e.touches[0]
    if (!t) { return }
    // Tapping a different row while one is open closes the open one first.
    if (openSwipeKey && openSwipeKey !== key) {
      openSwipeKey = null
    }
    touchStart = { x: t.clientX, y: t.clientY, key, t: performance.now() }
    scrollAxis = null
    activeSwipeKey = key
    activeSwipeDx = rowBaseDx(key)
  }

  function onTouchMove(e: TouchEvent, key: string): void {
    if (!touchStart || touchStart.key !== key) { return }
    const t = e.touches[0]
    if (!t) { return }
    const dx = t.clientX - touchStart.x
    const dy = t.clientY - touchStart.y

    // Axis lock: claim the gesture once direction is clear. Vertical scrolls
    // are released back to the drawer body; horizontal swipes own touchmove +
    // touchend so the parent drawer's left-swipe-to-close handler does not
    // also fire.
    if (scrollAxis === null && (Math.abs(dx) > AXIS_LOCK_PX || Math.abs(dy) > AXIS_LOCK_PX)) {
      scrollAxis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
    }
    if (scrollAxis !== 'horizontal') { return }

    e.stopPropagation()

    // Live-track the finger from the row's resting position. Allow a small
    // overshoot past REVEAL_PX so the rubber-band feels right; clamp the
    // right side at 0 so swiping right on a closed row does nothing.
    const next = rowBaseDx(key) + dx
    activeSwipeDx = Math.max(-REVEAL_PX * 1.18, Math.min(0, next))
  }

  function onTouchEnd(e: TouchEvent, key: string): void {
    if (!touchStart || touchStart.key !== key) {
      activeSwipeKey = null
      activeSwipeDx = 0
      touchStart = null
      scrollAxis = null
      return
    }
    const t = e.changedTouches[0]
    const wasHorizontal = scrollAxis === 'horizontal'
    if (wasHorizontal) {
      e.stopPropagation()
      suppressClickKey = key
      suppressClickAt = Date.now()
    }
    if (t && wasHorizontal) {
      const dx = t.clientX - touchStart.x
      const dt = Math.max(1, performance.now() - touchStart.t)
      const velocity = -dx / dt   // positive = leftward speed in px/ms
      const wasOpen = openSwipeKey === key
      // Snap rules:
      //   - leftward flick past VELOCITY_SNAP → reveal
      //   - resting dx past SNAP_THRESHOLD_PX (negative) → reveal
      //   - else if was open and user dragged it closed past threshold → close
      //   - otherwise return to previous resting state
      if (activeSwipeDx <= -SNAP_THRESHOLD_PX || velocity > VELOCITY_SNAP) {
        openSwipeKey = key
      } else if (wasOpen && activeSwipeDx > -SNAP_THRESHOLD_PX) {
        openSwipeKey = null
      } else if (!wasOpen) {
        openSwipeKey = null
      }
    }
    activeSwipeKey = null
    activeSwipeDx = 0
    touchStart = null
    scrollAxis = null
  }

  function rowStyle(key: string): string {
    if (activeSwipeKey === key) {
      // Live-tracking phase: no transition (1:1 finger follow).
      return `transform: translateX(${activeSwipeDx}px); transition: none;`
    }
    // Resting phase: spring snap.
    return ''
  }

  function delStyle(key: string): string {
    if (activeSwipeKey === key) {
      // Opacity fades from 0 → 1 across the swipe so the button materializes
      // progressively rather than appearing fully formed at the threshold.
      const progress = Math.min(1, Math.abs(activeSwipeDx) / REVEAL_PX)
      return `opacity: ${progress.toFixed(3)}; transition: none;`
    }
    return ''
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
                style={rowStyle(b.verseKey)}
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
                style={delStyle(b.verseKey)}
                aria-label={`Delete bookmark ${b.verseKey}`}
                onclick={() => handleDelete(b)}
              >Delete</button>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  {/if}
</div>
