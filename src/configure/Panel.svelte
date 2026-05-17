<script lang="ts">
  import { onMount } from 'svelte'
  import { get } from '../core/db.js'
  import { emit } from '../core/events.js'
  import { Events } from '../core/constants.js'
  import { logger } from '../core/logger.js'
  import { riwayahPackageState, settings } from './state.svelte.ts'
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
  import { getTafsirs, getTranslations } from '../data/dataset.js'
  import { getRiwayahLabels, getRiwayahOptions, type Riwayah } from '../packs/riwayah'
  import {
    refreshRiwayahPackageStatus,
    retryRiwayahPackageInstall,
    startRiwayahPackageInstall,
    startSourceAssetDownload,
  } from '../data/offline-client.ts'
  import { panelBridge, setTranslationVisible, setTranslationId, loadTranslationId } from './panel-bridge.ts'
  import { resolveSavedTafsirId, setTafsirId } from './tafsir.ts'
  import { loadRiwayah, setRiwayah } from './riwayah.ts'
  import OfflineSelector from './offline-selector.svelte'

  type TranslationEntry = { id: string; name: string; subtitle?: string; availableInManifest?: boolean }
  type TafsirEntry = { id: string; name: string; availableInManifest?: boolean }
  type PickerKind = 'recitation' | 'translation' | 'tafsir' | null

  let open = $state(false)
  let picker = $state<PickerKind>(null)

  let translations = $state<TranslationEntry[]>([])
  let translationId = $state<string | null>(null)
  let tafsirs = $state<TafsirEntry[]>([])
  let tafsirId = $state('muyassar')
  let sourceBusy = $state<string | null>(null)
  let sourceError = $state<string | null>(null)
  let riwayahBusy = $state<Riwayah | null>(null)

  const themeOptions = getThemeOptions()
  const fontOptions = getFontSizeOptions()
  const readingOptions = getReadingOptions()
  const riwayahOptions = getRiwayahOptions()

  const RIWAYAH_LABELS: Record<Riwayah, { label: string; sub: string; full: string }> = {
    hafs: {
      label: getRiwayahLabels('hafs').productShort,
      sub: getRiwayahLabels('hafs').subtitle,
      full: getRiwayahLabels('hafs').productFull,
    },
    warsh: {
      label: getRiwayahLabels('warsh').productShort,
      sub: getRiwayahLabels('warsh').subtitle,
      full: getRiwayahLabels('warsh').productFull,
    },
    qaloon: {
      label: getRiwayahLabels('qaloon').productShort,
      sub: getRiwayahLabels('qaloon').subtitle,
      full: getRiwayahLabels('qaloon').productFull,
    },
  }

  const THEME_META: Record<string, { label: string; sub: string }> = {
    light: { label: 'Light', sub: 'Parchment surface, dark ink' },
    sepia: { label: 'Sepia', sub: 'Warm vintage paper' },
    dark:  { label: 'Dark',  sub: 'Low-light, gold accents' },
    auto:  { label: 'Auto',  sub: 'Follows system preference' },
  }

  // Sūrat ar-Raḥmān 1–4, character-for-character per riwayah corpus.
  // No verse-number glyphs (KFGQPC end-of-verse ligature collides with
  // literal U+0660 digits and double-renders); spaces between verses keep
  // it a single flowing string the reader cascade can scale cleanly.
  const PREVIEW_AR: Record<Riwayah, string> = {
    hafs:   'ٱلرَّحۡمَٰنُ عَلَّمَ ٱلۡقُرۡءَانَ خَلَقَ ٱلۡإِنسَٰنَ عَلَّمَهُ ٱلۡبَيَانَ',
    warsh:  'اِ۬لرَّحْمَٰنُ عَلَّمَ اَ۬لْقُرْءَانَ خَلَقَ اَ۬لِانسَٰنَ عَلَّمَهُ اَ۬لْبَيَانَ',
    qaloon: 'اِ۬لرَّحْمَٰنُ عَلَّمَ اَ۬لْقُرْءَانَ خَلَقَ اَ۬لِانسَٰنَ عَلَّمَهُ اَ۬لْبَيَانَ',
  }

  const PREVIEW_TRANSLATION =
    'The Most Gracious — He has taught the Qurʾān. He created humankind and taught him eloquent speech.'

  const currentRiwayah = $derived<Riwayah>((settings.riwayah as Riwayah | undefined) ?? 'qaloon')

  const fmtBytes = (bytes: number): string => {
    if (bytes <= 0) return ''
    const mb = bytes / (1024 * 1024)
    if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    return `${(mb / 1024).toFixed(1)} GB`
  }

  async function loadSheetData() {
    try {
      const [loadedTranslations, loadedTafsirs, visibleRec] = await Promise.all([
        loadTranslations(),
        loadTafsirs(),
        get('settings', 'translationVisible'),
      ])
      translations = loadedTranslations
      tafsirs = loadedTafsirs
      const visible = visibleRec?.value as boolean | undefined
      if (visible !== undefined) {
        Object.assign(settings, { translationVisible: visible })
      }
      translationId = await resolveCurrentTranslationId(loadedTranslations)
      tafsirId = await resolveCurrentTafsirId(loadedTafsirs)
      const r = await loadRiwayah()
      ;(settings as Record<string, unknown>).riwayah = r
      await refreshRiwayahStatuses()
    } catch (error) {
      logger.error('Failed to load settings sheet data', { error })
    }
  }

  async function refreshRiwayahStatuses(): Promise<void> {
    await Promise.all(
      riwayahOptions.map(async (riwayah) => {
        try {
          riwayahPackageState[riwayah] = await refreshRiwayahPackageStatus(riwayah)
        } catch {
          riwayahPackageState[riwayah] = { kind: 'unavailable', riwayah }
        }
      }),
    )
  }

  async function loadTranslations(): Promise<TranslationEntry[]> {
    try {
      return await getTranslations() as TranslationEntry[]
    } catch (error) {
      logger.error('Failed to load translations', { error })
      return []
    }
  }

  async function loadTafsirs(): Promise<TafsirEntry[]> {
    try {
      return await getTafsirs() as TafsirEntry[]
    } catch (error) {
      logger.error('Failed to load tafsir sources', { error })
      return []
    }
  }

  async function resolveCurrentTranslationId(
    availableTranslations: TranslationEntry[]
  ): Promise<string | null> {
    const saved = (await loadTranslationId()) ?? undefined
    const valid = availableTranslations.find(t => t.id === saved)
    if (valid) { return valid.id }
    const fallback = availableTranslations[0]?.id ?? null
    if (fallback && fallback !== saved) {
      await setTranslationId(fallback)
    }
    return fallback
  }

  async function resolveCurrentTafsirId(availableTafsirs: TafsirEntry[]): Promise<string> {
    const fallback = availableTafsirs[0]?.id ?? 'muyassar'
    const resolved = await resolveSavedTafsirId(availableTafsirs.map(t => t.id))
    return resolved || fallback
  }

  let _escHandler: ((e: KeyboardEvent) => void) | null = null

  function openSettingsSheet() {
    if (open) { return }
    picker = null
    open = true
    loadSheetData()
    emit(Events.SHEET_OPENED, { name: 'settings' })
    _escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (picker) { picker = null } else { closeSettingsSheet() }
      }
    }
    document.addEventListener('keydown', _escHandler)
  }

  function closeSettingsSheet() {
    if (!open) { return }
    open = false
    picker = null
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

  async function handleTranslationToggle() {
    const next = !settings.translationVisible
    if ((await setTranslationVisible(next)) === null) {
      logger.error('Failed to save translation setting', { next })
    }
  }

  function riwayahStatusLabel(r: Riwayah): string {
    const status = riwayahPackageState[r]
    if (!status) return 'Checking'
    switch (status.kind) {
      case 'installed':
        return 'Installed'
      case 'installable':
        return `Install ${fmtBytes(status.totalBytes)}`
      case 'installing':
        return `Installing ${status.cached} / ${status.total}`
      case 'unavailable':
        return 'Unavailable'
      case 'error':
        return `Retry${status.message ? ` · ${status.message}` : ''}`
    }
  }

  function riwayahRowDisabled(r: Riwayah): boolean {
    const status = riwayahPackageState[r]
    return riwayahBusy !== null
      || !status
      || status.kind === 'installing'
      || status.kind === 'unavailable'
  }

  async function handleRiwayah(r: Riwayah) {
    const status = riwayahPackageState[r]
    if (!status || status.kind === 'installing' || status.kind === 'unavailable') return
    riwayahBusy = r
    sourceError = null
    try {
      if (status.kind === 'installed') {
        if (await setRiwayah(r)) picker = null
        return
      }
      const ok = status.kind === 'error'
        ? await retryRiwayahPackageInstall(r)
        : await startRiwayahPackageInstall(r)
      if (ok) {
        await refreshRiwayahStatuses()
        picker = null
      }
    } catch (error) {
      sourceError = error instanceof Error ? error.message : 'Could not update recitation package.'
      await refreshRiwayahStatuses()
    } finally {
      riwayahBusy = null
    }
  }

  async function handleTranslationChoice(opt: TranslationEntry) {
    sourceError = null
    sourceBusy = opt.id
    try {
      if (opt.availableInManifest === false) {
        const ok = await startSourceAssetDownload('translation', opt.id)
        if (!ok) {
          sourceError = 'Not enough storage for this translation.'
          return
        }
      }
    } catch {
      sourceError = 'Could not download this translation.'
      return
    } finally {
      sourceBusy = null
    }
    await setTranslationId(opt.id)
    translationId = opt.id
    picker = null
  }

  async function handleTafsirChoice(opt: TafsirEntry) {
    sourceError = null
    sourceBusy = opt.id
    try {
      if (opt.availableInManifest === false) {
        const ok = await startSourceAssetDownload('tafsir', opt.id)
        if (!ok) {
          sourceError = 'Not enough storage for this tafsir.'
          return
        }
      }
    } catch {
      sourceError = 'Could not download this tafsir.'
      return
    } finally {
      sourceBusy = null
    }
    await setTafsirId(opt.id)
    tafsirId = opt.id
    picker = null
  }

  function openRecitation() { picker = 'recitation' }
  function openTranslationPicker() {
    if (translations.length > 1) { picker = 'translation' }
  }
  function openTafsirPicker() {
    if (tafsirs.length > 1) { picker = 'tafsir' }
  }
  function closePicker() { picker = null }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') { closeSettingsSheet() }
  }

  onMount(() => {
    panelBridge.register({
      open: openSettingsSheet,
      close: closeSettingsSheet,
      isOpen: () => open,
    })
    return () => { panelBridge.unregister() }
  })

  const currentTranslationName = $derived(
    translations.find(t => t.id === translationId)?.name
      ?? translations[0]?.name
      ?? 'English'
  )
  const currentTafsirName = $derived(
    tafsirs.find(t => t.id === tafsirId)?.name
      ?? tafsirs[0]?.name
      ?? 'Tafsir'
  )
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
    <!-- Live preview band — fixed-height theme-true band; content stage
         inside scrolls when verse text overflows so the band itself never
         resizes regardless of font-size / reading-flow slider position. -->
    <div class="qa-settings-preview" data-testid="settings-preview" aria-live="polite">
      <button
        type="button"
        class="qa-settings-close"
        aria-label="Close"
        onclick={closeSettingsSheet}
      >✕</button>
      <div class="qa-settings-preview-eye">
        Live preview · {RIWAYAH_LABELS[currentRiwayah].label}
      </div>
      <!-- tabindex=0 makes the scrollable preview keyboard-accessible
           (axe-core scrollable-region rule). aria-label gives screen
           readers a name for the region. role=region on a div is the
           supported pattern for a labeled scrollable landmark. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="qa-settings-preview-stage"
        tabindex="0"
        role="region"
        aria-label="Live preview"
      >
        <p class="qa-verse-arabic qa-settings-preview-ar" dir="rtl">{PREVIEW_AR[currentRiwayah]}</p>
        <!-- Always rendered to reserve layout space; visibility hidden when
             toggle is off so the preview height stays stable. Inherits
             font-size / line-height / word-spacing from .qa-verse-translation
             so the reader's reading-flow + font-size sliders drive it. -->
        <p
          class="qa-verse-translation qa-settings-preview-tr"
          class:qa-settings-preview-tr--hidden={!settings.translationVisible}
          aria-hidden={!settings.translationVisible}
        >{PREVIEW_TRANSLATION}</p>
      </div>
    </div>

    <div class="qa-settings-body">

      <!-- Reading: flex 1 -->
      <section class="qa-settings-sect qa-settings-sect--reading">
        <div class="qa-settings-sect-hdr">
          <span class="qa-settings-sect-name">Reading</span>
          <!-- Reset always rendered (disabled at default) so slider movement
               does not push the rest of the section up/down. -->
          <button
            type="button"
            class="qa-settings-reset"
            class:qa-settings-reset--idle={typographyIsDefault}
            onclick={handleResetTypography}
            disabled={typographyIsDefault}
            data-testid="typography-reset"
            aria-label="Reset reading to default"
          >↻ Reset</button>
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
            <span class="qa-settings-slider-min" aria-hidden="true">⇉</span>
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
            <span class="qa-settings-slider-max" aria-hidden="true">⇈</span>
          </div>
        </div>

      </section>

      <!-- Sources: flex 1 -->
      <section class="qa-settings-sect qa-settings-sect--sources">
        <div class="qa-settings-sect-hdr">
          <span class="qa-settings-sect-name">Sources</span>
        </div>

        <button
          type="button"
          class="qa-settings-src-row"
          onclick={openRecitation}
          data-testid="src-row-recitation"
        >
          <span class="qa-settings-src-key">Recitation</span>
          <span class="qa-settings-src-val">{RIWAYAH_LABELS[currentRiwayah].full}</span>
          <span class="qa-settings-src-chev" aria-hidden="true">›</span>
        </button>

        <!-- Dual-action translation row -->
        <div class="qa-settings-trans-row">
          <span class="qa-settings-src-key">Translation</span>
          <button
            type="button"
            class="qa-settings-trans-name"
            onclick={openTranslationPicker}
            data-testid="src-row-translation"
          >{currentTranslationName}</button>
          <button
            type="button"
            class="qa-settings-trans-chev"
            onclick={openTranslationPicker}
            aria-label="Choose translation"
            disabled={translations.length <= 1}
          >›</button>
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

        <button
          type="button"
          class="qa-settings-src-row"
          onclick={openTafsirPicker}
          data-testid="src-row-tafsir"
        >
          <span class="qa-settings-src-key">Tafsir</span>
          <span class="qa-settings-src-val">{currentTafsirName}</span>
          <span class="qa-settings-src-chev" aria-hidden="true">›</span>
        </button>
      </section>

      <!-- Storage section (N21) — per-feature offline opt-in selector. -->
      <OfflineSelector />
    </div>

    <!-- Theme footer -->
    <div class="qa-settings-footer">
      <div class="qa-settings-tf-cluster">
        <span class="qa-settings-tf-key">Theme</span>
        <div class="qa-settings-tf-swatches" role="radiogroup" aria-label="Theme">
          {#each themeOptions as opt (opt)}
            <button
              type="button"
              class="qa-settings-tf-dot qa-settings-tf-dot--{opt}"
              class:qa-settings-tf-dot--act={settings.theme === opt}
              role="radio"
              aria-checked={settings.theme === opt}
              aria-label={THEME_META[opt]?.label ?? opt}
              onclick={() => handleTheme(opt)}
            >ا</button>
          {/each}
        </div>
      </div>
      <button
        type="button"
        class="qa-settings-tf-night"
        class:qa-settings-tf-night--on={settings.nightMode}
        role="switch"
        aria-checked={settings.nightMode}
        aria-label="Night mode"
        onclick={handleNightMode}
        data-testid="night-mode-switch"
      >☾</button>
    </div>

    <!-- Picker popover modal -->
    {#if picker}
      <div
        class="qa-settings-pop-scrim"
        onclick={closePicker}
        role="presentation"
      ></div>
      <div
        class="qa-settings-pop"
        role="dialog"
        aria-modal="true"
        aria-label={
          picker === 'recitation'
            ? 'Choose Recitation'
            : picker === 'translation'
              ? 'Choose Translation'
              : 'Choose Tafsir'
        }
        data-testid="settings-pop"
      >
        <header class="qa-settings-pop-head">
          <span class="qa-settings-pop-eye">
            {picker === 'recitation'
              ? 'Choose a Riwāyah'
              : picker === 'translation'
                ? 'Choose a translation'
                : 'Choose a tafsir'}
          </span>
          <span class="qa-settings-pop-key">
            {picker === 'recitation' ? 'Recitation' : picker === 'translation' ? 'Translation' : 'Tafsir'}
          </span>
        </header>
        {#if sourceError}
          <p class="qa-settings-pop-error" role="alert">{sourceError}</p>
        {/if}
        <div class="qa-settings-pop-list">
          {#if picker === 'recitation'}
            {#each riwayahOptions as opt (opt)}
              <button
                type="button"
                class="qa-settings-pop-row"
                class:qa-settings-pop-row--act={settings.riwayah === opt}
                class:qa-settings-pop-row--disabled={riwayahRowDisabled(opt)}
                disabled={riwayahRowDisabled(opt)}
                onclick={() => handleRiwayah(opt)}
                data-testid="riwayah-row-{opt}"
              >
                <span class="qa-settings-pop-body">
                  <span class="qa-settings-pop-name">{RIWAYAH_LABELS[opt].label}</span>
                  <span class="qa-settings-pop-sub">{RIWAYAH_LABELS[opt].sub}</span>
                  <span class="qa-settings-pop-sub" data-testid="riwayah-row-state-{opt}">
                    {riwayahStatusLabel(opt)}
                  </span>
                </span>
                <span class="qa-settings-pop-check" aria-hidden="true">
                  {riwayahBusy === opt ? '…' : settings.riwayah === opt ? '✓' : ''}
                </span>
              </button>
            {/each}
          {:else if picker === 'translation'}
            {#each translations as opt (opt.id)}
              <button
                type="button"
                class="qa-settings-pop-row"
                class:qa-settings-pop-row--act={opt.id === translationId}
                disabled={sourceBusy !== null}
                onclick={() => handleTranslationChoice(opt)}
              >
                <span class="qa-settings-pop-body">
                  <span class="qa-settings-pop-name">{opt.name}</span>
                  {#if opt.subtitle}
                    <span class="qa-settings-pop-sub">{opt.subtitle}</span>
                  {/if}
                </span>
                <span class="qa-settings-pop-check" aria-hidden="true">{sourceBusy === opt.id ? '…' : '✓'}</span>
              </button>
            {/each}
          {:else}
            {#each tafsirs as opt (opt.id)}
              <button
                type="button"
                class="qa-settings-pop-row"
                class:qa-settings-pop-row--act={opt.id === tafsirId}
                disabled={sourceBusy !== null}
                onclick={() => handleTafsirChoice(opt)}
              >
                <span class="qa-settings-pop-body">
                  <span class="qa-settings-pop-name">{opt.name}</span>
                </span>
                <span class="qa-settings-pop-check" aria-hidden="true">{sourceBusy === opt.id ? '…' : '✓'}</span>
              </button>
            {/each}
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}
