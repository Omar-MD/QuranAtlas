<script lang="ts">
  /**
   * PullToSwapIndicator — Chrome-mobile pull-to-refresh-style circular
   * progress indicator for cross-surah swap. Renders a fixed overlay at
   * the top (backward swap) or bottom (forward swap) edge of the viewport.
   *
   * Driven by the `setupPullToSwap` tracker in `surah-swap.ts`. When
   * `progress` reaches 1.0 the consumer commits the swap; this component
   * itself only renders the affordance.
   */

  type PullDirection = 'forward' | 'backward'

  interface Props {
    /** Direction of the active pull, or null if no pull is in progress. */
    direction: PullDirection | null
    /** 0..1 — fraction of the pull threshold accumulated. */
    progress: number
    /** Optional surah label (e.g. next/prev surah name) shown beside the arc. */
    label?: string
  }

  const { direction, progress, label = '' }: Props = $props()

  // SVG geometry for the progress ring
  const SIZE = 56
  const STROKE = 3
  const RADIUS = SIZE / 2 - STROKE
  const CIRC = 2 * Math.PI * RADIUS

  const visible = $derived(direction !== null && progress > 0.02)
  const filled = $derived(progress >= 1)
  const dashOffset = $derived(CIRC * (1 - Math.min(1, progress)))
  const chevron = $derived(direction === 'forward' ? '↓' : '↑')

  // Position class: backward shows at top, forward at bottom
  const positionClass = $derived(direction === 'backward' ? 'qa-pull-top' : 'qa-pull-bottom')
</script>

<div
  class="qa-pull-indicator {positionClass}"
  class:qa-pull-visible={visible}
  class:qa-pull-filled={filled}
  aria-hidden="true"
>
  <div class="qa-pull-ring">
    <svg width={SIZE} height={SIZE} viewBox="0 0 {SIZE} {SIZE}">
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
  {#if label}
    <span class="qa-pull-label">{label}</span>
  {/if}
</div>
