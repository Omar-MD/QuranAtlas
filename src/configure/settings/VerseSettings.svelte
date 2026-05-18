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

  function humanizeId(value: string | null | undefined): string {
    if (!value) return 'Not set'
    return value
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (match) => match.toUpperCase())
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

  const fontSizeValue = $derived(humanizeId(settings.fontSize))
  const readingFlowValue = $derived(humanizeId(readingFlowStep))
  const activeRiwayahLabel = $derived(getRiwayahLabels(settings.riwayah).productShort)
  const quranTextStyleLabel = $derived(humanizeId(settings.quranTextStyleId))
  const translationLabel = $derived(humanizeId(settings.translationId))
  const tafsirLabel = $derived(humanizeId(settings.tafsirId))
</script>

<div class="qa-settings-preview qa-settings-preview--verse" data-testid="settings-preview">
  <p class="qa-settings-preview-eye">Verse preview</p>
  <section class="qa-settings-preview-stage" aria-label="Verse preview sample">
    <p class="qa-settings-preview-ar qa-verse-arabic" dir="rtl" data-riwayah={settings.riwayah}>اِ۬لرَّحْمَٰنُ عَلَّمَ اَ۬لْقُرْءَانَ</p>
    <p class="qa-settings-preview-tr qa-verse-translation" class:qa-settings-preview-tr--hidden={!settings.translationVisible}>He taught the Qur'an.</p>
  </section>
</div>

<div class="qa-settings-body">
  <section class="qa-settings-sect" aria-labelledby="qa-settings-reading">
    <div class="qa-settings-sect-hdr">
      <h3 id="qa-settings-reading" class="qa-settings-sect-name">Reading</h3>
    </div>

    <label class="qa-settings-slider">
      <span class="qa-settings-slider-row">
        <span class="qa-settings-slider-label">Font Size</span>
        <span class="qa-settings-slider-value">{fontSizeValue}</span>
      </span>
      <span class="qa-settings-slider-track-row">
        <span class="qa-settings-slider-min" aria-hidden="true">A</span>
        <input
          class="qa-settings-slider-input"
          aria-label="Font Size"
          type="range"
          min="0"
          max="4"
          value={optionIndex(fontOptions, settings.fontSize)}
          oninput={(event) => { void handleFontSize(event) }}
        />
        <span class="qa-settings-slider-max qa-settings-slider-max--lg" aria-hidden="true">A</span>
      </span>
    </label>

    <label class="qa-settings-slider">
      <span class="qa-settings-slider-row">
        <span class="qa-settings-slider-label">Reading Flow</span>
        <span class="qa-settings-slider-value">{readingFlowValue}</span>
      </span>
      <span class="qa-settings-slider-track-row">
        <span class="qa-settings-slider-min" aria-hidden="true">-</span>
        <input
          class="qa-settings-slider-input"
          aria-label="Reading Flow"
          type="range"
          min="0"
          max="4"
          value={optionIndex(readingOptions, readingFlowStep)}
          oninput={(event) => { void handleReadingFlow(event) }}
        />
        <span class="qa-settings-slider-max" aria-hidden="true">+</span>
      </span>
    </label>
  </section>

  <section class="qa-settings-sect" aria-labelledby="qa-settings-sources">
    <div class="qa-settings-sect-hdr">
      <h3 id="qa-settings-sources" class="qa-settings-sect-name">Sources</h3>
    </div>

    <button
      type="button"
      class="qa-settings-src-row"
      data-testid="src-row-recitation"
      onclick={() => { void openPicker('riwayah') }}
    >
      <span class="qa-settings-src-key">Active Riwayah</span>
      <span class="qa-settings-src-val">{activeRiwayahLabel}</span>
      <span class="qa-settings-src-chev" aria-hidden="true">›</span>
    </button>

    <button
      type="button"
      class="qa-settings-src-row"
      onclick={() => { void openPicker('text') }}
    >
      <span class="qa-settings-src-key">Quran Text Style</span>
      <span class="qa-settings-src-val">{quranTextStyleLabel}</span>
      <span class="qa-settings-src-chev" aria-hidden="true">›</span>
    </button>

    <div class="qa-settings-trans-row" data-testid="src-row-translation">
      <span class="qa-settings-src-key">Translation Source</span>
      <button
        type="button"
        class="qa-settings-trans-name"
        aria-label={`Translation Source: ${translationLabel}`}
        onclick={() => { void openPicker('translation') }}
      >
        {translationLabel}
      </button>
      <button
        type="button"
        class="qa-settings-trans-chev"
        aria-label="Translation Source"
        onclick={() => { void openPicker('translation') }}
      >
        ›
      </button>
      <button
        type="button"
        class="qa-settings-switch"
        class:qa-settings-switch--on={settings.translationVisible}
        role="switch"
        aria-label="Show translation"
        aria-checked={settings.translationVisible}
        onclick={() => { void setTranslationVisible(!settings.translationVisible) }}
      >
        <span class="qa-settings-switch-knob"></span>
      </button>
    </div>

    <button
      type="button"
      class="qa-settings-src-row"
      data-testid="src-row-tafsir"
      onclick={() => { void openPicker('tafsir') }}
    >
      <span class="qa-settings-src-key">Tafsir Source</span>
      <span class="qa-settings-src-val">{tafsirLabel}</span>
      <span class="qa-settings-src-chev" aria-hidden="true">›</span>
    </button>
  </section>
</div>

{#if picker}
  <NestedAssetPicker
    title={pickerTitle}
    rows={pickerRows}
    close={() => { picker = null }}
    choose={(id) => { void chooseAsset(id) }}
  />
{/if}
