<script lang="ts">
  import { onMount } from 'svelte'
  import Verse from './Verse.svelte'
  import SurahHeader from './SurahHeader.svelte'
  import EdgeIndicator from './EdgeIndicator.svelte'
  import { reader } from '../state/reader.svelte'
  import { settings } from '../state/settings.svelte'
  import { getSurah, getSurahs } from '../data/dataset'
  import type { SurahData, SurahMeta } from '../data/dataset'
  import { get } from '../core/db'
  import { emit } from '../core/events'
  import { Events } from '../core/constants'
  import { announce } from '../a11y/announcer'
  import { clearUndoToast, clearUndoRecord } from '../core/ui-bridge'
  import { setupChunkedAppend, CHUNK_SIZE } from './chunked-append'
  import { initPositionTracking, teardownPositionTracking, savePosition } from './position'
  import { observeNewVerses } from './scroll-tracker'
  import { isValidSurahNum } from './render-helpers'

  // ---------------------------------------------------------------------------
  // Props — route params + hooks injected from app-bootstrap.ts
  // ---------------------------------------------------------------------------

  interface Props {
    /** Surah number as string (from route param :surah) */
    surah: string
    /** Ayah number as string (from route param :ayah, optional) */
    ayah?: string
    /** Hook: receives the reader container and returns a cleanup fn */
    initIndicators?: (container: HTMLElement) => () => void
    /** Hook: receives the reader container and returns a cleanup fn (CLAUDE.md Rule 4) */
    setupLongPress?: (container: HTMLElement) => () => void
  }

  const { surah: surahParam, ayah: ayahParam, initIndicators, setupLongPress }: Props = $props()

  // ---------------------------------------------------------------------------
  // Local state
  // ---------------------------------------------------------------------------

  const surahNum = $derived(parseInt(surahParam ?? '', 10))
  const targetVerse = $derived(ayahParam ? parseInt(ayahParam, 10) : null)

  type VerseItem = { key: string; ar: string; en: string }

  let surahData = $state<SurahData | null>(null)
  let surahMeta = $state<SurahMeta | null>(null)
  let savedPosition = $state<{ verse: number } | null>(null)
  // translationVisible is also initialised from IDB in loadSurah() so we can't use $derived
  let translationVisible = $state(settings.translationVisible ?? true)
  let verses = $state<VerseItem[]>([])
  let renderedCount = $state(0)
  let isLoading = $state(true)
  let loadError = $state(false)
  let invalidVerseError = $state<string | null>(null)

  let container: HTMLElement | null = $state(null)
  let cleanups: Array<() => void> = []

  // ---------------------------------------------------------------------------
  // Reactive translation toggle — keep in sync with settings rune after load
  // ---------------------------------------------------------------------------

  $effect(() => {
    // Only sync if the value has been loaded (not null) to avoid overwriting the
    // IDB-fetched value during initial mount.
    if (settings.translationVisible !== null) {
      translationVisible = settings.translationVisible
    }
  })

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Append up to CHUNK_SIZE more verses to the rendered list. */
  function appendChunk() {
    if (!surahData || renderedCount >= surahData.ar.length) { return }
    const nextEnd = Math.min(renderedCount + CHUNK_SIZE, surahData.ar.length)
    const firstNewVerseNum = renderedCount + 1
    const newItems: VerseItem[] = []
    for (let i = renderedCount; i < nextEnd; i++) {
      newItems.push({
        key: `${surahNum}:${i + 1}`,
        ar: surahData.ar[i] ?? '',
        en: surahData.en[i] ?? '',
      })
    }
    verses = [...verses, ...newItems]
    renderedCount = nextEnd

    // Register the newly-appended verses with the scroll tracker so the
    // center-band IntersectionObserver fires on them as the user scrolls
    // past. Without this, only verses from the first chunk would ever update
    // the saved position. Runs after Svelte flushes the new DOM nodes.
    if (container) {
      requestAnimationFrame(() => {
        if (!container) { return }
        const els: HTMLElement[] = []
        for (let n = firstNewVerseNum; n <= nextEnd; n++) {
          const el = container.querySelector<HTMLElement>(`[data-verse="${n}"]`)
          if (el) { els.push(el) }
        }
        if (els.length > 0) { observeNewVerses(els) }
      })
    }
  }

  /**
   * Ensure verse N is rendered — used as the callback from scrollToVerse
   * when the target verse hasn't been loaded yet.
   */
  function ensureVerseRendered(targetN: number) {
    if (!surahData) { return }
    while (renderedCount < targetN && renderedCount < surahData.ar.length) {
      appendChunk()
    }
  }

  // ---------------------------------------------------------------------------
  // Mount / load
  // ---------------------------------------------------------------------------

  onMount(() => {
    if (!isValidSurahNum(surahNum)) {
      loadError = true
      isLoading = false
      return
    }

    // Update shared reader state
    reader.currentSurahNum = surahNum
    const initialVerse = ayahParam ? parseInt(ayahParam, 10) : 1
    const initialVerseSafe = Number.isFinite(initialVerse) ? initialVerse : 1
    reader.currentVerseKey = `${surahNum}:${initialVerseSafe}`

    // Deep link (#/s/N/V) → persist that verse immediately so other surfaces
    // pick it up even if the user never scrolls. Plain #/s/N must NOT write
    // — it would clobber a previously saved scroll position with verse 1 and
    // cause the reader to jump back to the top on navigate-away-and-back.
    if (ayahParam) {
      void savePosition(surahNum, initialVerseSafe)
    }

    void loadSurah()

    return () => {
      // Cleanup on unmount
      teardownPositionTracking()
      for (const fn of cleanups) { try { fn() } catch { /* ignore */ } }
      cleanups = []
      clearUndoToast()
      clearUndoRecord()
      reader.currentSurahNum = null
      reader.currentVerseKey = null
      reader.currentSurah = null
    }
  })

  async function loadSurah() {
    isLoading = true
    loadError = false

    const timeoutId = setTimeout(() => {
      if (isLoading) {
        loadError = true
        isLoading = false
      }
    }, 5000)

    try {
      performance.mark('reader:fetch-start')

      const [data, surahs, transVisible, pos] = await Promise.all([
        getSurah(surahNum),
        getSurahs(),
        get('settings', 'translationVisible').then((r) => {
          const v = r?.value
          return typeof v === 'boolean' ? v : true
        }),
        get('positions', `s${surahNum}`),
      ])

      clearTimeout(timeoutId)

      // Navigation guard — if surahNum changed while we were loading, abort
      if (reader.currentSurahNum !== surahNum) { return }

      performance.mark('reader:fetch-end')
      performance.measure('reader:surah-fetch', 'reader:fetch-start', 'reader:fetch-end')

      surahData = data
      surahMeta = surahs.find((s) => s.n === surahNum) ?? null
      translationVisible = transVisible
      settings.translationVisible = transVisible

      const posVerse = typeof pos?.verse === 'number' ? pos.verse : null
      savedPosition = posVerse ? { verse: posVerse } : null

      // First-visit seed: if no prior record exists, write verse 1 so other
      // surfaces (continue-reading card, ambient pill) can surface this surah
      // even if the user never scrolls. Subsequent visits preserve the real
      // saved position — see the onMount comment.
      if (posVerse === null && !ayahParam) {
        void savePosition(surahNum, 1)
      }

      // Render first chunk
      verses = []
      renderedCount = 0
      appendChunk()

      // Reset scroll to top of the app-shell scroller. Browsers preserve
      // scrollTop across hash-route changes; without this, remounting the
      // reader with a shorter first-chunk document causes the browser to
      // clamp the stale scrollTop to the new content height — user briefly
      // sees the end of chunk 1 before the position-restore scroll runs.
      const shellScroller = document.getElementById('main-content')
      if (shellScroller) { shellScroller.scrollTop = 0 }

      reader.currentSurah = surahData

      isLoading = false

      // Let Svelte flush the first render, then set up position tracking + hooks
      requestAnimationFrame(() => {
        if (!container) { return }

        const posCleanups = initPositionTracking({
          mainContent: container,
          scroller: document.getElementById('main-content') ?? undefined,
          surahNum,
          shouldSavePosition: true,
          surahMeta: surahMeta ?? undefined,
          savedPosition,
          targetVerse: targetVerse ?? null,
          totalVerseCount: surahData?.ar.length ?? 0,
          ensureVerseRendered,
          onInvalidVerseError: (msg) => { invalidVerseError = msg },
        })
        cleanups.push(...posCleanups)

        // Set up chunked append scroll listener
        cleanups.push(setupChunkedAppend(container, appendChunk))

        // Wire hooks (indicators + long-press). initIndicators handles its own
        // initial mark-cache load + decoration now that READER_SURAH_LOADED is gone.
        if (initIndicators) {
          const cleanup = initIndicators(container)
          cleanups.push(cleanup)
        }
        if (setupLongPress) {
          const cleanup = setupLongPress(container)
          cleanups.push(cleanup)
        }

        emit(Events.AMBIENT_SURFACE, { reason: 'surah-load' })

        performance.mark('reader:first-verse')
        performance.measure('reader:total-load', 'reader:fetch-start', 'reader:first-verse')

        const name = surahMeta?.name ?? `Surah ${surahNum}`
        announce(`${name} loaded, ${surahData?.ar.length ?? 0} verses`)
      })
    } catch {
      clearTimeout(timeoutId)
      loadError = true
      isLoading = false
    }
  }

  function handleRetry() {
    for (const fn of cleanups) { try { fn() } catch { /* ignore */ } }
    cleanups = []
    void loadSurah()
  }
