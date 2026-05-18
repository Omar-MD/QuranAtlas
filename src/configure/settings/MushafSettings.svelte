<script lang="ts">
  import NestedAssetPicker from './NestedAssetPicker.svelte'
  import { loadMushafAssetIndex } from '../../packs/mushaf-assets'
  import { getRiwayahLabels, getRiwayahOptions, type Riwayah } from '../../packs/riwayah'
  import { setMushafEditionId } from '../mushaf-edition'
  import { setRiwayah } from '../riwayah'
  import { settings } from '../state.svelte'

  type PickerKind = 'riwayah' | 'mushaf' | null
  type PickerRow = {
    id: string
    label: string
    meta?: string
    active?: boolean
    disabled?: boolean
  }

  let picker = $state<PickerKind>(null)
  let pickerRows = $state<PickerRow[]>([])

  function riwayahRows(): PickerRow[] {
    return getRiwayahOptions().map((riwayah) => {
      const labels = getRiwayahLabels(riwayah)
      return {
        id: riwayah,
        label: labels.productShort,
        meta: labels.subtitle,
        active: settings.riwayah === riwayah,
      }
    })
  }

  async function mushafRows(): Promise<PickerRow[]> {
    const index = await loadMushafAssetIndex()
    return index.assets
      .filter((asset) => asset.riwayah === settings.riwayah)
      .map((asset) => ({
        id: asset.mushafEditionId,
        label: asset.label,
        meta: asset.tradition,
        active: settings.mushafEditionId === asset.mushafEditionId,
      }))
  }

  async function openPicker(kind: Exclude<PickerKind, null>): Promise<void> {
    picker = kind
    try {
      pickerRows = kind === 'riwayah' ? riwayahRows() : await mushafRows()
    } catch {
      pickerRows = []
    }
  }

  async function chooseAsset(id: string): Promise<void> {
    if (picker === 'riwayah') await setRiwayah(id as Riwayah)
    if (picker === 'mushaf') await setMushafEditionId(id)
    picker = null
  }

  const pickerTitle = $derived(picker === 'riwayah' ? 'Choose Active Riwayah' : 'Choose Mushaf Edition')
</script>

<div class="qa-settings-preview qa-settings-preview--mushaf" data-testid="settings-preview">
  <p class="qa-settings-preview-eye">Mushaf preview</p>
  <div class="qa-settings-mushaf-page" aria-hidden="true">
    <span class="qa-settings-mushaf-line"></span><span class="qa-settings-mushaf-line"></span><span class="qa-settings-mushaf-line"></span><span class="qa-settings-mushaf-line"></span>
    <span class="qa-settings-mushaf-line"></span><span class="qa-settings-mushaf-line"></span><span class="qa-settings-mushaf-line"></span><span class="qa-settings-mushaf-line"></span>
  </div>
</div>

<div class="qa-settings-section">
  <h3 class="qa-settings-section-title">Mushaf</h3>
  <button type="button" class="qa-settings-row" onclick={() => { void openPicker('riwayah') }}><span>Active Riwayah</span><strong class="qa-settings-row-value">{settings.riwayah}</strong></button>
  <button type="button" class="qa-settings-row" onclick={() => { void openPicker('mushaf') }}><span>Mushaf Edition</span><strong class="qa-settings-row-value">{settings.mushafEditionId}</strong></button>
</div>

{#if picker}
  <NestedAssetPicker
    title={pickerTitle}
    rows={pickerRows}
    close={() => { picker = null }}
    choose={(id) => { void chooseAsset(id) }}
  />
{/if}
