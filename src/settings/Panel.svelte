<script lang="ts">
  import { onMount } from 'svelte'
  import { get, put } from '../core/db.js'
  import { emit } from '../core/events.js'
  import { Events } from '../core/constants.js'
  import { logger } from '../core/logger.js'
  import { settings } from '../state/settings.svelte.ts'
  import { getThemeOptions, setTheme } from './theme.ts'
  import { getFontSizeOptions, setFontSize, resetFontSize } from './font-size.ts'
  import {
    getReadingOptions,
    setReadingFlow,
    getReadingFlowStep,
    resetReadingTypography,
    type ReadingStep,
  } from './reading-typography.ts'
  import { toggleNightMode } from './night-mode.ts'
  import { getTranslations } from '../data/dataset.js'
  import { registerPanel } from './panel-bridge.ts'
  import { getRiwayahOptions, loadRiwayah, setRiwayah, type Riwayah } from './riwayah.ts'

  type TranslationEntry = { id: string; name: string; subtitle?: string }

  let open = $state(false)
  let recitationOpen = $state(false)

  let translations = $state<TranslationEntry[]>([])
  let translationId = $state<string | null>(null)

  const themeOptions = getThemeOptions()
  const fontOptions = getFontSizeOptions()
  const readingOptions = getReadingOptions()
  const riwayahOptions = getRiwayahOptions()

  const RIWAYAH_LABELS: Record<Riwayah, { label: string; sub: string }> = {
    hafs:   { label: 'Ḥafṣ',   sub: 'ʿan ʿĀṣim · 6236 ayāt' },
    warsh:  { label: 'Warsh',  sub: 'ʿan Nāfiʿ · 6214 ayāt' },
    qaloon: { label: 'Qālūn',  sub: 'ʿan Nāfiʿ · 6214 ayāt' },
  }

  // Sūrat ar-Raḥmān 1–2 — character-for-character per riwayah corpus.
  const PREVIEW_AR: Record<Riwayah, string> = {
    hafs:   'ٱلرَّحۡمَٰنُ عَلَّمَ ٱلۡقُرۡءَانَ',
    warsh:  'اِ۬لرَّحْمَٰنُ عَلَّمَ اَ۬لْقُرْءَانَ',
    qaloon: 'اِ۬لرَّحْمَٰنُ عَلَّمَ اَ۬لْقُرْءَانَ',
  }

  const PREVIEW_TRANSLATION = 'The Most Gracious — He has taught the Qurʾān'

  const currentRiwayah = $derived<Riwayah>((settings.riwayah as Riwayah | undefined) ?? 'qaloon')

  async function loadSheetData() {
    try {
      const [loadedTranslations, visibleRec] = await Promise.all([
        loadTranslations(),
        get('settings', 'translationVisible'),
      ])
      translations = loadedTranslations
      const visible = visibleRec?.value as boolean | undefined
      if (visible !== undefined) {
        Object.assign(settings, { translationVisible: visible })
      }
      translationId = await resolveCurrentTranslationId(loadedTranslations)
      const r = await loadRiwayah()
      ;(settings as Record<string, unknown>).riwayah = r
    } catch (error) {
      logger.error('Failed to load settings sheet data', { error })
    }
  }

  async function loadTranslations(): Promise<TranslationEntry[]> {
    try {
      return await getTranslations() as TranslationEntry[]
    } catch (error) {
      logger.error('Failed to load translations', { error })
      return []
    }
  }

  async function resolveCurrentTranslationId(
    availableTranslations: TranslationEntry[]
  ): Promise<string | null> {
    const saved = (await get('settings', 'translationId'))?.value as string | undefined
    const valid = availableTranslations.find(t => t.id === saved)
    if (valid) { return valid.id }
    const fallback = availableTranslations[0]?.id ?? null
    if (fallback && fallback !== saved) {
      try { await put('settings', { key: 'translationId', value: fallback }) } catch { /* ignore */ }
    }
    return fallback
  }

  let _escHandler: ((e: KeyboardEvent) => void) | null = null

  function openSettingsSheet() {
    if (open) { return }
    recitationOpen = false
    open = true
    loadSheetData()
    emit(Events.SHEET_OPENED, { name: 'settings' })
    _escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') { closeSettingsSheet() } }
    document.addEventListener('keydown', _escHandler)
  }

  function closeSettingsSheet() {
    if (!open) { return }
    open = false
    if (_escHandler) {
      document.removeEventListener('keydown', _escHandler)
      _escHandler = null
    }
    emit(Events.SHEET_CLOSED, { name: 'settings' })
  }

  async function handleTheme(opt: string) { await setTheme(opt) }
  async function handleNightMode() { await toggleNightMode() }

  function fontIndexOf(size: string): number {
    const idx = fontOptions.indexOf(size as typeof fontOptions[number])
    return idx >= 0 ? idx : 2
  }

  async function handleFontSlider(e: Event) {
    const idx = parseInt((e.target as HTMLInputElement).value, 10)
    const size = fontOptions[Math.max(0, Math.min(fontOptions.length - 1, idx))]
    if (size) { await setFontSize(size) }
  }

  function readingIndexOf(step: string): number {
    const idx = readingOptions.indexOf(step as typeof readingOptions[number])
    return idx >= 0 ? idx : 2
  }

  const readingFlowStep = $derived<ReadingStep>(
    getReadingFlowStep({
      lineSpacing: settings.lineSpacing,
      wordSpacing: settings.wordSpacing,
      readerMargin: settings.readerMargin,
      verseSpacing: settings.verseSpacing,
    }) ?? 'md',
  )

  async function handleFlowSlider(e: Event) {
    const idx = parseInt((e.target as HTMLInputElement).value, 10)
    const step = readingOptions[Math.max(0, Math.min(readingOptions.length - 1, idx))]
    if (step) { await setReadingFlow(step) }
  }

  async function handleResetTypography() {
    await Promise.all([resetFontSize(), resetReadingTypography()])
  }

  const typographyIsDefault = $derived(
    settings.fontSize === 'md' && readingFlowStep === 'md'
  )

  function readingAside(): string {
    if (typographyIsDefault) { return 'Default' }
    return `Aa ${settings.fontSize} · ↕ ${readingFlowStep}`
  }

  async function handleTranslationToggle() {
    const next = !settings.translationVisible
    try {
      await put('settings', { key: 'translationVisible', value: next })
      Object.assign(settings, { translationVisible: next })
    } catch (error) {
      logger.error('Failed to save translation setting', { error })
    }
  }

  async function handleRiwayah(r: Riwayah) {
    await setRiwayah(r)
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') { closeSettingsSheet() }
  }

  function toggleRecitation() { recitationOpen = !recitationOpen }

  onMount(() => {
    registerPanel({ openSettingsSheet, closeSettingsSheet })
  })
