<script lang="ts">
  /**
   * OnboardingScreen — single-screen shell.
   * Renders the progress dots row, optional Skip button,
   * and a named slot for per-screen content.
   */

  type Props = {
    screen: number
    total: number
    onSkip?: () => void
    children?: import('svelte').Snippet
  }

  const { screen, total, onSkip, children }: Props = $props()
</script>

<div class="qa-onb-page">
  {#if screen >= 2 && onSkip}
    <button type="button" class="qa-onb-skip" onclick={onSkip}>Skip</button>
  {/if}

  {@render children?.()}

  <div class="qa-onb-dots" aria-hidden="true">
    {#each Array.from({ length: total }, (_, i) => i + 1) as dotN (dotN)}
      <span class="qa-onb-dot" class:qa-onb-dot--on={dotN === screen}></span>
    {/each}
  </div>
</div>
