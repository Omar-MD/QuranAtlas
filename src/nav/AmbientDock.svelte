<script lang="ts">
  /**
   * Left edge rail (desktop ≥1180px). Always visible on desktop — no
   * auto-fade. Rendered into `#bottom-nav` (layout host in App.svelte).
   * Hidden on mobile/tablet; MarginHeader owns primary nav there.
   */

  import { onMount } from 'svelte'
  import { get, LAYER_NAMES } from '../core/db'
  import { on, emit } from '../core/events'
  import { Events } from '../core/constants'
  import { openCommandSheet } from './command-sheet-bridge'

  type Tab = {
    id: 'read' | 'surahs' | 'search' | 'review' | 'marks'
    label: string
    matches: (h: string) => boolean
  }

  let lastSurahHref = $state('#/s/1')
  let currentHash = $state(typeof window !== 'undefined' ? window.location.hash || '' : '')
  let footer: HTMLElement | null = null

  const TABS: Tab[] = [
    { id: 'read',   label: 'Read',    matches: (h) => h.startsWith('#/s/') },
    { id: 'surahs', label: 'Surahs',  matches: (h) => h.startsWith('#/surahs') },
    { id: 'search', label: 'Search',  matches: () => false },
    { id: 'review', label: 'Review',  matches: (h) => h.startsWith('#/review') || LAYER_NAMES.some(ln => h.startsWith(`#/${ln}/`)) },
    { id: 'marks',  label: 'Marks',   matches: () => false },
  ]

  function isReaderRoute(h: string): boolean { return (h || '').startsWith('#/s/') }
  function isOnboardingRoute(h: string): boolean { return (h || '').startsWith('#/onboarding') }

  function applyRoutePersistence(hash: string): void {
    if (!footer) { return }
    footer.classList.toggle('qa-dock--hidden', isOnboardingRoute(hash))
  }

  function getHref(id: Tab['id']): string {
    if (id === 'read')   { return lastSurahHref }
    if (id === 'surahs') { return '#/surahs' }
    if (id === 'review') { return '#/review' }
    if (id === 'marks')  { return '#/review' }
    return '#'
  }

  function handleClick(e: MouseEvent, id: Tab['id']): void {
    if (id === 'search') {
      e.preventDefault()
      openCommandSheet()
      return
    }
    if (isReaderRoute(window.location.hash)) {
      emit(Events.AMBIENT_SURFACE, { reason: 'dock' })
    }
  }

  onMount(() => {
    footer = document.getElementById('bottom-nav')

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

    return () => {
      window.removeEventListener('hashchange', onHashChange)
      unsubRoute()
    }
  })
</script>

{#each TABS as tab (tab.id)}
  <a
    class="qa-rail-item"
    class:qa-rail-item--active={tab.matches(currentHash)}
    data-tab={tab.id}
    aria-label={tab.label}
    aria-current={tab.matches(currentHash) ? 'page' : undefined}
    href={getHref(tab.id)}
    onclick={(e) => handleClick(e, tab.id)}
  >
    {#if tab.id === 'read'}
      <svg class="qa-rail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 4h7a3 3 0 0 1 3 3v13"/>
        <path d="M20 4h-7a3 3 0 0 0-3 3v13"/>
        <path d="M4 4v13a2 2 0 0 0 2 2h6"/>
        <path d="M20 4v13a2 2 0 0 1-2 2h-6"/>
      </svg>
    {:else if tab.id === 'surahs'}
      <svg class="qa-rail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="4" y1="7" x2="20" y2="7"/>
        <line x1="4" y1="12" x2="20" y2="12"/>
        <line x1="4" y1="17" x2="14" y2="17"/>
      </svg>
    {:else if tab.id === 'search'}
      <svg class="qa-rail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6"/>
        <line x1="15" y1="15" x2="20" y2="20"/>
      </svg>
    {:else if tab.id === 'review'}
      <svg class="qa-rail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="12 3 14.5 9.5 21 10 16 14.5 17.5 21 12 17.5 6.5 21 8 14.5 3 10 9.5 9.5 12 3"/>
      </svg>
    {:else if tab.id === 'marks'}
      <svg class="qa-rail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 3h12v18l-6-4.5L6 21z"/>
      </svg>
    {/if}
    <span class="qa-rail-tip">{tab.label}</span>
  </a>
{/each}

<style>
  .qa-rail-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    color: var(--qa-ambient-dim);
    text-decoration: none;
    transition: color 0.12s ease, background-color 0.12s ease;
  }
  .qa-rail-item:hover,
  .qa-rail-item:focus-visible {
    color: var(--qa-ambient-parchment);
    background-color: var(--qa-ambient-accent-soft);
    outline: none;
  }
  .qa-rail-icon {
    width: 20px;
    height: 20px;
  }
  .qa-rail-item--active {
    color: var(--qa-ambient-parchment);
    background-color: color-mix(in srgb, var(--qa-ambient-surface) 80%, transparent);
  }
  .qa-rail-tip {
    position: absolute;
    left: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%) translateX(-4px);
    padding: 4px 9px;
    border-radius: 6px;
    background: var(--qa-ambient-parchment);
    color: var(--qa-bg-primary);
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s ease, transform 0.12s ease;
    z-index: 2;
  }
  .qa-rail-item:hover .qa-rail-tip,
  .qa-rail-item:focus-visible .qa-rail-tip {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }

  @media (max-width: 1179px) {
    .qa-rail-item { display: none; }
  }
</style>
