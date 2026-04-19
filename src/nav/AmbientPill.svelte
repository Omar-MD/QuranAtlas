<script lang="ts">
  import { onMount } from 'svelte'
  import { getSurahs, type SurahMeta as DatasetSurahMeta } from '../data/dataset'
  import { on, emit } from '../core/events'
  import { Events } from '../core/constants'
  import { reader } from '../state/reader.svelte'
  import { ambientChrome } from '../state/ambient-chrome.svelte'
  import { openCommandSheet } from './command-sheet-bridge'

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

<style>
  .qa-pill-ref {
    position: fixed;
    top: calc(10px + env(safe-area-inset-top));
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 12px;
    border-radius: var(--qa-ambient-pill-radius);
    background-color: color-mix(in srgb, var(--qa-ambient-surface) 92%, transparent);
    color: var(--qa-ambient-parchment);
    font-size: 0.75rem;
    letter-spacing: 0.02em;
    border: 1px solid var(--qa-ambient-accent-soft);
    cursor: pointer;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
    z-index: 99;
    transition: transform 0.22s ease, visibility 0s linear 0s;
  }

  :global(html[data-theme="dark"]) .qa-pill-ref {
    background-color: rgba(20, 18, 12, 0.92);
    color: #e8e3c9;
  }

  .qa-pill-ref:focus-visible {
    outline: 2px solid var(--qa-ambient-accent);
    outline-offset: 2px;
  }

  .qa-pill-ref--hidden {
    visibility: hidden;
    transform: translateX(-50%) translateY(-10px);
    pointer-events: none;
    transition: transform 0.22s ease, visibility 0s linear 0.22s;
  }

  .qa-pill-ref-text {
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .qa-pill-ref-hint {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.6875rem;
    color: var(--qa-ambient-dim);
    border: 1px solid var(--qa-ambient-accent-soft);
    border-radius: 4px;
    padding: 1px 5px;
  }
</style>
