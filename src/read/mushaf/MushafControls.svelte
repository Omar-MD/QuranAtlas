<script lang="ts">
  import { onMount, tick } from 'svelte'
  import type { MushafViewMode } from '../../configure/state.svelte'
  import type { MushafPhysicalAction } from './navigation'

  type Props = {
    page: number
    pageCount: number
    placement?: 'bottom-center' | 'below-page' | 'inside-safe-bottom'
    viewMode?: MushafViewMode
    onAction: (action: MushafPhysicalAction) => void
    onNavigate: (page: number) => void
    onViewModeChange?: (mode: MushafViewMode) => void
    onJumpOpenChange?: (open: boolean) => void
  }

  const {
    page,
    pageCount,
    placement = 'bottom-center',
    viewMode = 'auto',
    onAction,
    onNavigate,
    onViewModeChange,
    onJumpOpenChange,
  }: Props = $props()

  let jumpOpen = $state(false)
  let draft = $state('')
  let chip = $state<HTMLButtonElement | null>(null)
  let input = $state<HTMLInputElement | null>(null)
  let root = $state<HTMLDivElement | null>(null)

  function clampPage(value: number): number {
    return Math.min(pageCount, Math.max(1, value))
  }

  function setJumpOpen(open: boolean): void {
    if (jumpOpen === open) return
    jumpOpen = open
    onJumpOpenChange?.(open)
  }

  async function openJump(): Promise<void> {
    draft = String(page)
    setJumpOpen(true)
    await tick()
    input?.focus()
    input?.select()
  }

  function closeJump({ restoreFocus = true } = {}): void {
    setJumpOpen(false)
    draft = String(page)
    if (restoreFocus) void tick().then(() => chip?.focus())
  }

  function commitJump(): void {
    const next = Number.parseInt(input?.value ?? draft, 10)
    if (Number.isInteger(next)) onNavigate(clampPage(next))
    closeJump({ restoreFocus: true })
  }

  function handleChipKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    void openJump()
  }

  function handleInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitJump()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closeJump({ restoreFocus: true })
    }
  }

  function handleEdge(action: MushafPhysicalAction): void {
    if (jumpOpen) return
    onAction(action)
  }

  function setViewMode(mode: MushafViewMode): void {
    if (mode === viewMode) return
    onViewModeChange?.(mode)
  }

  $effect(() => {
    if (!jumpOpen) draft = String(page)
  })

  onMount(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!jumpOpen || !root) return
      const target = event.target
      if (target instanceof Node && root.contains(target)) return
      closeJump({ restoreFocus: false })
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  })
</script>

<div
  bind:this={root}
  class="qa-mushaf-controls qa-mushaf-controls--{placement}"
  aria-label="Mushaf page controls"
>
  {#if !jumpOpen}
    <button
      type="button"
      class="qa-mushaf-edge qa-mushaf-edge--left"
      data-mushaf-edge="left"
      aria-label="Advance Mushaf page"
      disabled={page >= pageCount}
      onclick={() => handleEdge('towardEnd')}
    >
      <span aria-hidden="true">‹</span>
    </button>
    <button
      type="button"
      class="qa-mushaf-edge qa-mushaf-edge--right"
      data-mushaf-edge="right"
      aria-label="Return to previous Mushaf page"
      disabled={page <= 1}
      onclick={() => handleEdge('towardStart')}
    >
      <span aria-hidden="true">›</span>
    </button>
  {/if}

  <div class="qa-mushaf-chip-wrap">
    <div class="qa-mushaf-view-mode" role="group" aria-label="Mushaf view mode">
      <button
        type="button"
        class="qa-mushaf-view-mode-btn"
        class:qa-mushaf-view-mode-btn--active={viewMode === 'auto'}
        aria-pressed={viewMode === 'auto'}
        aria-label="Choose automatic Mushaf page fit"
        onclick={() => setViewMode('auto')}
      >Auto</button>
      <button
        type="button"
        class="qa-mushaf-view-mode-btn"
        class:qa-mushaf-view-mode-btn--active={viewMode === 'fit-page'}
        aria-pressed={viewMode === 'fit-page'}
        aria-label="Fit full Mushaf page"
        onclick={() => setViewMode('fit-page')}
      >Page</button>
      <button
        type="button"
        class="qa-mushaf-view-mode-btn"
        class:qa-mushaf-view-mode-btn--active={viewMode === 'fit-width'}
        aria-pressed={viewMode === 'fit-width'}
        aria-label="Fit Mushaf page to width"
        onclick={() => setViewMode('fit-width')}
      >Width</button>
    </div>
    <button
      bind:this={chip}
      type="button"
      class="qa-mushaf-page-chip"
      aria-label={`Jump from Mushaf page ${page} of ${pageCount}`}
      aria-expanded={jumpOpen}
      onclick={() => { void openJump() }}
      onkeydown={handleChipKeydown}
    >
      {page} / {pageCount}
    </button>
    {#if jumpOpen}
      <input
        bind:this={input}
        class="qa-mushaf-page-jump"
        type="number"
        inputmode="numeric"
        min="1"
        max={pageCount}
        aria-label="Mushaf page number"
        value={draft}
        oninput={(event) => { draft = (event.currentTarget as HTMLInputElement).value }}
        onkeydown={handleInputKeydown}
      />
    {/if}
  </div>
</div>
