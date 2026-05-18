<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { getTranslations, getTafsirs } from '../../data/dataset'
  import {
    installMushafAsset,
    installTextAsset,
    removeMushafAsset,
    removeSourceAssetDownload,
    removeTextAsset,
    getSourceAssetStatus,
    startSourceAssetDownload,
  } from '../../data/offline'
  import { loadMushafAssetIndex, getMushafAssetStatus } from '../../packs/mushaf-assets'
  import { loadTextAssetIndex, getTextAssetStatus } from '../../packs/text-assets'
  import type { Riwayah } from '../../packs/riwayah'
  import { setMushafEditionId } from '../mushaf-edition'
  import { setQuranTextStyleId } from '../quran-text-style'
  import { setTranslationId } from '../panel-bridge'
  import { settings } from '../state.svelte'
  import { setTafsirId } from '../tafsir'
  import { assetRowView, type AssetRowGroup, type AssetRowView } from './asset-view-model'

  interface Props {
    historyCanGoBack?: boolean | null
  }

  type RowKind = 'text' | 'mushaf' | 'translation' | 'tafsir'
  type RouteRow = AssetRowView & {
    kind: RowKind
    meta: string
    sizeText: string
    riwayah?: Riwayah
  }

  type Section = {
    id: AssetRowGroup
    title: string
    rows: RouteRow[]
  }

  const { historyCanGoBack = null }: Props = $props()

  let heading: HTMLHeadingElement | null = $state(null)
  let sections = $state<Section[]>([])
  let loading = $state(true)
  let statusMessage = $state('Checking local asset state.')
  const canGoBack = $derived.by(() => {
    if (typeof historyCanGoBack === 'boolean') return historyCanGoBack
    if (typeof sessionStorage === 'undefined') return false
    return sessionStorage.getItem('qa-assets-can-go-back') === '1'
  })

  function fmtBytes(bytes: number | undefined): string {
    if (!bytes || bytes <= 0) return 'Size pending'
    const mb = bytes / (1024 * 1024)
    return mb < 1 ? `${Math.round(bytes / 1024)} KB` : `${mb.toFixed(1)} MB`
  }

  function statusLabel(status: RouteRow['status']): string {
    return status.replace('-', ' ')
  }

  function rowActionLabel(row: RouteRow): string {
    return row.primaryAction ? `${row.primaryAction} ${row.label}` : row.label
  }

  async function buildRows(): Promise<Section[]> {
    const [textIndex, mushafIndex, translations, tafsirs] = await Promise.all([
      loadTextAssetIndex(),
      loadMushafAssetIndex(),
      getTranslations() as Promise<Array<{ id: string; name: string; subtitle?: string; availableInManifest?: boolean }>>,
      getTafsirs() as Promise<Array<{ id: string; name: string; availableInManifest?: boolean }>>,
    ])

    const textRows = await Promise.all(textIndex.assets.map(async (asset): Promise<RouteRow> => ({
      ...assetRowView({
        id: asset.textStyleId,
        group: 'quran-text',
        label: asset.label,
        status: await getTextAssetStatus(asset.riwayah, asset.textStyleId),
        active: settings.riwayah === asset.riwayah && settings.quranTextStyleId === asset.textStyleId,
        compatible: settings.riwayah === asset.riwayah,
        shipped: asset.shipped,
        requiredRiwayah: asset.riwayah,
      }),
      kind: 'text',
      meta: `${asset.riwayah} · ${asset.scriptFamily}`,
      sizeText: fmtBytes(asset.totalBytes),
      riwayah: asset.riwayah,
    })))

    const mushafRows = await Promise.all(mushafIndex.assets.map(async (asset): Promise<RouteRow> => ({
      ...assetRowView({
        id: asset.mushafEditionId,
        group: 'mushaf',
        label: asset.label,
        status: await getMushafAssetStatus(asset.riwayah, asset.mushafEditionId),
        active: settings.riwayah === asset.riwayah && settings.mushafEditionId === asset.mushafEditionId,
        compatible: settings.riwayah === asset.riwayah,
        shipped: asset.shipped,
        requiredRiwayah: asset.riwayah,
      }),
      kind: 'mushaf',
      meta: `${asset.riwayah} · ${asset.tradition}`,
      sizeText: fmtBytes(asset.totalBytes),
      riwayah: asset.riwayah,
    })))

    const translationRows = await Promise.all(translations.map(async (translation): Promise<RouteRow> => ({
      ...assetRowView({
        id: translation.id,
        group: 'translation',
        label: translation.name,
        status: translation.availableInManifest ? 'shipped' : await getSourceAssetStatus('translation', translation.id),
        active: settings.translationId === translation.id,
        compatible: true,
        shipped: translation.availableInManifest === true,
      }),
      kind: 'translation',
      meta: translation.subtitle ?? 'English translation',
      sizeText: translation.availableInManifest ? 'Included' : 'Optional pack',
    })))

    const tafsirRows = await Promise.all(tafsirs.map(async (tafsir): Promise<RouteRow> => ({
      ...assetRowView({
        id: tafsir.id,
        group: 'tafsir',
        label: tafsir.name,
        status: tafsir.availableInManifest ? 'shipped' : await getSourceAssetStatus('tafsir', tafsir.id),
        active: settings.tafsirId === tafsir.id,
        compatible: true,
        shipped: tafsir.availableInManifest === true,
      }),
      kind: 'tafsir',
      meta: 'Tafsir source',
      sizeText: tafsir.availableInManifest ? 'Included' : 'Optional pack',
    })))

    return [
      { id: 'quran-text', title: 'Quran Text Styles', rows: textRows },
      { id: 'mushaf', title: 'Mushaf Editions', rows: mushafRows },
      { id: 'translation', title: 'Translations', rows: translationRows },
      { id: 'tafsir', title: 'Tafsir', rows: tafsirRows },
    ]
  }

  async function refreshRows(message = 'Asset state refreshed.'): Promise<void> {
    loading = true
    try {
      sections = await buildRows()
      statusMessage = message
    } catch {
      statusMessage = 'Some asset state could not be checked. Retry from this page.'
    } finally {
      loading = false
    }
  }

  async function runPrimary(row: RouteRow): Promise<void> {
    if (!row.primaryAction || row.primaryAction === 'Active' || row.primaryAction === 'Installing...') return
    statusMessage = `${row.primaryAction} started for ${row.label}.`
    let ok = true
    if (row.primaryAction === 'Install' || row.primaryAction === 'Retry' || row.primaryAction === 'Reinstall') {
      if (row.kind === 'text' && row.riwayah) ok = await installTextAsset(row.riwayah, row.id)
      if (row.kind === 'mushaf' && row.riwayah) ok = await installMushafAsset(row.riwayah, row.id)
      if (row.kind === 'translation') ok = await startSourceAssetDownload('translation', row.id)
      if (row.kind === 'tafsir') ok = await startSourceAssetDownload('tafsir', row.id)
    } else if (row.primaryAction === 'Set Active') {
      if (row.kind === 'text') ok = await setQuranTextStyleId(row.id)
      if (row.kind === 'mushaf') ok = await setMushafEditionId(row.id)
      if (row.kind === 'translation') await setTranslationId(row.id)
      if (row.kind === 'tafsir') await setTafsirId(row.id)
    }
    await refreshRows(ok ? `${row.label} updated.` : `${row.label} could not be updated.`)
  }

  async function deleteRow(row: RouteRow): Promise<void> {
    if (!row.secondaryAction || row.deleteDisabledReason) return
    try {
      if (row.kind === 'text' && row.riwayah) await removeTextAsset(row.riwayah, row.id)
      if (row.kind === 'mushaf' && row.riwayah) await removeMushafAsset(row.riwayah, row.id)
      if (row.kind === 'translation') await removeSourceAssetDownload('translation', row.id)
      if (row.kind === 'tafsir') await removeSourceAssetDownload('tafsir', row.id)
      await refreshRows(`${row.label} removed from local storage.`)
    } catch (error) {
      statusMessage = error instanceof Error ? error.message : 'Asset could not be removed.'
    }
  }

  function goBack(): void {
    history.back()
  }

  onMount(() => {
    try { sessionStorage.removeItem('qa-assets-can-go-back') } catch { /* ignore */ }
    void refreshRows('Asset state ready.')
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
    <div>
      <h1 id="qa-assets-title" class="qa-assets-title" bind:this={heading} tabindex="-1">Asset Management</h1>
      <p class="qa-assets-subtitle">Install, verify, activate, and remove reader assets.</p>
    </div>
    <button type="button" class="qa-assets-refresh" onclick={() => { void refreshRows() }}>Verify</button>
  </header>

  <section class="qa-assets-summary" aria-label="Active asset summary">
    <div class="qa-assets-summary-item"><span class="qa-assets-summary-label">Riwayah</span><strong class="qa-assets-summary-value">{settings.riwayah}</strong></div>
    <div class="qa-assets-summary-item"><span class="qa-assets-summary-label">Text</span><strong class="qa-assets-summary-value">{settings.quranTextStyleId}</strong></div>
    <div class="qa-assets-summary-item"><span class="qa-assets-summary-label">Mushaf</span><strong class="qa-assets-summary-value">{settings.mushafEditionId}</strong></div>
  </section>

  <p class="qa-assets-status" role="status" aria-live="polite">{statusMessage}</p>

  <div class="qa-assets-layout">
    <nav class="qa-assets-nav" aria-label="Asset sections">
      {#each sections as section (section.id)}
        <a class="qa-assets-nav-link" href={`#asset-${section.id}`}>{section.title}</a>
      {/each}
    </nav>

    <div class="qa-assets-sections">
      {#if loading && sections.length === 0}
        <p class="qa-assets-empty">Checking assets...</p>
      {/if}

      {#each sections as section (section.id)}
        <section class="qa-assets-section" id={`asset-${section.id}`} aria-labelledby={`asset-title-${section.id}`}>
          <h2 id={`asset-title-${section.id}`} class="qa-assets-section-title">{section.title}</h2>
          <div class="qa-assets-table" role="table" aria-label={section.title}>
            {#each section.rows as row (`${row.group}:${row.riwayah ?? row.kind}:${row.id}`)}
              <div class="qa-asset-row" role="row">
                <div class="qa-asset-main">
                  <h3 class="qa-asset-title">{row.label}</h3>
                  <p class="qa-asset-meta">{row.meta}</p>
                  {#if row.disabledReason}
                    <p class="qa-asset-reason">{row.disabledReason}</p>
                  {/if}
                  {#if row.deleteDisabledReason}
                    <p class="qa-asset-reason">{row.deleteDisabledReason}</p>
                  {/if}
                </div>
                <span class="qa-asset-size">{row.sizeText}</span>
                <span class="qa-asset-status-chip" data-status={row.status}>{statusLabel(row.status)}</span>
                <div class="qa-asset-actions">
                  {#if row.primaryAction}
                    <button
                      type="button"
                      class="qa-asset-primary"
                      disabled={row.primaryAction === 'Active' || row.primaryAction === 'Installing...' || !row.compatible}
                      aria-label={rowActionLabel(row)}
                      onclick={() => { void runPrimary(row) }}
                    >
                      {row.primaryAction}
                    </button>
                  {/if}
                  {#if row.secondaryAction}
                    <button
                      type="button"
                      class="qa-asset-secondary"
                      disabled={Boolean(row.deleteDisabledReason)}
                      title={row.deleteDisabledReason ?? undefined}
                      onclick={() => { void deleteRow(row) }}
                    >
                      {row.secondaryAction}
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  </div>
</main>
