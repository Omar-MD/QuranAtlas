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

