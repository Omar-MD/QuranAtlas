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

    // Persist an initial position record so other surfaces (surah list
    // continue-reading card, ambient pill, etc.) can discover the last-visited
    // reader location even if the user never scrolls.
    void savePosition(surahNum, initialVerseSafe)

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

      // Render first chunk
      verses = []
      renderedCount = 0
      appendChunk()

      reader.currentSurah = surahData

      isLoading = false

      // Let Svelte flush the first render, then set up position tracking + hooks
      requestAnimationFrame(() => {
        if (!container) { return }

        const posCleanups = initPositionTracking({
          mainContent: container,
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
          class="qa-error-dismiss"
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
    gap: 0.75rem;
    padding: 2rem 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--qa-ambient-border);
    border-radius: 12px;
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
    padding: 1.5rem 0;
    color: var(--qa-text-arabic);
    direction: rtl;
    line-height: var(--qa-line-height-arabic);
  }

  /* Individual Verse Container — layout co-located in Verse.svelte */
  :global(.qa-verse:last-child) {
    border-bottom: none;
  }

  @media (hover: hover) {
    :global(.qa-verse) {
      transition: background-color 0.18s ease;
    }
    :global(.qa-verse:hover) {
      background-color: var(--qa-verse-hover-bg);
    }
  }

  /* Arabic Text Block */
  :global(.qa-verse-arabic) {
    font-family: var(--qa-font-arabic);
    font-size: calc(var(--qa-text-size-arabic) * var(--qa-font-size-base));
    line-height: var(--qa-line-height-arabic);
    direction: rtl;
    text-align: justify;
    color: var(--qa-text-arabic);
    word-spacing: 0.1em;
    margin-bottom: 1rem;
  }
  /* verse number / tagging badge styles co-located in Verse.svelte */

  /* English Translation Block */
  :global(.qa-verse-translation) {
    font-family: var(--qa-font-translation);
    font-size: calc(var(--qa-text-size-translation) * var(--qa-font-size-base));
    line-height: 1.75;
    color: var(--qa-text-primary);
    direction: ltr;
    text-align: left;
    padding-top: 0.75rem;
    border-top: 1px dashed var(--qa-border);
  }

  :global(.qa-verse-translation.qa-hide-translation) {
    display: none;
  }

  /* Tablet: bump verse breathing room ~25% */
  @media (min-width: 768px) {
    :global(.qa-verse) {
      padding: 1.875rem 0;
    }
    :global(.qa-verse-arabic) {
      margin-bottom: 1.25rem;
    }
    :global(.qa-verse-translation) {
      padding-top: 0.9375rem;
    }
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
    border-radius: 2px;
    pointer-events: none;
    z-index: 50;
    transition: opacity 0.18s ease, top 0.18s ease;
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
    border-radius: 8px;
    font-size: var(--qa-text-size-ui);
  }

  /* Desktop reading column */
  @media (min-width: 1180px) {
    :global(.qa-verse) {
      padding: 2.25rem 0;
    }
    :global(.qa-verse-arabic) {
      margin-bottom: 1.5rem;
    }
    :global(.qa-verse-translation) {
      padding-top: 1rem;
    }
  }
</style>
