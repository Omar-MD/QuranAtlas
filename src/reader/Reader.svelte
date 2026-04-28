<script lang="ts">
  import { onMount } from 'svelte'
  import Verse from './Verse.svelte'
  import SurahHeader from './SurahHeader.svelte'
  import EdgeIndicator from './EdgeIndicator.svelte'
  import { reader } from '../state/reader.svelte'
  import { settings } from '../state/settings.svelte'
  import { getSurah, getSurahs, loadTranslationForSurah } from '../data/dataset'
  import type { SurahPayload, SurahMeta, TranslationPayload } from '../data/dataset'
  import { loadVerseAliases, resolveTranslationFor, type VerseAliases, type TranslationRole } from '../data/verse-aliases'
  import { get } from '../core/db'
  import { emit, on } from '../core/events'
  import { Events } from '../core/constants'
  import { announce } from '../a11y/announcer'
  import { logger } from '../core/logger'
  import { clearUndoToast, clearUndoRecord } from '../core/ui-bridge'
  import { setupChunkedAppend, CHUNK_SIZE } from './chunked-append'
  import { initPositionTracking, teardownPositionTracking, savePosition } from './position'
  import { observeNewVerses } from './scroll-tracker'
  import { isValidSurahNum } from './render-helpers'
  import {
    nextSurah,
    prevSurah,
    swapToSurah,
    consumeSwapAnchor,
    setupPullToSwap,
    type SwapAnchor,
    type PullState,
  } from './surah-swap'
  import PullToSwapIndicator from './PullToSwapIndicator.svelte'

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

  type VerseItem = { key: string; ar: string; en: string; translationRole: TranslationRole; primaryAyah?: number }

  let surahData = $state<SurahPayload | null>(null)
  let surahMeta = $state<SurahMeta | null>(null)
  let translationPack = $state<TranslationPayload | null>(null)
  let translationByVerse = $state<Record<string, string>>({})
  let translationRoleByVerse = $state<Record<string, { role: TranslationRole, primaryAyah?: number }>>({})
  let allSurahs = $state<SurahMeta[]>([])
  // translationVisible is also initialised from IDB in loadSurah() so we can't use $derived
  let translationVisible = $state(settings.translationVisible ?? true)
  let verses = $state<VerseItem[]>([])
  let renderedCount = $state(0)
  let isLoading = $state(true)
  let loadError = $state(false)
  let invalidVerseError = $state<string | null>(null)

  let container: HTMLElement | null = $state(null)
  let cleanups: Array<() => void> = []

  // Captured at mount: 'top' for forward swaps and fresh entry, 'bottom'
  // for backward swaps so the user emerges from the previous surah's end.
  let swapAnchor: SwapAnchor = 'top'

  // Pull-to-swap progress state — drives the circular indicator overlay.
  let pullState = $state<PullState | null>(null)

  const prevMeta = $derived(allSurahs.find(s => s.n === prevSurah(surahNum)) ?? null)
  const nextMeta = $derived(allSurahs.find(s => s.n === nextSurah(surahNum)) ?? null)

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
    if (!surahData || renderedCount >= surahData.ayat.length) { return }
    const nextEnd = Math.min(renderedCount + CHUNK_SIZE, surahData.ayat.length)
    const firstNewVerseNum = renderedCount + 1
    const newItems: VerseItem[] = []
    for (let i = renderedCount; i < nextEnd; i++) {
      const ayah = surahData.ayat[i]
      const key = `${surahData.sura_no}:${ayah?.aya_no ?? (i + 1)}`
      const roleInfo = translationRoleByVerse[key]
      newItems.push({
        key,
        ar: ayah?.aya_text ?? '',
        en: translationByVerse[key] ?? '',
        translationRole: roleInfo?.role ?? 'identity',
        primaryAyah: roleInfo?.primaryAyah,
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
    while (renderedCount < targetN && renderedCount < surahData.ayat.length) {
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

    // Capture the swap anchor stashed by the prior swapToSurah() call (if
    // any). Forward swaps anchor to 'top'; backward swaps to 'bottom'.
    swapAnchor = consumeSwapAnchor()

    // Update shared reader state
    reader.currentSurahNum = surahNum
    const initialVerse = ayahParam ? parseInt(ayahParam, 10) : 1
    const initialVerseSafe = Number.isFinite(initialVerse) ? initialVerse : 1
    reader.currentVerseKey = `${surahNum}:${initialVerseSafe}`

    // Always persist the global position to (surah, initialVerse) on entry
    // — single-position model means landing on a surah overwrites any prior
    // surah's saved verse. Backward swaps overwrite later in loadSurah once
    // the terminal verse is known.
    void savePosition(surahNum, initialVerseSafe)

    void loadSurah()

    // Re-fetch the surah when the user switches Riwayah so the reader
    // immediately shows the correct orthography. Restore the scroll anchor
    // (clamped to the last ayah of the new riwayah when the prior position
    // overshoots the new ayah count).
    const offRiwayah = on(Events.SETTINGS_RIWAYAH_CHANGED, async () => {
      const anchorKey = reader.currentVerseKey
      const anchorAya = anchorKey ? parseInt(anchorKey.split(':')[1] ?? '1', 10) : 1
      await loadSurah()
      const ayatList = surahData?.ayat ?? []
      const lastAya = ayatList.length > 0 ? (ayatList[ayatList.length - 1]?.aya_no ?? 1) : 1
      const safeAya = Math.min(anchorAya, lastAya)
      if (safeAya > 1) {
        ensureVerseRendered(safeAya)
        // Re-use existing scroll-to-verse mechanism via the position tracker
        const el = container?.querySelector<HTMLElement>(`[data-verse="${safeAya}"]`)
        if (el) { el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior }) }
      }
    })

    return () => {
      offRiwayah()
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

      const [data, surahs, transVisible, transId, pack, verseAliases] = await Promise.all([
        getSurah(surahNum),
        getSurahs(),
        get('settings', 'translationVisible').then((r) => {
          const v = r?.value
          return typeof v === 'boolean' ? v : true
        }),
        get('settings', 'translationId').then((r) => {
          const v = r?.value
          return typeof v === 'string' && v ? v : (settings.translationId ?? 'saheeh')
        }),
        // Optimistically fetch the default pack while we resolve the user's
        // saved id; if the saved id differs, a second fetch follows below.
        loadTranslationForSurah(settings.translationId ?? 'saheeh', surahNum).catch(() => null),
        // Cross-riwayah verse-equivalence aliases. Hafs-keyed translations
        // require this map to look up the right Hafs ayah(s) for each
        // Warsh / Qaloon ayah. Cached after first fetch.
        loadVerseAliases().catch(() => null) as Promise<VerseAliases | null>,
      ])

      clearTimeout(timeoutId)

      // Navigation guard — if surahNum changed while we were loading, abort
      if (reader.currentSurahNum !== surahNum) { return }

      performance.mark('reader:fetch-end')
      performance.measure('reader:surah-fetch', 'reader:fetch-start', 'reader:fetch-end')

      surahData = data
      surahMeta = surahs.find((s) => s.n === surahNum) ?? null
      allSurahs = surahs
      translationVisible = transVisible
      settings.translationVisible = transVisible

      // Resolve translation pack — re-fetch if the user's saved id differs
      // from the optimistic fetch's id.
      const optimisticId = settings.translationId ?? 'saheeh'
      let resolvedPack = pack
      if (transId !== optimisticId) {
        resolvedPack = await loadTranslationForSurah(transId, surahNum).catch(() => null)
      }
      settings.translationId = transId
      translationPack = resolvedPack

      // Build the per-verse translation map keyed by the active riwayah's
      // (surah, ayah) tuples. Translations ship Hafs-keyed (Kufan numbering);
      // for Warsh / Qaloon (Madinan numbering) we resolve each riwayah ayah
      // to the corresponding Hafs ayah(s) via `_verse-aliases.json`. KFGQPC's
      // Madinah Mushaf is the authoritative scholarly source — splits are
      // encoded in the dataset itself, derived mechanically by
      // `scripts/derive-verse-aliases.mjs`.
      //
      // Role per Madinan ayah:
      //   - identity: 1:1 alias (or surah without aliases) — show translation as-is
      //   - merged:   multiple Hafs ayat → this Madinan ayah; concat their texts
      //   - primary:  this Madinan ayah is the FIRST half of a Hafs split — show full translation
      //   - continuation: subsequent half — show "↑ continued" marker, no translation
      //   - none:    no Hafs equivalent (e.g. Warsh / Qaloon's surah-1 first ayah)
      const hafsMap: Record<string, string> = {}
      if (resolvedPack) {
        for (const v of resolvedPack.verses) { hafsMap[v.key] = v.text }
      }
      const map: Record<string, string> = {}
      const roleMap: Record<string, { role: TranslationRole, primaryAyah?: number }> = {}
      if (resolvedPack && data?.ayat?.length) {
        const missing: string[] = []
        for (const ayah of data.ayat) {
          const riwayahKey = `${data.sura_no}:${ayah.aya_no}`
          const resolution = resolveTranslationFor(verseAliases, data.riwayah, data.sura_no, ayah.aya_no)
          roleMap[riwayahKey] = { role: resolution.role, primaryAyah: resolution.primaryAyah }
          if (resolution.role === 'continuation') {
            // Translation lives on the primary ayah; this one shows the marker.
            map[riwayahKey] = ''
          } else if (resolution.role === 'none') {
            map[riwayahKey] = ''
            missing.push(riwayahKey)
          } else {
            const parts = resolution.hafsKeys.map((k) => hafsMap[k] ?? '').filter(Boolean)
            if (parts.length === 0) {
              missing.push(riwayahKey)
              map[riwayahKey] = ''
            } else {
              map[riwayahKey] = parts.join(' ')
            }
          }
        }
        if (missing.length > 0) {
          logger.warn(
            `[translation-miss] riwayah=${data.riwayah} translation=${transId} `
            + `surah=${data.sura_no} missing=${missing.length} keys=${missing.slice(0, 5).join(',')}`
            + (missing.length > 5 ? `…+${missing.length - 5}` : ''),
          )
        }
      }
      translationByVerse = map
      translationRoleByVerse = roleMap

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

        // Backward swap: expand all chunks then anchor scroll at the bottom
        // so the user sees the previous surah's terminal verse.
        if (swapAnchor === 'bottom' && surahData) {
          ensureVerseRendered(surahData.ayat.length)
          requestAnimationFrame(() => {
            if (shellScroller) {
              shellScroller.scrollTop = shellScroller.scrollHeight
            }
            if (surahData) {
              void savePosition(surahNum, surahData.ayat.length)
            }
          })
        }

        const posCleanups = initPositionTracking({
          mainContent: container,
          scroller: document.getElementById('main-content') ?? undefined,
          surahNum,
          shouldSavePosition: true,
          surahMeta: surahMeta ?? undefined,
          savedPosition: null,
          targetVerse: targetVerse ?? null,
          totalVerseCount: surahData?.ayat.length ?? 0,
          ensureVerseRendered,
          onInvalidVerseError: (msg) => { invalidVerseError = msg },
        })
        cleanups.push(...posCleanups)

        // Set up chunked append scroll listener
        cleanups.push(setupChunkedAppend(container, appendChunk))

        // Wire pull-to-swap gesture — Chrome-mobile-style circular indicator
        // drives a progress 0..1 that the user fills by pulling past the
        // top/bottom edge. Commit fires the swap.
        if (shellScroller) {
          cleanups.push(setupPullToSwap({
            scroller: shellScroller,
            onPull: (state) => { pullState = state },
            onCommit: (direction) => {
              if (direction === 'forward') {
                swapToSurah(nextSurah(surahNum), 'top')
              } else {
                swapToSurah(prevSurah(surahNum), 'bottom')
              }
            },
          }))
        }

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
        announce(`${name} loaded, ${surahData?.ayat.length ?? 0} verses`)
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

    {#if prevMeta}
      <button
        type="button"
        class="qa-continue-prev"
        data-continue-prev=""
        onclick={() => swapToSurah(prevSurah(surahNum), 'bottom')}
        aria-label={`Previous surah: ${prevMeta.name}`}
      ><span class="qa-continue-arrow" aria-hidden="true">↑</span><span class="qa-continue-title">{prevMeta.name}</span></button>
    {/if}

    <SurahHeader {surahNum} meta={surahMeta} />

    {#each verses as v (v.key)}
      <Verse
        verseKey={v.key}
        arabic={v.ar}
        translation={v.en}
        footnotes={translationPack?.footnotes ?? {}}
        {translationVisible}
        translationRole={v.translationRole}
        primaryAyah={v.primaryAyah}
      />
    {/each}

    {#if renderedCount === (surahData?.ayat.length ?? 0) && nextMeta}
      <button
        type="button"
        class="qa-continue-next"
        data-continue-next=""
        onclick={() => swapToSurah(nextSurah(surahNum), 'top')}
        aria-label={`Next surah: ${nextMeta.name}`}
      ><span class="qa-continue-title">{nextMeta.name}</span><span class="qa-continue-arrow" aria-hidden="true">↓</span></button>
    {:else}
      <div class="qa-surah-end" data-surah-end="">End of {surahMeta.name}</div>
    {/if}
  </div>

  <PullToSwapIndicator
    direction={pullState?.direction ?? null}
    progress={pullState?.progress ?? 0}
  />
{/if}

