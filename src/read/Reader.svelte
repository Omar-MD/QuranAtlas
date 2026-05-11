<script lang="ts">
  import { onMount, mount, unmount } from 'svelte'
  import Verse from './Verse.svelte'
  import SurahHeader from './SurahHeader.svelte'
  import EdgeIndicator from './EdgeIndicator.svelte'
  import { reader } from './state.svelte'
  import { settings } from '../configure/state.svelte'
  import { getSurah, getSurahs, loadTranslationForSurah, RiwayahPackUnavailableError } from '../data/dataset'
  import type { SurahPayload, SurahMeta, TranslationPayload } from '../data/dataset'
  import { loadAyahKnowledgeForSurah, loadPassagesForSurah, type AyahKnowledgeEntry, type KnowledgePassage } from '../data/knowledge-dataset'
  import { loadVerseAliases, resolveTranslationFor, type VerseAliases, type TranslationRole } from '../data/verse-aliases'
  import { get } from '../core/db'
  import { navigate } from '../core/router'
  import { emit, on } from '../core/events'
  import { Events } from '../core/constants'
  import { announce } from '../a11y/announcer'
  import { logger } from '../core/logger'
  import { clearUndoToast, clearUndoRecord } from '../core/ui-bridge'
  import {
    setupVirtualiser,
    type VirtualiserHandle,
    type MountVerse,
  } from './chunked-virtualiser'
  import { initPositionTracking, teardownPositionTracking, savePosition } from './position'
  import { observeNewVerses } from './scroll-tracker'
  import { isValidSurahNum } from './render-helpers'
  import { scrollToVerse } from './verse-scroll'
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
  import { syncTafsirSourceFromSettings } from './tafsir-state.svelte'

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
    /** Hook: receives the reader container and returns a cleanup fn */
    setupLongPress?: (container: HTMLElement) => () => void
  }

  const { surah: surahParam, ayah: ayahParam, initIndicators, setupLongPress }: Props = $props()

  // ---------------------------------------------------------------------------
  // Local state
  // ---------------------------------------------------------------------------

  const surahNum = $derived(parseInt(surahParam ?? '', 10))
  const targetVerse = $derived(ayahParam ? parseInt(ayahParam, 10) : null)

  type VerseItem = {
    aya_no: number
    key: string
    arabic: string
    translation: string
    translationRole: TranslationRole
    primaryAyah?: number
    themes: string[]
    passageSummary?: string
  }

  let surahData = $state<SurahPayload | null>(null)
  let surahMeta = $state<SurahMeta | null>(null)
  let translationPack = $state<TranslationPayload | null>(null)
  let translationByVerse = $state<Record<string, string>>({})
  let translationRoleByVerse = $state<Record<string, { role: TranslationRole, primaryAyah?: number }>>({})
  let verseAliases = $state<VerseAliases | null>(null)
  let ayahKnowledgeByKey = $state<Record<string, AyahKnowledgeEntry>>({})
  let passagesById = $state<Record<string, KnowledgePassage>>({})
  let allSurahs = $state<SurahMeta[]>([])
  // translationVisible is also initialised from IDB in loadSurah() so we can't use $derived
  let translationVisible = $state(settings.translationVisible ?? true)
  let activeTranslationId = $state(settings.translationId ?? 'bridges')
  let isLoading = $state(true)
  let loadError = $state(false)
  let installPrompt = $state<{ riwayah: string } | null>(null)
  let invalidVerseError = $state<string | null>(null)

  let container: HTMLElement | null = $state(null)
  let virtualiserContainer: HTMLElement | null = $state(null)
  let virtualiser: VirtualiserHandle | null = null
  let chunkObserver: IntersectionObserver | null = null
  let chunkObserverFrame: number | null = null
  let anchorTimer: ReturnType<typeof setTimeout> | null = null
  let translationRefreshToken = 0
  let cleanups: Array<() => void> = []
  let knowledgeLoadId = 0
  let surahLoadId = 0

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
    const nextVisible = settings.translationVisible
    if (nextVisible === null || !surahData || isLoading || translationVisible === nextVisible) {
      return
    }
    translationVisible = nextVisible
    refreshMountedVerses()
  })

  $effect(() => {
    const nextTranslationId = settings.translationId ?? 'bridges'
    if (!surahData || isLoading || nextTranslationId === activeTranslationId) {
      return
    }
    const token = ++translationRefreshToken
    void syncTranslationSelection(nextTranslationId, token)
  })

  $effect(() => {
    const nextTafsirId = settings.tafsirId ?? 'muyassar'
    void syncTafsirSourceFromSettings(nextTafsirId)
  })

  // Typography-change re-anchor: when the user drags a flow-step / font-size
  // slider, live verses re-layout taller/shorter and spacer chunks (cached at
  // the old heights) become wrong. Drop the height cache and re-anchor scroll
  // on the current center-band verse via scrollToVerse → ensureVerseRendered.
  // 50ms debounce coalesces slider drag bursts.
  $effect(() => {
    void settings.lineSpacing
    void settings.wordSpacing
    void settings.verseSpacing
    void settings.readerMargin
    void settings.fontSize
    if (!virtualiser || !container) { return }
    if (anchorTimer) { clearTimeout(anchorTimer) }
    const anchorKey = reader.currentVerseKey
    anchorTimer = setTimeout(() => {
      anchorTimer = null
      virtualiser?.invalidateHeightCache()
      if (anchorKey && container) {
        const parts = anchorKey.split(':')
        const verse = parseInt(parts[1] ?? '1', 10)
        if (Number.isFinite(verse)) {
          scrollToVerse(container, verse, ensureVerseRendered)
        }
      }
    }, 50)
  })

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Ensure verse N is rendered — used as the callback from scrollToVerse
   * when the target verse hasn't been materialised by the virtualiser yet.
   * Delegates to the virtualiser, which slides its window to chunkOf(N).
   */
  function ensureVerseRendered(targetN: number) {
    virtualiser?.ensureVerseRendered(targetN)
  }

  function resetKnowledgeState() {
    ayahKnowledgeByKey = {}
    passagesById = {}
  }

  function getRestoreVerse(): number | null {
    const key = reader.currentVerseKey
    if (!key || !key.startsWith(`${surahNum}:`)) {
      return null
    }
    const value = parseInt(key.split(':')[1] ?? '1', 10)
    return Number.isFinite(value) ? value : null
  }

  function currentRiwayah(): 'hafs' | 'warsh' | 'qaloon' {
    return (settings.riwayah ?? 'qaloon') as 'hafs' | 'warsh' | 'qaloon'
  }

  function isActiveSurahLoad(loadId: number, riwayah: 'hafs' | 'warsh' | 'qaloon'): boolean {
    return (
      loadId === surahLoadId
      && reader.currentSurahNum === surahNum
      && currentRiwayah() === riwayah
    )
  }

  function currentFootnotes(): Record<string, string> {
    return translationPack?.footnotes ?? {}
  }

  function buildTranslationState(
    data: SurahPayload,
    resolvedPack: TranslationPayload | null,
    aliases: VerseAliases | null,
    translationId: string,
  ): {
    map: Record<string, string>
    roleMap: Record<string, { role: TranslationRole, primaryAyah?: number }>
  } {
    const hafsMap: Record<string, string> = {}
    if (resolvedPack) {
      for (const v of resolvedPack.verses) { hafsMap[v.key] = v.text }
    }
    const map: Record<string, string> = {}
    const roleMap: Record<string, { role: TranslationRole, primaryAyah?: number }> = {}
    if (resolvedPack && data.ayat?.length) {
      const missing: string[] = []
      for (const ayah of data.ayat) {
        const riwayahKey = `${data.sura_no}:${ayah.aya_no}`
        const resolution = resolveTranslationFor(aliases, data.riwayah, data.sura_no, ayah.aya_no)
        roleMap[riwayahKey] = { role: resolution.role, primaryAyah: resolution.primaryAyah }
        if (resolution.role === 'continuation') {
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
          `[translation-miss] riwayah=${data.riwayah} translation=${translationId} `
          + `surah=${data.sura_no} missing=${missing.length} keys=${missing.slice(0, 5).join(',')}`
          + (missing.length > 5 ? `…+${missing.length - 5}` : ''),
        )
      }
    }
    return { map, roleMap }
  }

  function refreshMountedVerses(opts: { applyBottomSwapAnchor?: boolean } = {}) {
    if (!surahData) {
      return
    }
    mountVirtualisedVerses(surahData, {
      footnotes: currentFootnotes(),
      translationVisible,
      riwayah: currentRiwayah(),
      restoreVerse: opts.applyBottomSwapAnchor ? null : getRestoreVerse(),
      applyBottomSwapAnchor: opts.applyBottomSwapAnchor === true,
    })
  }

  async function syncTranslationSelection(nextTranslationId: string, token: number): Promise<void> {
    const pack = await loadTranslationForSurah(nextTranslationId, surahNum).catch(() => null)
    if (
      token !== translationRefreshToken
      || !surahData
      || reader.currentSurahNum !== surahNum
    ) {
      return
    }
    translationPack = pack
    activeTranslationId = nextTranslationId
    const nextState = buildTranslationState(surahData, pack, verseAliases, nextTranslationId)
    translationByVerse = nextState.map
    translationRoleByVerse = nextState.roleMap
    refreshMountedVerses()
  }

  function getVerseThemes(key: string): string[] {
    const entry = ayahKnowledgeByKey[key]
    return entry ? entry.themes.map(theme => theme.id) : []
  }

  function getVersePassageSummary(key: string): string | undefined {
    const passageId = ayahKnowledgeByKey[key]?.passageId
    if (!passageId) {
      return undefined
    }
    return passagesById[passageId]?.summary?.en ?? undefined
  }

  function buildVerseItems(data: SurahPayload): VerseItem[] {
    return data.ayat.map((ayah) => {
      const key = `${data.sura_no}:${ayah.aya_no}`
      const roleInfo = translationRoleByVerse[key]
      return {
        aya_no: ayah.aya_no,
        key,
        arabic: ayah.aya_text ?? '',
        translation: translationByVerse[key] ?? '',
        translationRole: roleInfo?.role ?? 'identity' as const,
        primaryAyah: roleInfo?.primaryAyah,
        themes: getVerseThemes(key),
        passageSummary: getVersePassageSummary(key),
      }
    })
  }

  function teardownVirtualiserMount() {
    if (chunkObserverFrame !== null) {
      cancelAnimationFrame(chunkObserverFrame)
      chunkObserverFrame = null
    }
    if (chunkObserver) {
      chunkObserver.disconnect()
      chunkObserver = null
    }
    virtualiser?.destroy()
    virtualiser = null
  }

  function mountVirtualisedVerses(
    data: SurahPayload,
    opts: {
      footnotes: Record<string, string>
      translationVisible: boolean
      riwayah: 'hafs' | 'warsh' | 'qaloon'
      restoreVerse?: number | null
      applyBottomSwapAnchor?: boolean
    },
  ) {
    if (!container || !virtualiserContainer) {
      return
    }

    teardownVirtualiserMount()

    const items = buildVerseItems(data)
    const mountVerse: MountVerse<VerseItem> = (target, v) => {
      const instance = mount(Verse, {
        target,
        props: {
          verseKey: v.key,
          arabic: v.arabic,
          translation: v.translation,
          translationVisible: opts.translationVisible,
          footnotes: opts.footnotes,
          riwayah: opts.riwayah,
          translationRole: v.translationRole,
          primaryAyah: v.primaryAyah,
          themes: v.themes,
          passageSummary: v.passageSummary,
        },
      })
      return () => { void unmount(instance) }
    }

    virtualiser = setupVirtualiser<VerseItem>({
      container: virtualiserContainer,
      verses: items,
      mountVerse,
      onChunkLive: (_idx, verseEls) => {
        observeNewVerses(verseEls)
      },
    })

    const shellScroller = document.getElementById('main-content')

    if (opts.applyBottomSwapAnchor) {
      const lastVerse = data.ayat.length
      virtualiser.ensureVerseRendered(lastVerse)
      requestAnimationFrame(() => {
        if (shellScroller) {
          shellScroller.scrollTop = shellScroller.scrollHeight
          requestAnimationFrame(() => {
            if (shellScroller) { shellScroller.scrollTop = shellScroller.scrollHeight }
          })
        }
        void savePosition(surahNum, lastVerse)
      })
    } else if (opts.restoreVerse && opts.restoreVerse > 1) {
      virtualiser.ensureVerseRendered(opts.restoreVerse)
      requestAnimationFrame(() => {
        if (container) {
          scrollToVerse(container, opts.restoreVerse ?? 1, ensureVerseRendered)
        }
      })
    }

    chunkObserverFrame = requestAnimationFrame(() => {
      chunkObserverFrame = null
      if (!virtualiserContainer || !virtualiser) { return }
      const chunkRoot = document.getElementById('main-content')
      if (!chunkRoot) { return }
      chunkObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) { continue }
            const idx = parseInt(
              (entry.target as HTMLElement).getAttribute('data-chunk') ?? '',
              10,
            )
            if (!isNaN(idx)) { virtualiser?.setCurrentChunk(idx) }
          }
        },
        {
          root: chunkRoot,
          rootMargin: '300px 0px 300px 0px',
          threshold: 0,
        },
      )
      virtualiserContainer.querySelectorAll<HTMLElement>('[data-chunk]').forEach(
        el => chunkObserver?.observe(el),
      )
    })
  }

  async function loadKnowledgeSidecars(
    knowledgeRequest: number,
    requestedSurah: number,
  ) {
    const [ayahResult, passageResult] = await Promise.allSettled([
      loadAyahKnowledgeForSurah(requestedSurah),
      loadPassagesForSurah(requestedSurah),
    ])

    if (knowledgeRequest !== knowledgeLoadId || reader.currentSurahNum !== requestedSurah || !surahData) {
      return
    }

    let nextAyahKnowledgeByKey: Record<string, AyahKnowledgeEntry> = {}
    let nextPassagesById: Record<string, KnowledgePassage> = {}

    if (ayahResult.status === 'fulfilled' && ayahResult.value) {
      nextAyahKnowledgeByKey = Object.fromEntries(
        ayahResult.value.ayahs.map(entry => [entry.key, entry]),
      )
    } else {
      logger.warn('Reader knowledge ayah shard unavailable', {
        surah: requestedSurah,
        reason: ayahResult.status === 'rejected' ? ayahResult.reason : 'missing-or-invalid',
      })
    }

    if (passageResult.status === 'fulfilled' && passageResult.value) {
      nextPassagesById = Object.fromEntries(
        passageResult.value.passages.map(passage => [passage.id, passage]),
      )
    } else {
      logger.warn('Reader knowledge passage shard unavailable', {
        surah: requestedSurah,
        reason: passageResult.status === 'rejected' ? passageResult.reason : 'missing-or-invalid',
      })
    }

    ayahKnowledgeByKey = nextAyahKnowledgeByKey
    passagesById = nextPassagesById

    if (Object.keys(nextAyahKnowledgeByKey).length === 0 && Object.keys(nextPassagesById).length === 0) {
      return
    }

    refreshMountedVerses()
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
    reader.readerMode = 'verse'
    reader.currentMushafPage = null
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
      const applied = await loadSurah()
      if (!applied) { return }
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
      surahLoadId += 1
      knowledgeLoadId += 1
      if (anchorTimer) { clearTimeout(anchorTimer); anchorTimer = null }
      // Cleanup on unmount
      teardownVirtualiserMount()
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

  async function loadSurah(): Promise<boolean> {
    const loadRequest = ++surahLoadId
    const requestedRiwayah = currentRiwayah()
    const knowledgeRequest = ++knowledgeLoadId
    teardownVirtualiserMount()
    teardownPositionTracking()
    for (const fn of cleanups) { try { fn() } catch { /* ignore */ } }
    cleanups = []
    isLoading = true
    loadError = false
    installPrompt = null
    invalidVerseError = null
    resetKnowledgeState()

    const timeoutId = setTimeout(() => {
      if (isActiveSurahLoad(loadRequest, requestedRiwayah) && isLoading) {
        loadError = true
        isLoading = false
      }
    }, 5000)

    try {
      performance.mark('reader:fetch-start')

      const [data, surahs, transVisible, transId, pack, resolvedVerseAliases] = await Promise.all([
        getSurah(surahNum),
        getSurahs(),
        get('settings', 'translationVisible').then((r) => {
          const v = r?.value
          return typeof v === 'boolean' ? v : true
        }),
        get('settings', 'translationId').then((r) => {
          const v = r?.value
          return typeof v === 'string' && v ? v : (settings.translationId ?? 'bridges')
        }),
        // Optimistically fetch the default pack while we resolve the user's
        // saved id; if the saved id differs, a second fetch follows below.
        loadTranslationForSurah(settings.translationId ?? 'bridges', surahNum).catch(() => null),
        // Cross-riwayah verse-equivalence aliases. Hafs viewer always
        // resolves identity (translations are Hafs-keyed) and never reads
        // the table, so skip the ~170 KB fetch in that path. Lazy-loaded
        // on the first switch to Warsh / Qaloon by `loadVerseAliases`'s
        // own caching layer.
        settings.riwayah === 'hafs'
          ? Promise.resolve(null) as Promise<VerseAliases | null>
          : loadVerseAliases().catch(() => null) as Promise<VerseAliases | null>,
      ])

      clearTimeout(timeoutId)

      // Navigation guard — if surahNum changed while we were loading, abort
      if (!isActiveSurahLoad(loadRequest, requestedRiwayah)) { return false }

      performance.mark('reader:fetch-end')
      performance.measure('reader:surah-fetch', 'reader:fetch-start', 'reader:fetch-end')

      surahData = data
      surahMeta = surahs.find((s) => s.n === surahNum) ?? null
      allSurahs = surahs
      translationVisible = transVisible
      settings.translationVisible = transVisible

      // Resolve translation pack — re-fetch if the user's saved id differs
      // from the optimistic fetch's id.
      const optimisticId = settings.translationId ?? 'bridges'
      let resolvedPack = pack
      if (transId !== optimisticId) {
        resolvedPack = await loadTranslationForSurah(transId, surahNum).catch(() => null)
      }
      if (!isActiveSurahLoad(loadRequest, requestedRiwayah)) { return false }
      settings.translationId = transId
      translationPack = resolvedPack
      activeTranslationId = transId
      verseAliases = resolvedVerseAliases

      const nextTranslationState = buildTranslationState(data, resolvedPack, resolvedVerseAliases, transId)
      translationByVerse = nextTranslationState.map
      translationRoleByVerse = nextTranslationState.roleMap

      // Reset scroll to top of the app-shell scroller. Browsers preserve
      // scrollTop across hash-route changes; without this, remounting the
      // reader with a shorter first-chunk document causes the browser to
      // clamp the stale scrollTop to the new content height — user briefly
      // sees the end of chunk 1 before the position-restore scroll runs.
      const shellScroller = document.getElementById('main-content')
      if (shellScroller) { shellScroller.scrollTop = 0 }

      reader.currentSurah = surahData

      isLoading = false

      // Let Svelte flush the {#if} → main DOM, then bootstrap virtualiser +
      // position tracking + hooks against the now-mounted container.
      requestAnimationFrame(() => {
        if (!isActiveSurahLoad(loadRequest, requestedRiwayah)) { return }
        if (!container || !virtualiserContainer || !surahData) { return }

        refreshMountedVerses({ applyBottomSwapAnchor: swapAnchor === 'bottom' })

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

        void loadKnowledgeSidecars(
          knowledgeRequest,
          surahNum,
        )
      })
      return true
    } catch (err) {
      clearTimeout(timeoutId)
      if (!isActiveSurahLoad(loadRequest, requestedRiwayah)) { return false }
      if (err instanceof RiwayahPackUnavailableError) {
        installPrompt = { riwayah: err.riwayah }
        loadError = false
      } else {
        loadError = true
      }
      isLoading = false
      return false
    }
  }

  function handleRetry() {
    void loadSurah()
  }

  function openInstallPrompt() {
    navigate('#/settings')
  }
</script>

{#if isLoading}
  <div class="qa-skeleton qa-skeleton-line"></div>
  <div class="qa-skeleton qa-skeleton-line qa-skeleton-line--w80"></div>
  <div class="qa-skeleton qa-skeleton-line"></div>
  <div class="qa-skeleton qa-skeleton-line qa-skeleton-line--w60"></div>
  <div class="qa-skeleton qa-skeleton-line qa-skeleton-line--w90"></div>
  <div class="qa-skeleton qa-skeleton-line qa-skeleton-line--w75"></div>
{:else if loadError}
  <div class="qa-error-state">
    Failed to load Surah {surahNum}.<br />
    <button class="qa-retry-btn" onclick={handleRetry}>Retry</button>
  </div>
{:else if installPrompt}
  <div class="qa-riwayah-install-prompt" role="status">
    <p>{installPrompt.riwayah} text is not installed yet.</p>
    <div class="qa-riwayah-install-actions">
      <button class="qa-retry-btn" type="button" onclick={openInstallPrompt}>Open Settings</button>
      <button class="qa-retry-btn" type="button" onclick={handleRetry}>Retry</button>
    </div>
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

    <!-- Virtualiser-owned region: chunked-virtualiser populates this div
         with <div data-chunk={i}> children (live / loading / spacer). -->
    <div bind:this={virtualiserContainer} data-virtualiser-region=""></div>

    {#if nextMeta}
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
