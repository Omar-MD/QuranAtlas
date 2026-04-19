<script lang="ts">
  import { onMount } from 'svelte'
  import { get } from '../core/db'
  import { on, emit } from '../core/events'
  import { Events } from '../core/constants'
  import { openMoreSheet } from './more-sheet-bridge'
  import { openCommandSheet } from './command-sheet-bridge'
  import { ambientChrome } from '../state/ambient-chrome.svelte'

  const AUTO_FADE_MS = 2800
  const HIDE_DELTA = 40
  const SHOW_NEAR_TOP = 20

  type Tab = {
    id: string
    label: string
    icon: string
    matches: (h: string) => boolean
  }

  let lastSurahHref = $state('#/s/1')
  let currentHash = $state(window.location.hash || '')
  let lastTop = 0

  // footer DOM ref — set in onMount
  let footer: HTMLElement | null = null

  function setHidden(v: boolean): void {
    if (!footer) { return }
    footer.classList.toggle('qa-dock--hidden', v)
  }

  const TABS: Tab[] = [
    { id: 'read',   label: 'Read',   icon: '\uD83D\uDCD6', matches: (h) => h.startsWith('#/s/') },
    { id: 'search', label: 'Search', icon: '\u2315',        matches: () => false },
    { id: 'review', label: 'Review', icon: '\u2726',        matches: (h) => h.startsWith('#/review') || h.startsWith('#/t/') },
    { id: 'more',   label: 'More',   icon: '\u22EF',        matches: (h) => h.startsWith('#/settings') || h.startsWith('#/about') },
  ]

  function isReaderRoute(hash: string): boolean {
    return (hash || '').startsWith('#/s/')
  }

  function isOnboardingRoute(hash: string): boolean {
    return (hash || '').startsWith('#/onboarding')
  }

  function applyRoutePersistence(hash: string): void {
    if (isOnboardingRoute(hash)) {
      setHidden(true)
      if (ambientChrome.dockFadeTimerHandle) {
        clearTimeout(ambientChrome.dockFadeTimerHandle)
        ambientChrome.dockFadeTimerHandle = null
      }
      return
    }
    if (isReaderRoute(hash)) {
      setHidden(true)
    } else {
      setHidden(false)
      if (ambientChrome.dockFadeTimerHandle) {
        clearTimeout(ambientChrome.dockFadeTimerHandle)
        ambientChrome.dockFadeTimerHandle = null
      }
    }
  }

  function scheduleFade(): void {
    if (ambientChrome.dockFadeTimerHandle) {
      clearTimeout(ambientChrome.dockFadeTimerHandle)
    }
    ambientChrome.dockFadeTimerHandle = setTimeout(() => {
      if (isReaderRoute(window.location.hash)) {
        setHidden(true)
      }
      ambientChrome.dockFadeTimerHandle = null
    }, AUTO_FADE_MS)
  }

  function getHref(id: string): string {
    if (id === 'read') { return lastSurahHref }
    if (id === 'review') { return '#/review' }
    return '#'
  }

  function handleClick(e: MouseEvent, id: string): void {
    if (id === 'search') {
      e.preventDefault()
      openCommandSheet()
    } else if (id === 'more') {
      e.preventDefault()
      emit(Events.AMBIENT_SURFACE, { reason: 'dock' })
      openMoreSheet()
    } else {
      emit(Events.AMBIENT_SURFACE, { reason: 'dock' })
    }
  }

  onMount(() => {
    footer = document.getElementById('bottom-nav')

    // Load last-read surah for the Read tab href
    get('settings', 'lastSurface').then((rec) => {
      const val = typeof rec?.value === 'string' ? rec.value : ''
      const m = val.match(/^#\/s\/(\d+)/)
      if (m && m[1]) { lastSurahHref = `#/s/${m[1]}` }
    }).catch(() => { /* ignore */ })

    currentHash = window.location.hash || ''
    applyRoutePersistence(currentHash)

    const onHashChange = () => {
      currentHash = window.location.hash || ''
      applyRoutePersistence(currentHash)
    }
    window.addEventListener('hashchange', onHashChange)

    const unsubRoute = on(Events.ROUTER_ROUTE_CHANGE, () => {
      currentHash = window.location.hash || ''
      applyRoutePersistence(currentHash)
    })

    const unsubSurface = on(Events.AMBIENT_SURFACE, () => {
      if (isReaderRoute(window.location.hash)) {
        setHidden(false)
        scheduleFade()
      }
    })

    const mainContent = document.getElementById('main-content')
    let scrollHandler: (() => void) | null = null
    if (mainContent) {
      scrollHandler = () => {
        const top = mainContent.scrollTop
        const delta = top - lastTop
        if (!isReaderRoute(window.location.hash)) { return }
        if (top < SHOW_NEAR_TOP) {
          setHidden(false)
        } else if (delta > HIDE_DELTA) {
          setHidden(true)
          lastTop = top
        } else if (delta < -HIDE_DELTA) {
          setHidden(false)
          lastTop = top
        }
      }
      mainContent.addEventListener('scroll', scrollHandler, { passive: true })
    }

    return () => {
      window.removeEventListener('hashchange', onHashChange)
      unsubRoute()
      unsubSurface()
      if (mainContent && scrollHandler) {
        mainContent.removeEventListener('scroll', scrollHandler)
      }
      if (ambientChrome.dockFadeTimerHandle) {
        clearTimeout(ambientChrome.dockFadeTimerHandle)
        ambientChrome.dockFadeTimerHandle = null
      }
    }
  })
</script>

{#each TABS as tab (tab.id)}
  <a
    class="qa-dock-item"
    class:qa-dock-item--active={tab.matches(currentHash)}
    data-tab={tab.id}
    aria-label={tab.label}
    aria-current={tab.matches(currentHash) ? 'page' : undefined}
    href={getHref(tab.id)}
    onclick={(e) => handleClick(e, tab.id)}
  >
    <span class="qa-dock-icon" aria-hidden="true">{tab.icon}</span>
    <span class="qa-dock-label">{tab.label}</span>
  </a>
{/each}

<style>
  .qa-dock-item {
    position: relative;
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--qa-ambient-dim);
    text-decoration: none;
    font-size: 1rem;
    line-height: 1;
    transition: none;
  }

  .qa-dock-item:hover,
  .qa-dock-item:focus-visible {
    color: var(--qa-ambient-accent);
    text-decoration: none;
    outline: none;
    background-color: var(--qa-ambient-accent-soft);
  }

  .qa-dock-icon {
    font-size: 1.1rem;
    line-height: 1;
  }

  /* Visually hidden label (kept for a11y) */
  .qa-dock-label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .qa-dock-item--active {
    background-color: var(--qa-selection-bg);
    color: var(--qa-selection-text);
    box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
  }

  /* Touch target hit zone */
  .qa-dock-item::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
  }

  /* Tablet: larger dock hit targets for iPad. Glyph-only still. */
  @media (min-width: 768px) {
    .qa-dock-item {
      width: 2.625rem;
      height: 2.625rem;
    }
    .qa-dock-icon {
      font-size: 1.2rem;
    }
  }

  /* Desktop: dock becomes a labeled pill. */
  @media (min-width: 1180px) {
    .qa-dock-item {
      width: auto;
      height: auto;
      padding: 0.5rem 0.875rem;
      border-radius: 999px;
      gap: 0.5rem;
      font-size: var(--qa-text-size-ui);
    }
    .qa-dock-label {
      position: static;
      width: auto;
      height: auto;
      padding: 0;
      margin: 0;
      overflow: visible;
      clip: auto;
      clip-path: none;
      white-space: nowrap;
    }
    .qa-dock-icon {
      font-size: 1.15rem;
    }
  }
</style>
