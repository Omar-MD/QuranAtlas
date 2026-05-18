<script lang="ts">
  import NestedAssetPicker from './NestedAssetPicker.svelte'
  import { getTafsirs, getTranslations } from '../../data/dataset'
  import { loadTextAssetIndex } from '../../packs/text-assets'
  import { getRiwayahLabels, getRiwayahOptions, isRiwayahUsable, type Riwayah } from '../../packs/riwayah'
  import { setFontSize, getFontSizeOptions } from '../font-size'
  import {
    getReadingFlowStep,
    getReadingOptions,
    setReadingFlow,
    type ReadingStep,
  } from '../reading-typography'
  import { setRiwayah } from '../riwayah'
  import { setQuranTextStyleId } from '../quran-text-style'
  import { settings } from '../state.svelte'
  import { setTranslationId, setTranslationVisible } from '../panel-bridge'
  import { setTafsirId } from '../tafsir'

  type PickerKind = 'riwayah' | 'text' | 'translation' | 'tafsir' | null
  type PickerRow = {
    id: string
    label: string
    meta?: string
    active?: boolean
    disabled?: boolean
  }

  const fontOptions = getFontSizeOptions()
  const readingOptions = getReadingOptions()

  let picker = $state<PickerKind>(null)
  let pickerRows = $state<PickerRow[]>([])

  const readingFlowStep = $derived<ReadingStep>(
    getReadingFlowStep({
      lineSpacing: settings.lineSpacing,
      wordSpacing: settings.wordSpacing,
      readerMargin: settings.readerMargin,
      verseSpacing: settings.verseSpacing,
    }) ?? 'md',
  )

  function optionIndex(options: readonly string[], value: string): number {
    const index = options.indexOf(value)
    return index >= 0 ? index : 2
  }

  async function handleFontSize(event: Event): Promise<void> {
    const index = Number((event.currentTarget as HTMLInputElement).value)
    const next = fontOptions[index] ?? 'md'
    await setFontSize(next)
  }

  async function handleReadingFlow(event: Event): Promise<void> {
    const index = Number((event.currentTarget as HTMLInputElement).value)
    const next = readingOptions[index] ?? 'md'
    await setReadingFlow(next)
  }

  async function riwayahRows(): Promise<PickerRow[]> {
    return Promise.all(getRiwayahOptions().map(async (riwayah) => {
      const labels = getRiwayahLabels(riwayah)
      const usable = await isRiwayahUsable(riwayah)
      return {
        id: riwayah,
        label: labels.productShort,
        meta: usable ? labels.subtitle : `${labels.subtitle} · Unavailable`,
        active: settings.riwayah === riwayah,
        disabled: !usable,
      }
    }))
  }

  async function textRows(): Promise<PickerRow[]> {
    const index = await loadTextAssetIndex()
    return index.assets
      .filter((asset) => asset.riwayah === settings.riwayah)
      .map((asset) => ({
        id: asset.textStyleId,
        label: asset.label,
        meta: asset.scriptFamily,
        active: settings.quranTextStyleId === asset.textStyleId,
      }))
  }

  async function translationRows(): Promise<PickerRow[]> {
    const translations = await getTranslations() as Array<{ id: string; name: string; subtitle?: string }>
    return translations.map((translation) => ({
      id: translation.id,
      label: translation.name,
      meta: translation.subtitle,
      active: settings.translationId === translation.id,
    }))
  }

  async function tafsirRows(): Promise<PickerRow[]> {
    const tafsirs = await getTafsirs() as Array<{ id: string; name: string }>
    return tafsirs.map((tafsir) => ({
      id: tafsir.id,
      label: tafsir.name,
      active: settings.tafsirId === tafsir.id,
    }))
  }

  async function openPicker(kind: Exclude<PickerKind, null>): Promise<void> {
    picker = kind
    try {
      pickerRows = kind === 'riwayah' ? await riwayahRows()
        : kind === 'text' ? await textRows()
        : kind === 'translation' ? await translationRows()
        : await tafsirRows()
    } catch {
      pickerRows = []
    }
  }

  async function chooseAsset(id: string): Promise<void> {
    if (picker === 'riwayah') await setRiwayah(id as Riwayah)
    if (picker === 'text') await setQuranTextStyleId(id)
    if (picker === 'translation') await setTranslationId(id)
    if (picker === 'tafsir') await setTafsirId(id)
    picker = null
  }

  const pickerTitle = $derived(
    picker === 'riwayah' ? 'Choose Active Riwayah'
      : picker === 'text' ? 'Choose Quran Text Style'
      : picker === 'translation' ? 'Choose Translation Source'
      : 'Choose Tafsir Source',
  )
</script>

<div class="qa-settings-preview qa-settings-preview--verse" data-testid="settings-preview">
  <p class="qa-settings-preview-eye">Verse preview</p>
  <div class="qa-settings-preview-stage">
    <p class="qa-settings-preview-ar qa-verse-arabic" dir="rtl" data-riwayah={settings.riwayah}>اِ۬لرَّحْمَٰنُ عَلَّمَ اَ۬لْقُرْءَانَ</p>
    <p class="qa-settings-preview-tr qa-verse-translation" class:qa-settings-preview-tr--hidden={!settings.translationVisible}>He taught the Qur'an.</p>
  </div>
</div>

<div class="qa-settings-section">
  <h3 class="qa-settings-section-title">Reading</h3>
  <label class="qa-settings-row">
    <span>Font Size</span>
    <input
      aria-label="Font Size"
      type="range"
      min="0"
      max="4"
      value={optionIndex(fontOptions, settings.fontSize)}
      oninput={(event) => { void handleFontSize(event) }}
    />
  </label>
  <label class="qa-settings-row">
    <span>Reading Flow</span>
    <input
      aria-label="Reading Flow"
      type="range"
      min="0"
      max="4"
      value={optionIndex(readingOptions, readingFlowStep)}
      oninput={(event) => { void handleReadingFlow(event) }}
    />
  </label>
</div>

<div class="qa-settings-section">
  <h3 class="qa-settings-section-title">Sources</h3>
  <button type="button" class="qa-settings-row" data-testid="src-row-recitation" onclick={() => { void openPicker('riwayah') }}><span>Active Riwayah</span><strong class="qa-settings-row-value">{settings.riwayah}</strong></button>
  <button type="button" class="qa-settings-row" onclick={() => { void openPicker('text') }}><span>Quran Text Style</span><strong class="qa-settings-row-value">{settings.quranTextStyleId}</strong></button>
  <button type="button" class="qa-settings-row" data-testid="src-row-translation" onclick={() => { void openPicker('translation') }}><span>Translation Source</span><strong class="qa-settings-row-value">{settings.translationId}</strong></button>
  <button
    type="button"
    class="qa-settings-row"
    role="switch"
    aria-label="Show translation"
    aria-checked={settings.translationVisible}
    onclick={() => { void setTranslationVisible(!settings.translationVisible) }}
  >
    <span>Show Translation</span><strong class="qa-settings-row-value">{settings.translationVisible ? 'On' : 'Off'}</strong>
  </button>
  <button type="button" class="qa-settings-row" data-testid="src-row-tafsir" onclick={() => { void openPicker('tafsir') }}><span>Tafsir Source</span><strong class="qa-settings-row-value">{settings.tafsirId}</strong></button>
</div>

{#if picker}
  <NestedAssetPicker
    title={pickerTitle}
    rows={pickerRows}
    close={() => { picker = null }}
    choose={(id) => { void chooseAsset(id) }}
  />
{/if}
