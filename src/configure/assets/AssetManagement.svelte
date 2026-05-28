<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { DEFAULT_READER_ASSET_PROFILE } from '../../../shared/reader-assets/default-profile'
  import { defaultAssetInventoryRows, type AssetRowGroup, type AssetRowView } from './asset-view-model'

  interface Props {
    historyCanGoBack?: boolean | null
  }

  type Section = {
    id: AssetRowGroup
    title: string
    rows: AssetRowView[]
  }

  const { historyCanGoBack = null }: Props = $props()
  const rows = defaultAssetInventoryRows()
  const sections: Section[] = [
    { id: 'quran-text', title: 'Quran Text', rows: rows.filter((row) => row.group === 'quran-text') },
    { id: 'mushaf', title: 'Mushaf', rows: rows.filter((row) => row.group === 'mushaf') },
    { id: 'translation', title: 'Translation', rows: rows.filter((row) => row.group === 'translation') },
  ]

  let heading: HTMLHeadingElement | null = $state(null)
  const canGoBack = $derived.by(() => {
    if (typeof historyCanGoBack === 'boolean') return historyCanGoBack
    if (typeof sessionStorage === 'undefined') return false
    return sessionStorage.getItem('qa-assets-can-go-back') === '1'
  })

  function goBack(): void {
    history.back()
  }

  function statusLabel(status: AssetRowView['status']): string {
    return status.replace('-', ' ')
  }

  onMount(() => {
    try { sessionStorage.removeItem('qa-assets-can-go-back') } catch { /* ignore */ }
    void tick().then(() => heading?.focus({ preventScroll: true }))
  })
</script>

<svelte:head>
  <title>Asset Management · QuranAtlas</title>
</svelte:head>

<main class="qa-assets-page" aria-labelledby="qa-assets-title">
  <header class="qa-assets-header">
    {#if canGoBack}
      <button type="button" class="qa-assets-back" data-testid="assets-back" onclick={goBack}>Back</button>
    {:else}
      <a class="qa-assets-back" data-testid="assets-back" href="#/s/1">Back to Reader</a>
    {/if}
    <div class="qa-assets-heading-block">
      <h1 id="qa-assets-title" class="qa-assets-title" bind:this={heading} tabindex="-1">Asset Management</h1>
      <p class="qa-assets-subtitle">Default reader assets included with this build.</p>
    </div>
  </header>

  <section class="qa-assets-summary" aria-label="Default asset summary">
    <div class="qa-assets-summary-item"><span class="qa-assets-summary-label">Riwayah</span><strong class="qa-assets-summary-value">{DEFAULT_READER_ASSET_PROFILE.riwayah}</strong></div>
    <div class="qa-assets-summary-item"><span class="qa-assets-summary-label">Text</span><strong class="qa-assets-summary-value">{DEFAULT_READER_ASSET_PROFILE.quranTextStyleId}</strong></div>
    <div class="qa-assets-summary-item"><span class="qa-assets-summary-label">Mushaf</span><strong class="qa-assets-summary-value">{DEFAULT_READER_ASSET_PROFILE.mushafEditionId}</strong></div>
  </section>

  <p class="qa-assets-status" role="status" aria-live="polite">Default assets ready.</p>

  <div class="qa-assets-layout">
    <div class="qa-assets-sections">
      {#each sections as section (section.id)}
        <section class="qa-assets-section" id={`asset-${section.id}`} aria-labelledby={`asset-title-${section.id}`}>
          <h2 id={`asset-title-${section.id}`} class="qa-assets-section-title">{section.title}</h2>
          <div class="qa-assets-table" role="table" aria-label={section.title}>
            {#each section.rows as row (row.id)}
              <div class="qa-asset-row" role="row">
                <div class="qa-asset-main">
                  <h3 class="qa-asset-title">{row.label}</h3>
                  <p class="qa-asset-meta">{row.meta}</p>
                </div>
                <span class="qa-asset-size">{row.sizeText}</span>
                <span class="qa-asset-status-chip" data-status={row.status}>{statusLabel(row.status)}</span>
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  </div>
</main>
