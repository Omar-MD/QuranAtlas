<script lang="ts">
  import type { InlineMushafSvg, MushafResolvedPage } from './types'

  type Props = {
    resolved: MushafResolvedPage | null
    inlineSvg?: InlineMushafSvg | null
    loading?: boolean
    svgLoading?: boolean
    error?: string | null
    onRetry: () => void
    onOpenVerse: () => void
    onInstallPack?: () => void
    onOpenSettings?: () => void
    onStayCurrentUsable?: () => void
    verseModeAvailable?: boolean
    installPrompt?: { riwayah: string } | null
  }

  const {
    resolved,
    inlineSvg = null,
    loading = false,
    svgLoading = false,
    error = null,
    onRetry,
    onOpenVerse,
    onInstallPack,
    onOpenSettings,
    onStayCurrentUsable,
    verseModeAvailable = true,
    installPrompt = null,
  }: Props = $props()

  const unavailableText = $derived.by(() => {
    if (installPrompt) return `${installPrompt.riwayah} pages are not installed yet.`
    if (error) return error
    return 'This Mushaf page could not be loaded.'
  })

  const displayViewBox = $derived(inlineSvg?.viewBox ?? resolved?.viewBox ?? null)
</script>

<section
  class="qa-mushaf-page-wrap"
  aria-live="polite"
  style={displayViewBox ? `--qa-mushaf-viewbox-ratio:${displayViewBox.width / displayViewBox.height}` : undefined}
>
  {#if loading}
    <div class="qa-mushaf-page-skeleton" aria-label="Loading Mushaf page"></div>
  {:else if installPrompt || error}
    <div class="qa-mushaf-page-state" role="status">
      <p>{unavailableText}</p>
      <div class="qa-mushaf-page-state-actions">
        {#if installPrompt && onInstallPack}
          <button type="button" class="qa-mushaf-state-btn" onclick={onInstallPack}>Install text and pages</button>
        {/if}
        {#if installPrompt && onStayCurrentUsable}
          <button type="button" class="qa-mushaf-state-btn" onclick={onStayCurrentUsable}>Stay on current usable riwayah</button>
        {/if}
        {#if installPrompt && onOpenSettings}
          <button type="button" class="qa-mushaf-state-btn" onclick={onOpenSettings}>Open Settings</button>
        {/if}
        <button type="button" class="qa-mushaf-state-btn" onclick={onRetry}>Retry</button>
        {#if verseModeAvailable}
          <button type="button" class="qa-mushaf-state-btn" onclick={onOpenVerse}>Open Verse mode</button>
        {/if}
      </div>
    </div>
  {:else if resolved && svgLoading}
    <div
      class="qa-mushaf-page-skeleton qa-mushaf-page-skeleton--svg"
      aria-label={`Loading Mushaf page ${resolved.page}`}
    ></div>
  {:else if resolved && inlineSvg}
    <div
      class="qa-mushaf-page-figure"
      role="img"
      aria-label={`Mushaf page ${resolved.page}, ${resolved.riwayahLabel}, beginning near ${resolved.firstVerse.surah}:${resolved.firstVerse.verse}`}
      data-page={resolved.page}
      style={`--qa-mushaf-viewbox-ratio:${inlineSvg.viewBox.width / inlineSvg.viewBox.height}`}
    >
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html inlineSvg.markup}
    </div>
  {:else if resolved}
    <div class="qa-mushaf-page-skeleton" aria-label={`Loading Mushaf page ${resolved.page}`}></div>
  {/if}
</section>
