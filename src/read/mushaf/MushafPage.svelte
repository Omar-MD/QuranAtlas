<script lang="ts">
  import type { MushafResolvedPage } from './types'

  type PageState = 'loading' | 'ready' | 'asset-error' | 'offline-missing'
  type Props = {
    resolved: MushafResolvedPage | null
    loading?: boolean
    error?: string | null
    onRetry: () => void
    onOpenVerse: () => void
    onInstallPack?: () => void
    installPrompt?: { riwayah: string } | null
  }

  const {
    resolved,
    loading = false,
    error = null,
    onRetry,
    onOpenVerse,
    onInstallPack,
    installPrompt = null,
  }: Props = $props()
  let imageState = $state<PageState>('loading')

  $effect(() => {
    if (resolved?.assetUrl) {
      imageState = 'loading'
    }
  })

  const unavailableText = $derived.by(() => {
    if (installPrompt) return `${installPrompt.riwayah} pages are not installed yet.`
    if (error) return error
    if (imageState === 'offline-missing') return 'Page not available offline.'
    return 'This Mushaf page could not be loaded.'
  })
</script>

<section class="qa-mushaf-page-wrap" aria-live="polite">
  {#if loading}
    <div class="qa-mushaf-page-skeleton" aria-label="Loading Mushaf page"></div>
  {:else if installPrompt || error || imageState === 'asset-error' || imageState === 'offline-missing'}
    <div class="qa-mushaf-page-state" role="status">
      <p>{unavailableText}</p>
      <div class="qa-mushaf-page-state-actions">
        {#if installPrompt && onInstallPack}
          <button type="button" class="qa-mushaf-state-btn" onclick={onInstallPack}>Install text and pages</button>
        {/if}
        <button type="button" class="qa-mushaf-state-btn" onclick={onRetry}>Retry</button>
        <button type="button" class="qa-mushaf-state-btn" onclick={onOpenVerse}>Open Verse mode</button>
      </div>
    </div>
  {:else if resolved}
    <img
      class="qa-mushaf-page-img"
      src={resolved.assetUrl}
      alt={`Mushaf page ${resolved.page}, beginning near ${resolved.firstVerse.surah}:${resolved.firstVerse.verse}`}
      draggable="false"
      onload={() => { imageState = 'ready' }}
      onerror={() => { imageState = navigator.onLine ? 'asset-error' : 'offline-missing' }}
    />
  {/if}
</section>
