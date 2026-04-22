<script lang="ts">
  /**
   * Dims reader + draws attention to focused verse. Fixed scrim w/ a "hole"
   * aligned to active verse element. getBoundingClientRect on mount + scroll
   * listener to re-align on scroll / resize.
   */
  import { onMount, onDestroy } from 'svelte'
  import { tagSession } from '../state/tag-session.svelte'

  let rect = $state<{ top: number; bottom: number; left: number; right: number } | null>(null)
  let raf = 0
  let ro: ResizeObserver | null = null
  let target: HTMLElement | null = null

  function measure(): void {
    if (!target) { rect = null; return }
    const r = target.getBoundingClientRect()
    rect = { top: r.top - 10, bottom: r.bottom + 10, left: r.left - 8, right: r.right + 8 }
  }

  function findVerse(): void {
    const k = tagSession.verseKey
    target = k ? (document.querySelector(`.qa-verse[data-verse-key="${k}"]`) as HTMLElement | null) : null
    if (ro) { ro.disconnect() }
    if (target && ro) { ro.observe(target) }
    measure()
  }

  $effect(() => {
    void tagSession.verseKey
    findVerse()
  })

  function onScroll(): void {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(measure)
  }

  onMount(() => {
    const main = document.getElementById('main-content')
    main?.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    ro = new ResizeObserver(measure)
    if (target) { ro.observe(target) }
    return () => {
      main?.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      ro?.disconnect()
      cancelAnimationFrame(raf)
    }
  })
  onDestroy(() => { ro?.disconnect() })
</script>

{#if rect}
  <div class="qa-spotlight" aria-hidden="true">
    <div
      class="qa-spotlight-hole"
      style:top="{rect.top}px"
      style:left="{rect.left}px"
      style:width="{rect.right - rect.left}px"
      style:height="{rect.bottom - rect.top}px"
    ></div>
  </div>
{/if}

<style>
  .qa-spotlight {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 90;
    background: color-mix(in srgb, var(--qa-bg-primary) 62%, transparent);
    animation: qa-spotlight-fade var(--qa-transition-base) forwards;
  }
  :global(html[data-theme="dark"]) .qa-spotlight {
    background: rgba(6, 8, 12, 0.56);
  }
  .qa-spotlight-hole {
    position: absolute;
    border-radius: var(--qa-radius-2xl);
    box-shadow:
      0 0 0 9999px color-mix(in srgb, var(--qa-bg-primary) 62%, transparent),
      inset 0 0 0 1.5px color-mix(in srgb, var(--qa-ambient-accent) 55%, transparent),
      0 0 32px color-mix(in srgb, var(--qa-ambient-accent) 22%, transparent);
    animation: qa-spotlight-pulse 1.6s ease-in-out infinite;
  }
  :global(html[data-theme="dark"]) .qa-spotlight-hole {
    box-shadow:
      0 0 0 9999px rgba(6, 8, 12, 0.56),
      inset 0 0 0 1.5px color-mix(in srgb, var(--qa-ambient-accent) 55%, transparent),
      0 0 32px color-mix(in srgb, var(--qa-ambient-accent) 22%, transparent);
  }
  @media (prefers-reduced-motion: reduce) {
    .qa-spotlight-hole { animation: none; }
  }
</style>