</script>

{#if open}
  <div
    class="qa-sheet-backdrop qa-sheet-backdrop--settings-fs"
    onclick={closeSettingsSheet}
    onkeydown={handleKeydown}
    role="presentation"
  ></div>
  <div
    class="qa-sheet qa-sheet--settings qa-sheet--settings-fs"
    role="dialog"
    aria-modal="true"
    aria-label="Settings"
  >
    <header class="qa-settings-hdr">
      <h2 class="qa-settings-title">Settings</h2>
      <button
        type="button"
        class="qa-settings-close"
        aria-label="Close"
        onclick={closeSettingsSheet}
      >✕</button>
    </header>

    <div class="qa-settings-preview" data-testid="settings-preview" aria-live="polite">
      <div class="qa-settings-preview-eye">
        Live preview · {RIWAYAH_LABELS[currentRiwayah].label}
      </div>
      <p class="qa-verse-arabic qa-settings-preview-ar" dir="rtl">{PREVIEW_AR[currentRiwayah]}</p>
      {#if settings.translationVisible}
        <p class="qa-settings-preview-tr">{PREVIEW_TRANSLATION}</p>
      {/if}
    </div>

    <div class="qa-settings-body">

      <!-- 1 · Reading -->
      <section class="qa-settings-sect">
        <div class="qa-settings-sect-hdr">
          <span class="qa-settings-sect-name">Reading</span>
          <span class="qa-settings-sect-aside">{readingAside()}</span>
        </div>

        <div class="qa-settings-slider">
          <div class="qa-settings-slider-row">
            <label class="qa-settings-slider-label" for="qa-tslider-fs">Font size</label>
            <span class="qa-settings-slider-value">{settings.fontSize}</span>
          </div>
          <div class="qa-settings-slider-track-row">
            <span class="qa-settings-slider-min" aria-hidden="true">Aa</span>
            <input
              id="qa-tslider-fs"
              class="qa-settings-slider-input"
              type="range"
              min="0"
              max={fontOptions.length - 1}
              step="1"
              value={fontIndexOf(settings.fontSize)}
              oninput={handleFontSlider}
              aria-label="Font size"
            />
            <span class="qa-settings-slider-max qa-settings-slider-max--lg" aria-hidden="true">Aa</span>
          </div>
        </div>

        <div class="qa-settings-slider">
          <div class="qa-settings-slider-row">
            <label class="qa-settings-slider-label" for="qa-tslider-flow">Reading flow</label>
            <span class="qa-settings-slider-value">{readingFlowStep}</span>
          </div>
          <div class="qa-settings-slider-track-row">
            <span class="qa-settings-slider-min" aria-hidden="true">▮</span>
            <input
              id="qa-tslider-flow"
              class="qa-settings-slider-input"
              type="range"
              min="0"
              max={readingOptions.length - 1}
              step="1"
              value={readingIndexOf(readingFlowStep)}
              oninput={handleFlowSlider}
              aria-label="Reading flow"
            />
            <span class="qa-settings-slider-max" aria-hidden="true">▯</span>
          </div>
        </div>

        <div class="qa-settings-toggle-row">
          <div class="qa-settings-toggle-body">
            <div class="qa-settings-toggle-main">Show translation</div>
            <div class="qa-settings-toggle-sub">
              {translations.find(t => t.id === translationId)?.name ?? (translations[0]?.name ?? 'English')}
            </div>
          </div>
          <button
            type="button"
            class="qa-settings-switch"
            class:qa-settings-switch--on={settings.translationVisible}
            role="switch"
            aria-checked={settings.translationVisible}
            aria-label="Show translation"
            onclick={handleTranslationToggle}
          >
            <span class="qa-settings-switch-knob"></span>
          </button>
        </div>

        {#if !typographyIsDefault}
          <button
            type="button"
            class="qa-settings-reset"
            onclick={handleResetTypography}
            data-testid="typography-reset"
          >Reset to default</button>
        {/if}
      </section>

      <!-- 2 · Appearance -->
      <section class="qa-settings-sect">
        <div class="qa-settings-sect-hdr">
          <span class="qa-settings-sect-name">Appearance</span>
        </div>

        <div class="qa-theme-row" role="radiogroup" aria-label="Theme">
          {#each themeOptions as opt (opt)}
            <button
              type="button"
              class="qa-theme-swatch qa-theme-swatch--{opt}"
              class:qa-theme-swatch--active={settings.theme === opt}
              role="radio"
              aria-checked={settings.theme === opt}
              onclick={() => handleTheme(opt)}
            >
              <span class="qa-theme-swatch-preview" aria-hidden="true">
                <span>الله</span>
              </span>
              <span class="qa-theme-swatch-label">
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </span>
            </button>
          {/each}
        </div>

        <div class="qa-settings-toggle-row qa-settings-toggle-row--night">
          <div class="qa-settings-toggle-body">
            <div class="qa-settings-toggle-main">Night mode</div>
            <div class="qa-settings-toggle-sub">Dim + warm tint over any theme</div>
          </div>
          <button
            type="button"
            class="qa-settings-switch"
            class:qa-settings-switch--on={settings.nightMode}
            role="switch"
            aria-checked={settings.nightMode}
            aria-label="Night mode"
            onclick={handleNightMode}
            data-testid="night-mode-switch"
          >
            <span class="qa-settings-switch-knob"></span>
          </button>
        </div>
      </section>

      <!-- 3 · Recitation (collapsed by default) -->
      <section class="qa-settings-sect">
        <div class="qa-settings-sect-hdr">
          <span class="qa-settings-sect-name">Recitation</span>
        </div>

        <button
          type="button"
          class="qa-settings-recite-row"
          aria-expanded={recitationOpen}
          aria-controls="qa-settings-riwayah-panel"
          onclick={toggleRecitation}
        >
          <span class="qa-settings-recite-body">
            <span class="qa-settings-recite-name">Riwayah</span>
            <span class="qa-settings-recite-sub">
              {RIWAYAH_LABELS[currentRiwayah].label} {RIWAYAH_LABELS[currentRiwayah].sub}
            </span>
          </span>
          <span
            class="qa-settings-recite-chev"
            class:qa-settings-recite-chev--open={recitationOpen}
            aria-hidden="true"
          >›</span>
        </button>

        {#if recitationOpen}
          <div
            id="qa-settings-riwayah-panel"
            class="qa-riwayah-row"
            role="radiogroup"
            aria-label="Riwayah"
          >
            {#each riwayahOptions as opt (opt)}
              <button
                type="button"
                class="qa-riwayah-swatch"
                class:qa-riwayah-swatch--active={settings.riwayah === opt}
                role="radio"
                aria-checked={settings.riwayah === opt}
                onclick={() => handleRiwayah(opt)}
              >
                <span class="qa-riwayah-swatch-label">{RIWAYAH_LABELS[opt].label}</span>
                <span class="qa-riwayah-swatch-sub">{RIWAYAH_LABELS[opt].sub}</span>
              </button>
            {/each}
          </div>
        {/if}
      </section>

    </div>
  </div>
{/if}
