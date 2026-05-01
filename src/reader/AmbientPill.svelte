<script lang="ts">
  import { onMount } from 'svelte'
  import { getSurahs, type SurahMeta as DatasetSurahMeta } from '../data/dataset'
  import { on, emit } from '../core/events'
  import { Events } from '../core/constants'
  import { reader } from '../reader/state.svelte'
  import { ambientChrome } from '../reader/state-ambient.svelte'
  import { openCommandSheet } from '../nav/command-sheet-bridge'

  const AUTO_FADE_MS = 2800

  let surahsById = $state<Map<number, DatasetSurahMeta> | null>(null)
  let hidden = $state(true)
  let currentHash = $state(window.location.hash || '')

  function isReaderRoute(hash: string): boolean {
    return (hash || '').startsWith('#/s/')
  }

  function applyRouteVisibility(hash: string): void {
    if (!isReaderRoute(hash)) {
      hidden = true
      if (ambientChrome.pillFadeTimerHandle) {
        clearTimeout(ambientChrome.pillFadeTimerHandle)
        ambientChrome.pillFadeTimerHandle = null
      }
    } else {
      // On reader route: stays hidden until AMBIENT_SURFACE fires
      hidden = true
    }
  }

  function scheduleFade(): void {
    if (ambientChrome.pillFadeTimerHandle) {
      clearTimeout(ambientChrome.pillFadeTimerHandle)
    }
    ambientChrome.pillFadeTimerHandle = setTimeout(() => {
      hidden = true
      ambientChrome.pillFadeTimerHandle = null
    }, AUTO_FADE_MS)
  }

  // Compute pill label reactively from reader state
  const pillLabel = $derived.by(() => {
    const surah = reader.currentSurahNum
    const vk = reader.currentVerseKey
    const verse = vk ? parseInt(vk.split(':')[1] ?? '1', 10) : 1
    if (!surah) { return '' }
    const meta = surahsById?.get(surah)
    const name = meta?.name ?? ''
    return name ? `${surah}:${verse} \u00B7 ${name}` : `${surah}:${verse}`
  })

  // Mirror pillLabel into ambientChrome (side-effect separated from derived)
  $effect(() => {
    ambientChrome.pillLabel = pillLabel
  })

  onMount(() => {
    // Load surah cache asynchronously — non-blocking
    getSurahs().then(list => {
      surahsById = new Map(list.map(s => [s.n, s]))
    }).catch(() => {
      surahsById = new Map()
    })

    currentHash = window.location.hash || ''
    applyRouteVisibility(currentHash)

    const onHashChange = () => {
      currentHash = window.location.hash || ''
      applyRouteVisibility(currentHash)
    }
    window.addEventListener('hashchange', onHashChange)

    const unsubSurface = on(Events.AMBIENT_SURFACE, () => {
      if (isReaderRoute(window.location.hash)) {
        hidden = false
        scheduleFade()
      }
    })

    // Tap on reader body (outside sheets / chrome) surfaces chrome
    const readerTapHandler = (e: MouseEvent) => {
      if (!isReaderRoute(window.location.hash)) { return }
      const target = e.target as HTMLElement
      if (target.closest('.qa-pill-ref, #bottom-nav, .qa-cmd-sheet, .qa-cmd-scrim, .qa-sheet-backdrop, .qa-sheet')) {
        return
      }
      emit(Events.AMBIENT_SURFACE, { reason: 'tap' })
    }
    document.addEventListener('click', readerTapHandler, { passive: true } as AddEventListenerOptions)

    return () => {
      window.removeEventListener('hashchange', onHashChange)
      unsubSurface()
      document.removeEventListener('click', readerTapHandler)
      if (ambientChrome.pillFadeTimerHandle) {
        clearTimeout(ambientChrome.pillFadeTimerHandle)
        ambientChrome.pillFadeTimerHandle = null
      }
    }
  })
</script>

<div
  class="qa-pill-ref"
  class:qa-pill-ref--hidden={hidden}
  role="button"
  tabindex="0"
  aria-label="Current reading position — press Cmd+K to open command sheet"
  onclick={() => openCommandSheet()}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCommandSheet() }
  }}
>
  <span class="qa-pill-ref-text">{pillLabel}</span>
  <span class="qa-pill-ref-hint">\u2318K</span>
</div>