</script>

{#if isLoading}
  <div class="qa-skeleton qa-skeleton-line" style="width: 100%"></div>
  <div class="qa-skeleton qa-skeleton-line" style="width: 80%"></div>
  <div class="qa-skeleton qa-skeleton-line" style="width: 100%"></div>
  <div class="qa-skeleton qa-skeleton-line" style="width: 60%"></div>
  <div class="qa-skeleton qa-skeleton-line" style="width: 90%"></div>
  <div class="qa-skeleton qa-skeleton-line" style="width: 75%"></div>
{:else if loadError}
  <div class="qa-error-state">
    Failed to load Surah {surahNum}.<br />
    <button class="qa-retry-btn" onclick={handleRetry}>Retry</button>
  </div>
{:else if surahMeta && surahData}
  <div
    bind:this={container}
    role="main"
    aria-label="Reading {surahMeta.name}"
  >
    <EdgeIndicator />

    {#if invalidVerseError}
      <div class="qa-invalid-verse-error" data-invalid-verse-error="">
        {invalidVerseError}
        <button
          aria-label="Dismiss"
          onclick={() => { invalidVerseError = null }}
        >×</button>
      </div>
    {/if}

    <SurahHeader {surahNum} meta={surahMeta} />

    {#each verses as v (v.key)}
      <Verse
        verseKey={v.key}
        arabic={v.ar}
        translation={v.en}
        {translationVisible}
      />
    {/each}

    <div class="qa-surah-end" data-surah-end="">End of {surahMeta.name}</div>
  </div>
{/if}

<style>
  /* Surah header card */
  :global(.qa-surah-header-card) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.125rem 1rem;
    margin-bottom: 0.75rem;
    border: 1px solid var(--qa-ambient-border);
    border-radius: var(--qa-radius-xl);
    background: var(--qa-ambient-surface);
    text-align: center;
  }

  :global(.qa-surah-name) {
    font-family: var(--qa-font-arabic);
    font-size: 2.75rem;
    color: var(--qa-text-arabic);
    direction: rtl;
    line-height: var(--qa-line-height-arabic);
  }

  :global(.qa-surah-meta) {
    font-size: 0.75rem;
    color: var(--qa-text-secondary);
    margin-top: 0.25rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 600;
  }

  /* Basmala */
  :global(.qa-basmala) {
    font-family: var(--qa-font-arabic);
    font-size: 1.75rem;
    text-align: center;
    padding: 0.75rem 0;
    color: var(--qa-text-arabic);
    direction: rtl;
    line-height: var(--qa-line-height-arabic);
  }

  /* Individual Verse Container — layout co-located in Verse.svelte */

  @media (hover: hover) {
    :global(.qa-verse) {
      transition: background-color var(--qa-transition-base);
    }
    :global(.qa-verse:hover) {
      background-color: var(--qa-verse-hover-bg);
      border-radius: var(--qa-radius-2xl);
    }
  }

  /* Arabic Text Block */
  :global(.qa-verse-arabic) {
    font-family: var(--qa-font-arabic);
    font-size: calc(var(--qa-text-size-arabic) * var(--qa-font-size-base));
    line-height: var(--qa-line-height-arabic);
    direction: rtl;
    text-align: start;
    color: var(--qa-text-arabic);
    word-spacing: 0.05em;
    margin-bottom: 0.875rem;
  }
  /* verse number / tagging badge styles co-located in Verse.svelte */

  /* English Translation Block */
  :global(.qa-verse-translation) {
    font-family: var(--qa-font-translation);
    font-size: calc(var(--qa-text-size-translation) * var(--qa-font-size-base));
    line-height: var(--qa-line-height-translation);
    color: var(--qa-text-primary);
    direction: ltr;
    text-align: left;
    padding-top: 0.25rem;
    text-wrap: pretty;
  }

  :global(.qa-verse-translation.qa-hide-translation) {
    display: none;
  }

  /* Surah end marker */
  :global(.qa-surah-end) {
    text-align: center;
    padding: 2rem 0 1rem;
    color: var(--qa-text-secondary);
    font-size: var(--qa-text-size-meta);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  /* Bookmarked verse — class still applied by marks/indicator.ts for a11y/
     test assertions, but no visual left-edge accent: accent strictly belongs
     to the active-tagging quickbar path (see Verse.svelte .qa-verse--active). */

  /* Edge indicators — fixed positioned, appended to body */
  :global(.qa-edge-indicator) {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 36px;
    background-color: var(--qa-ambient-accent);
    opacity: 0;
    border-radius: var(--qa-radius-hairline);
    pointer-events: none;
    z-index: 50;
    transition: opacity var(--qa-transition-base), top var(--qa-transition-base);
  }

  :global(.qa-edge-indicator--left) { left: 0; border-radius: 0 2px 2px 0; }
  :global(.qa-edge-indicator--right) { right: 0; border-radius: 2px 0 0 2px; }

  :global(.qa-edge-indicator--visible) {
    opacity: 0.7;
  }

  /* Invalid verse error */
  :global(.qa-invalid-verse-error) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    margin-bottom: 1.5rem;
    background-color: var(--qa-bg-error);
    border: 1px solid var(--qa-border-error);
    color: var(--qa-text-error);
    border-radius: var(--qa-radius-md);
    font-size: var(--qa-text-size-ui);
  }

  /* Loading skeleton — placeholder lines shown during surah fetch */
  .qa-skeleton {
    background: linear-gradient(
      90deg,
      var(--qa-skeleton) 0%,
      color-mix(in srgb, var(--qa-skeleton) 60%, transparent) 50%,
      var(--qa-skeleton) 100%
    );
    background-size: 200% 100%;
    border-radius: var(--qa-radius-xs);
    animation: qa-skeleton-shimmer 1.4s ease-in-out infinite;
  }
  .qa-skeleton-line {
    height: 1rem;
    margin: 0.75rem 0;
  }
  @keyframes qa-skeleton-shimmer {
    from { background-position: 200% 0; }
    to   { background-position: -200% 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .qa-skeleton { animation: none; }
  }

</style>
