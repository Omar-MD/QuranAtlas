<script lang="ts">
  /**
   * NavDrawer — left-slide sheet from the MarginHeader hamburger button
   * (and, post-2026-04-25, from the desktop AmbientDock kebab too).
   * Replaces MoreSheet. Two items: Review · About. No count badges.
   */
  import { onMount } from 'svelte'
  import { registerNavDrawer } from './nav-drawer-bridge'

  let isOpen = $state(false)

  function open(): void { isOpen = true }
  function close(): void { isOpen = false }
  function toggle(): void { isOpen = !isOpen }

  function go(href: string): void {
    close()
    window.location.hash = href
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') { close() }
  }

  let touchStartX = 0
  let touchStartY = 0
  function onTouchStart(e: TouchEvent): void {
    const t = e.touches[0]
    if (!t) { return }
    touchStartX = t.clientX
    touchStartY = t.clientY
  }
  function onTouchEnd(e: TouchEvent): void {
    const t = e.changedTouches[0]
    if (!t) { return }
    const dx = t.clientX - touchStartX
    const dy = Math.abs(t.clientY - touchStartY)
    if (dx < -48 && dy < 24) { close() }
  }

  onMount(() => {
    registerNavDrawer(open, close, toggle)
  })
</script>

{#if isOpen}
  <button
    type="button"
    class="qa-nav-drawer-backdrop"
    aria-label="Close navigation"
    onclick={close}
  ></button>
  <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
  <aside
    class="qa-nav-drawer"
    role="dialog"
    aria-modal="true"
    aria-label="Navigation"
    tabindex="-1"
    ontouchstart={onTouchStart}
    ontouchend={onTouchEnd}
    onkeydown={handleKeydown}
  >
    <div class="qa-nav-drawer-hdr">
      <span class="qa-nav-drawer-wordmark">QuranAtlas</span>
      <button
        type="button"
        class="qa-nav-drawer-close"
        aria-label="Close"
        onclick={close}
      >&#x2715;</button>
    </div>
    <nav class="qa-nav-drawer-list" aria-label="Sections">
      <button type="button" class="qa-nav-drawer-item" onclick={() => go('#/review')}>Review</button>
      <button type="button" class="qa-nav-drawer-item" onclick={() => go('#/about')}>About</button>
    </nav>
  </aside>
{/if}
