<script lang="ts">
  import { onMount } from 'svelte'
  import { get, put } from '../core/db.js'
  import { emit } from '../core/events.js'
  import { Events } from '../core/constants.js'
  import { logger } from '../core/logger.js'
  import { settings } from '../state/settings.svelte.ts'
  import { getThemeOptions, setTheme } from './theme.ts'
  import { getFontSizeOptions, setFontSize } from './font-size.ts'
  import { getTranslations } from '../data/dataset.js'
  import { showClearDataConfirmation } from './clear-data.ts'
  import { registerPanel } from './panel-bridge.ts'

  type TranslationEntry = { id: string; name: string; subtitle?: string }

  // Sheet visibility
  let open = $state(false)
  // View: 'main' | 'translation-picker'
  let view = $state<'main' | 'translation-picker'>('main')

  // Data loaded when sheet opens
  let translations = $state<TranslationEntry[]>([])
  let translationId = $state<string | null>(null)

  // Computed from settings rune
  const themeOptions = getThemeOptions()
  const fontOptions = getFontSizeOptions()

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

  // ---- Clear data ----

  async function handleClearData() {
    closeSettingsSheet()
    await showClearDataConfirmation()
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
        </section>

        <!-- Font size section -->
        <section class="qa-settings-section">
          <div class="qa-settings-label">Font size</div>
          <div class="qa-font-wrap">
            <span class="qa-font-min">Aa</span>
            <input
              type="range"
              class="qa-font-slider"
              min="0"
              max={fontOptions.length - 1}
              step="1"
              value={fontIndexOf(settings.fontSize)}
              aria-label="Font size"
              oninput={handleFontSlider}
            />
            <span class="qa-font-max">Aa</span>
          </div>
          <div class="qa-font-preview">
            <span class="qa-font-preview-en">The Most Gracious · </span>
            <span class="qa-font-preview-ar" dir="rtl">ٱلرَّحْمَـٰنِ</span>
          </div>
        </section>

        <!-- Reading section -->
        <section class="qa-settings-section">
          <div class="qa-settings-label">Reading</div>
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

        <!-- Clear data -->
        <section class="qa-settings-section">
          <button
            type="button"
            class="qa-sheet-row qa-sheet-row--danger"
            onclick={handleClearData}
          >
            <span class="qa-sheet-row-body">
              <span class="qa-sheet-row-label">Clear all data</span>
              <span class="qa-sheet-row-meta">Removes all marks, positions &amp; settings</span>
            </span>
          </button>
        </section>
      </div>

    {:else}
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
    {/if}
  </div>
{/if}

<style>
  .qa-settings-section {
    padding: 10px 2px 14px;
    border-top: 1px solid var(--qa-ambient-border);
  }
  .qa-settings-section:first-child { border-top: none; }
  .qa-settings-label {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--qa-ambient-accent);
    margin-bottom: 8px;
  }

  .qa-theme-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .qa-theme-swatch {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 0;
    border: 2px solid transparent;
    border-radius: var(--qa-radius-lg);
    background: transparent;
    cursor: pointer;
    overflow: hidden;
  }
  .qa-theme-swatch--active { border-color: var(--qa-ambient-accent); }
  .qa-theme-swatch-preview {
    aspect-ratio: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--qa-font-arabic);
    font-size: 1.25rem;
    border-bottom: 1px solid var(--qa-ambient-border);
  }
  :global(.qa-theme-swatch--light) .qa-theme-swatch-preview { background: #fbf8f0; color: #3d2e14; }
  :global(.qa-theme-swatch--sepia) .qa-theme-swatch-preview { background: #f3e8cf; color: #6b4a16; }
  :global(.qa-theme-swatch--dark)  .qa-theme-swatch-preview { background: #0e0e0c; color: #a89968; }
  :global(.qa-theme-swatch--auto)  .qa-theme-swatch-preview { background: linear-gradient(135deg, #fbf8f0 50%, #0e0e0c 50%); color: #a89968; }
  .qa-theme-swatch-label {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 4px 0;
    color: var(--qa-ambient-parchment);
    background-color: var(--qa-ambient-surface);
  }

  .qa-font-wrap { display: flex; align-items: center; gap: 8px; }
  .qa-font-min { font-size: 0.875rem; color: var(--qa-ambient-dim); }
  .qa-font-max { font-size: 1.25rem; color: var(--qa-ambient-parchment); font-weight: 600; }
  .qa-font-slider { flex: 1; accent-color: var(--qa-ambient-accent); }
  .qa-font-preview {
    margin-top: 10px;
    padding: 8px 10px;
    border-radius: var(--qa-radius-md);
    background-color: color-mix(in srgb, var(--qa-ambient-accent) 6%, transparent);
    text-align: center;
  }
  .qa-font-preview-ar {
    font-family: var(--qa-font-arabic);
    color: var(--qa-ambient-parchment);
    font-size: calc(var(--qa-text-size-arabic) * var(--qa-font-size-base) * 0.7);
    line-height: var(--qa-line-height-arabic);
  }
  .qa-font-preview-en {
    color: var(--qa-ambient-muted);
    font-size: calc(var(--qa-text-size-translation) * var(--qa-font-size-base) * 0.8);
  }

  .qa-settings-toggle-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 4px;
    border-top: 1px solid var(--qa-ambient-border);
  }
  .qa-settings-toggle-row:first-child { border-top: none; }
  .qa-settings-toggle-body {
    border: none;
    background: transparent;
    color: var(--qa-ambient-parchment);
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 0;
    flex: 1;
    text-align: left;
    cursor: pointer;
    min-width: 0;
  }
  .qa-settings-toggle-main { font-size: 0.875rem; font-weight: 600; }
  .qa-settings-toggle-sub { font-size: 0.75rem; color: var(--qa-ambient-muted); }

  .qa-settings-switch {
    width: 36px;
    height: 20px;
    border-radius: var(--qa-radius-pill);
    position: relative;
    border: none;
    background-color: var(--qa-ambient-border);
    cursor: pointer;
    flex-shrink: 0;
    transition: background-color var(--qa-transition-base);
  }
  .qa-settings-switch--on { background-color: var(--qa-ambient-accent); }
  .qa-settings-switch-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: var(--qa-radius-circle);
    background-color: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: left var(--qa-transition-base);
  }
  .qa-settings-switch--on .qa-settings-switch-knob { left: 18px; }

  .qa-settings-trans-choice {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 4px;
    border: none;
    border-bottom: 1px solid var(--qa-ambient-border);
    background: transparent;
    cursor: pointer;
  }
  .qa-settings-trans-choice:last-child { border-bottom: none; }
  .qa-settings-trans-body { display: flex; flex-direction: column; flex: 1; text-align: left; }
  .qa-settings-trans-name { font-size: 0.875rem; color: var(--qa-ambient-parchment); font-weight: 600; }
  .qa-settings-trans-sub { font-size: 0.75rem; color: var(--qa-ambient-muted); }
  .qa-settings-trans-check {
    color: var(--qa-ambient-accent);
    opacity: 0;
    font-size: 0.875rem;
  }
  .qa-settings-trans-choice--on .qa-settings-trans-check { opacity: 1; }
</style>
