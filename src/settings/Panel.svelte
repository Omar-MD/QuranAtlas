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

