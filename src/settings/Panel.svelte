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

  // Sheet visibility
  let open = $state(false)
  // View: 'main' | 'translation-picker' | 'typography'
  let view = $state<'main' | 'translation-picker' | 'typography'>('main')

  // Data loaded when sheet opens
  let translations = $state<TranslationEntry[]>([])
  let translationId = $state<string | null>(null)

  // Computed from settings rune
  const themeOptions = getThemeOptions()
  const fontOptions = getFontSizeOptions()
  const readingOptions = getReadingOptions()
  let riwayahOptions = $state(getRiwayahOptions())

  const RIWAYAH_LABELS: Record<Riwayah, { label: string; sub: string }> = {
    hafs:   { label: 'Ḥafṣ',   sub: 'Ḥafṣ ʿan ʿĀṣim · 6236 ayāt' },
    warsh:  { label: 'Warsh',  sub: 'Warsh ʿan Nāfiʿ · 6214 ayāt' },
    qaloon: { label: 'Qālūn',  sub: 'Qālūn ʿan Nāfiʿ · 6214 ayāt' },
  }

  async function loadSheetData() {
    try {
      const [loadedTranslations, visibleRec] = await Promise.all([
        loadTranslations(),
        get('settings', 'translationVisible'),
      ])
      translations = loadedTranslations
      // Sync translationVisible from IDB into rune (source of truth on open)
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

  // ---- Public API (registered with panel-bridge) ----

  let _escHandler: ((e: KeyboardEvent) => void) | null = null

  function openSettingsSheet() {
    if (open) { return }
    view = 'main'
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

  // ---- Theme ----

  async function handleTheme(opt: string) {
    await setTheme(opt)
  }

  async function handleNightMode() {
    await toggleNightMode()
  }

  // ---- Font size ----

  function fontIndexOf(size: string): number {
    const idx = fontOptions.indexOf(size as typeof fontOptions[number])
    return idx >= 0 ? idx : 2 // default to md (index 2)
  }

  async function handleFontSlider(e: Event) {
    const idx = parseInt((e.target as HTMLInputElement).value, 10)
    const size = fontOptions[Math.max(0, Math.min(fontOptions.length - 1, idx))]
    if (size) { await setFontSize(size) }
  }

  // ---- Reading flow (single slider drives line/word/margin/verse-spacing) ----

  function readingIndexOf(step: string): number {
    const idx = readingOptions.indexOf(step as typeof readingOptions[number])
    return idx >= 0 ? idx : 2
  }

  // Slider thumb position. Falls back to md when the four underlying dims are
  // out of sync (e.g. a future advanced split has run) — the slider only
  // commits a single coordinated value, so a mixed state collapses to md.
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

  function typographySubtitle(): string {
    if (typographyIsDefault) { return 'Default' }
    return `Aa ${settings.fontSize} · ↕ ${readingFlowStep}`
  }

  const typographyIsDefault = $derived(
    settings.fontSize === 'md' && readingFlowStep === 'md'
  )

  // ---- Translation toggle ----

  async function handleTranslationToggle() {
    const next = !settings.translationVisible
    try {
      await put('settings', { key: 'translationVisible', value: next })
      Object.assign(settings, { translationVisible: next })
    } catch (error) {
      logger.error('Failed to save translation setting', { error })
    }
  }

  // ---- Riwayah picker ----

  async function handleRiwayah(r: Riwayah) {
    await setRiwayah(r)
  }

  // ---- Translation picker ----

  async function handleTranslationChoice(opt: TranslationEntry) {
    try {
      await put('settings', { key: 'translationId', value: opt.id })
      Object.assign(settings, { translationId: opt.id })
      translationId = opt.id
    } catch (error) {
      logger.error('Failed to save translation choice', { error })
    }
    view = 'main'
  }

  // ---- Keyboard: Escape closes ----

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') { closeSettingsSheet() }
  }

  // ---- Lifecycle ----

  onMount(() => {
    registerPanel({ openSettingsSheet, closeSettingsSheet })
  })
</script>

{#if open}
  <div
    class="qa-sheet-backdrop"
    onclick={closeSettingsSheet}
    onkeydown={handleKeydown}
    role="presentation"
  ></div>
  <div
    class="qa-sheet qa-sheet--bottom qa-sheet--settings"
    role="dialog"
    aria-modal="true"
    aria-label="Settings"
  >
    <div class="qa-sheet-grip" aria-hidden="true"></div>

    {#if view === 'main'}
      <div class="qa-sheet-hdr">
        <div class="qa-sheet-title">Settings</div>
        <button
          type="button"
          class="qa-sheet-close"
          aria-label="Close"
          onclick={closeSettingsSheet}
        >✕</button>
      </div>
      <div class="qa-sheet-body">
        <!-- Theme section -->
        <section class="qa-settings-section">
          <div class="qa-settings-label">Theme</div>
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

        <!-- Typography section (font size, line/word spacing, margins) -->
        <section class="qa-settings-section">
          <div class="qa-settings-label">Typography</div>
          <div class="qa-settings-toggle-row">
            <button
              type="button"
              class="qa-settings-toggle-body"
              onclick={() => { view = 'typography' }}
            >
              <div class="qa-settings-toggle-main">Size, spacing &amp; margins</div>
              <div class="qa-settings-toggle-sub">{typographySubtitle()}</div>
            </button>
            <span class="qa-settings-toggle-chev" aria-hidden="true">›</span>
          </div>
        </section>

        <!-- Reading section -->
        <section class="qa-settings-section">
          <div class="qa-settings-label">Reading</div>
          <div class="qa-riwayah-block">
            <div class="qa-riwayah-block-label">Riwayah</div>
            <div class="qa-riwayah-row" role="radiogroup" aria-label="Riwayah">
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
          </div>
          <div class="qa-settings-toggle-row">
            {#if translations.length > 1}
              <button
                type="button"
                class="qa-settings-toggle-body"
                onclick={() => { view = 'translation-picker' }}
              >
                <div class="qa-settings-toggle-main">Show translation</div>
                <div class="qa-settings-toggle-sub">
                  {translations.find(t => t.id === translationId)?.name ?? (translations[0]?.name ?? 'English')}
                </div>
              </button>
            {:else}
              <div class="qa-settings-toggle-body">
                <div class="qa-settings-toggle-main">Show translation</div>
                <div class="qa-settings-toggle-sub">
                  {translations[0]?.name ?? 'English'}
                </div>
              </div>
            {/if}
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
        </section>

      </div>

    {:else if view === 'translation-picker'}
      <!-- Translation picker view -->
      <div class="qa-sheet-hdr">
        <button
          type="button"
          class="qa-sheet-back"
          aria-label="Back"
          onclick={() => { view = 'main' }}
        >← Translation</button>
        <button
          type="button"
          class="qa-sheet-close"
          aria-label="Close"
          onclick={closeSettingsSheet}
        >✕</button>
      </div>
      <div class="qa-sheet-body">
        {#each translations as opt (opt.id)}
          <button
            type="button"
            class="qa-settings-trans-choice"
            class:qa-settings-trans-choice--on={opt.id === translationId}
            onclick={() => handleTranslationChoice(opt)}
          >
            <span class="qa-settings-trans-body">
              <span class="qa-settings-trans-name">{opt.name}</span>
              {#if opt.subtitle}
                <span class="qa-settings-trans-sub">{opt.subtitle}</span>
              {/if}
            </span>
            <span class="qa-settings-trans-check" aria-hidden="true">✓</span>
          </button>
        {/each}
      </div>

    {:else}
      <!-- Typography subview -->
      <div class="qa-sheet-hdr">
        <button
          type="button"
          class="qa-sheet-back"
          aria-label="Back"
          onclick={() => { view = 'main' }}
        >← Typography</button>
        <button
          type="button"
          class="qa-sheet-close"
          aria-label="Close"
          onclick={closeSettingsSheet}
        >✕</button>
      </div>
      <div class="qa-sheet-body qa-typography-body">
        <div class="qa-typography-preview" data-testid="typography-preview">
          <p class="qa-verse-arabic" dir="rtl">ٱلرَّحْمَـٰنُ عَلَّمَ ٱلْقُرْءَانَ</p>
          <p class="qa-verse-translation">The Most Gracious. He has taught the Qur'an.</p>
        </div>

        <div class="qa-typography-slider">
          <label class="qa-typography-slider-label" for="qa-tslider-fs">Font size</label>
          <div class="qa-typography-slider-row">
            <span class="qa-typography-slider-min" aria-hidden="true">Aa</span>
            <input
              id="qa-tslider-fs"
              class="qa-typography-slider-input"
              type="range"
              min="0"
              max={fontOptions.length - 1}
              step="1"
              value={fontIndexOf(settings.fontSize)}
              oninput={handleFontSlider}
              aria-label="Font size"
            />
            <span class="qa-typography-slider-max qa-typography-slider-max--lg" aria-hidden="true">Aa</span>
          </div>
        </div>

        <div class="qa-typography-slider">
          <label class="qa-typography-slider-label" for="qa-tslider-flow">Reading flow</label>
          <div class="qa-typography-slider-row">
            <span class="qa-typography-slider-min" aria-hidden="true">▮</span>
            <input
              id="qa-tslider-flow"
              class="qa-typography-slider-input"
              type="range"
              min="0"
              max={readingOptions.length - 1}
              step="1"
              value={readingIndexOf(readingFlowStep)}
              oninput={handleFlowSlider}
              aria-label="Reading flow"
            />
            <span class="qa-typography-slider-max" aria-hidden="true">▯</span>
          </div>
        </div>

        {#if !typographyIsDefault}
          <button
            type="button"
            class="qa-typography-reset"
            onclick={handleResetTypography}
            data-testid="typography-reset"
          >Reset to default</button>
        {/if}
      </div>
    {/if}
  </div>
{/if}

