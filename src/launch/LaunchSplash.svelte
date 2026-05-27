<script lang="ts">
  interface Props {
    visible: boolean
  }

  const { visible }: Props = $props()
</script>

{#if visible}
  <section class="qa-launch-splash" data-testid="launch-splash" role="status" aria-label="Opening QuranAtlas" aria-live="polite">
    <div class="qa-launch-splash-mark" aria-hidden="true">QuranAtlas</div>
    <p class="qa-launch-splash-title">QuranAtlas</p>
    <p class="qa-launch-splash-subtitle">Opening the reader</p>
  </section>
{/if}
