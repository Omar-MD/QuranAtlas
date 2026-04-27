<script lang="ts">
  /**
   * PullToSwapIndicator — minimal Chrome-mobile-PTR-style circular progress
   * indicator for cross-surah swap. A small ring with a chevron in the
   * middle anchored to the top (backward) or bottom (forward) edge.
   *
   * Driven by the `setupPullToSwap` tracker in `surah-swap.ts`. Renders
   * only during an active pull; the swap commit is dispatched by the
   * tracker, not this component.
   */

  type PullDirection = 'forward' | 'backward'

  interface Props {
    direction: PullDirection | null
    progress: number
  }

  const { direction, progress }: Props = $props()

  const SIZE = 32
  const STROKE = 2
  const RADIUS = SIZE / 2 - STROKE
  const CIRC = 2 * Math.PI * RADIUS

  const visible = $derived(direction !== null && progress > 0.04)
  const filled = $derived(progress >= 1)
  const dashOffset = $derived(CIRC * (1 - Math.min(1, progress)))
  const chevron = $derived(direction === 'forward' ? '↓' : '↑')
  const positionClass = $derived(direction === 'backward' ? 'qa-pull-top' : 'qa-pull-bottom')
</script>

<div
  class="qa-pull-indicator {positionClass}"
  class:qa-pull-visible={visible}
  class:qa-pull-filled={filled}
  aria-hidden="true"
>
  <svg class="qa-pull-svg" width={SIZE} height={SIZE} viewBox="0 0 {SIZE} {SIZE}">
    <circle
      class="qa-pull-track"
      cx={SIZE / 2}
      cy={SIZE / 2}
      r={RADIUS}
      fill="none"
      stroke-width={STROKE}
    />
    <circle
      class="qa-pull-arc"
      cx={SIZE / 2}
      cy={SIZE / 2}
      r={RADIUS}
      fill="none"
      stroke-width={STROKE}
      stroke-dasharray={CIRC}
      stroke-dashoffset={dashOffset}
      stroke-linecap="round"
      transform="rotate(-90 {SIZE / 2} {SIZE / 2})"
    />
  </svg>
  <span class="qa-pull-chevron">{chevron}</span>
</div>
