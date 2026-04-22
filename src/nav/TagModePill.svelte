<script lang="ts">
  /**
   * Top-right "Tag mode" pill — desktop only, reader routes only.
   * Always visible on reader. Toggles fast-tag quickbar:
   *   off → beginFast(currentVerseKey)
   *   on  → tagSession.end()
   */

  import { onMount } from 'svelte'
  import { tagSession } from '../state/tag-session.svelte'
  import { reader } from '../state/reader.svelte'
  import { on } from '../core/events'
  import { Events } from '../core/constants'
  import { beginFast } from '../tag/session-bridge'

  let currentHash = $state(typeof window !== 'undefined' ? window.location.hash || '' : '')

  const isReaderRoute = $derived(currentHash.startsWith('#/s/'))
  const active = $derived(tagSession.quickbarOpen || tagSession.sheetOpen)
  const visible = $derived(isReaderRoute)

  function toggle(): void {
    if (active) { tagSession.end(); return }
    const vk = reader.currentVerseKey
    if (!vk) { return }
    void beginFast(vk)
  }

  onMount(() => {
    currentHash = window.location.hash || ''
    const onHash = () => { currentHash = window.location.hash || '' }
    window.addEventListener('hashchange', onHash)
    const unsubRoute = on(Events.ROUTER_ROUTE_CHANGE, () => {
      currentHash = window.location.hash || ''
    })
    return () => {
      window.removeEventListener('hashchange', onHash)
      unsubRoute()
    }
  })
</script>

{#if visible}
  <button
    type="button"
    class="qa-tag-pill"
    class:qa-tag-pill--on={active}
    onclick={toggle}
    aria-pressed={active}
    aria-label={active ? 'Exit tag mode' : 'Start tag mode on current verse'}
  >
    <span class="qa-tag-dot" class:qa-tag-dot--on={active} aria-hidden="true"></span>
    Tag mode
  </button>
{/if}

<style>
  .qa-tag-pill {
    position: fixed;
    top: 18px;
    right: 20px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px 7px 12px;
    border-radius: 999px;
    border: 1px solid var(--qa-ambient-border);
    background: var(--qa-ambient-surface);
    color: var(--qa-ambient-parchment);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
    z-index: 140;
  }
  .qa-tag-pill:hover { border-color: var(--qa-ambient-accent); }
  .qa-tag-pill--on { border-color: var(--qa-ambient-accent); }

  .qa-tag-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: transparent;
    border: 1.5px solid var(--qa-ambient-accent);
  }
  .qa-tag-dot--on {
    background: #15803d;
    border-color: #15803d;
    box-shadow: 0 0 0 2px color-mix(in srgb, #15803d 28%, transparent);
  }
  :global(html[data-theme="dark"]) .qa-tag-dot--on {
    background: #86efac;
    border-color: #86efac;
    box-shadow: 0 0 0 2px color-mix(in srgb, #86efac 30%, transparent);
  }

  @media (max-width: 1179px) {
    .qa-tag-pill { display: none; }
  }
</style>
