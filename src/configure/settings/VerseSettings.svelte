<script lang="ts">
  import { setFontSize, getFontSizeOptions } from '../font-size'
  import {
    getReadingFlowStep,
    getReadingOptions,
    setReadingFlow,
    type ReadingStep,
  } from '../reading-typography'
  import { settings } from '../state.svelte'
  import { setTranslationVisible } from '../panel-bridge'

  const fontOptions = getFontSizeOptions()
  const readingOptions = getReadingOptions()

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

  const fontSizeValue = $derived(humanizeId(settings.fontSize))
  const readingFlowValue = $derived(humanizeId(readingFlowStep))
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

    <label class="qa-settings-slider qa-settings-row qa-settings-row--slider">
      <span class="qa-settings-slider-row qa-settings-row-meta">
        <span class="qa-settings-slider-label qa-settings-row-label">Font Size</span>
        <span class="qa-settings-slider-value qa-settings-row-control">{fontSizeValue}</span>
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

    <label class="qa-settings-slider qa-settings-row qa-settings-row--slider">
      <span class="qa-settings-slider-row qa-settings-row-meta">
        <span class="qa-settings-slider-label qa-settings-row-label">Reading Flow</span>
        <span class="qa-settings-slider-value qa-settings-row-control">{readingFlowValue}</span>
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

  <section class="qa-settings-sect" aria-labelledby="settings-display">
    <div class="qa-settings-sect-hdr">
      <h3 id="settings-display" class="qa-settings-sect-name">Display</h3>
    </div>

    <div class="qa-settings-row qa-settings-row--switch qa-settings-trans-row" data-testid="src-row-translation">
      <span class="qa-settings-src-key qa-settings-row-label">Bridges Translation</span>
      <span class="qa-settings-src-val qa-settings-row-control">Reader line</span>
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
  </section>
</div>
