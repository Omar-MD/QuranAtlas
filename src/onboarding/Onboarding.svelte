<script module lang="ts">
  /**
   * Module-level exports — callable without mounting the component.
   * Used by app-bootstrap.ts::handleLaunchRestore for the boot-time redirect.
   */
  import { get, put } from '../core/db.js'

  export async function isComplete(): Promise<boolean> {
    try {
      const rec = await get('settings', 'onboardingComplete')
      return rec?.value === true
    } catch { return false }
  }

  export async function markComplete(): Promise<void> {
    try { await put('settings', { key: 'onboardingComplete', value: true }) } catch { /* ignore */ }
  }
</script>

<script lang="ts">
  /**
   * Onboarding — 5-screen first-run flow.
   *
   * Screen 1: Welcome
   * Screen 2: Theme picker
   * Screen 3: Translation picker
   * Screen 4: Keyboard shortcuts
   * Screen 5: Tags intro + finish CTAs
   */

  import { onMount } from 'svelte'
  import { getTranslations } from '../data/dataset'
  import { setTheme, loadTheme, getThemeOptions } from '../settings/theme.js'
  import { logger } from '../core/logger.js'
  import { SHORTCUT_ROWS, SAMPLE_CHIPS } from './screens'
  import OnboardingScreen from './OnboardingScreen.svelte'
  import type { TranslationEntry } from '../data/dataset'

  // ── component state ───────────────────────────────────────────────────────

  const TOTAL = 5

  let screen = $state(1)

  // Screen 2 — theme
  let currentTheme = $state('light')

  // Screen 3 — translation
  let translationOptions = $state<TranslationEntry[]>([])
  let selectedTranslationId = $state<string | null>(null)

  // ── lifecycle ─────────────────────────────────────────────────────────────

  onMount(async () => {
    // Load saved theme for screen 2
    currentTheme = (await loadTheme()) as string

    // Load translation options for screen 3
    try {
      const opts = await getTranslations()
      translationOptions = opts

      // Determine initial selection
      const savedRec = await get('settings', 'translationId')
      const savedId = savedRec?.value as string | undefined
      const matched = opts.find(o => o.id === savedId)?.id ?? opts[0]?.id ?? null
      selectedTranslationId = matched

      // Persist default selection if it differs from saved
      if (matched && matched !== savedId) {
        try { await put('settings', { key: 'translationId', value: matched }) } catch { /* ignore */ }
      }
    } catch (error) {
      logger.error('Failed to load translations for onboarding', { error })
    }
  })

  // ── navigation helpers ────────────────────────────────────────────────────

  function advance() {
    screen += 1
    if (screen > TOTAL) { finish('fatihah') }
  }

  async function skip() {
    await finish('fatihah')
  }

  async function finish(dest: 'fatihah' | 'surahs') {
    await markComplete()
    if (dest === 'surahs') {
      window.location.hash = '#/surahs'
    } else {
      window.location.hash = '#/s/1'
    }
  }

  // ── screen 2 — theme ─────────────────────────────────────────────────────

  const themeOptions = getThemeOptions() as string[]

  async function pickTheme(opt: string) {
    await setTheme(opt)
    currentTheme = opt
  }

  // ── screen 3 — translation ────────────────────────────────────────────────

  async function pickTranslation(id: string) {
    if (translationOptions.length < 2) { return }
    selectedTranslationId = id
    try { await put('settings', { key: 'translationId', value: id }) } catch { /* ignore */ }
  }
</script>

<div class="qa-onboarding">
  {#if screen === 1}
    <!-- ── Screen 1: Welcome ───────────────────────────────────────────── -->
    <OnboardingScreen {screen} total={TOTAL}>
      <div class="qa-onb-hero">
        <div class="qa-onb-mark" dir="rtl">القرآن أطلس</div>
        <div class="qa-onb-tag">Qur&rsquo;an Atlas</div>
        <div class="qa-onb-blessing">
          <div>Read, reflect, remember.</div>
          <div class="qa-onb-verse" dir="rtl">كِتَٰبٌ أَنزَلْنَـٰهُ إِلَيْكَ مُبَـٰرَكٌ</div>
          <div class="qa-onb-verse-tr">&ldquo;A Book We have sent down to you, blessed.&rdquo; &mdash; 38:29</div>
        </div>
      </div>
      <div class="qa-onb-cta-row">
        <button type="button" class="qa-onb-cta qa-onb-cta--primary" onclick={advance}>Begin</button>
      </div>
    </OnboardingScreen>

  {:else if screen === 2}
    <!-- ── Screen 2: Theme ────────────────────────────────────────────── -->
    <OnboardingScreen {screen} total={TOTAL} onSkip={skip}>
      <h1 class="qa-onb-headline">
        Pick how it <span class="qa-onb-gold">feels</span>.
      </h1>
      <p class="qa-onb-lede">You can change this anytime in Settings. Auto follows your device at sunset.</p>

      <div class="qa-onb-swatches">
        {#each themeOptions as opt (opt)}
          <button
            type="button"
            class="qa-onb-sw qa-onb-sw--{opt}{currentTheme === opt ? ' qa-onb-sw--on' : ''}"
            onclick={() => pickTheme(opt)}
          >
            <span class="qa-onb-sw-chip" dir="rtl">
              <span>الله</span>
            </span>
            <span class="qa-onb-sw-label">{opt.charAt(0).toUpperCase() + opt.slice(1)}</span>
          </button>
        {/each}
      </div>

      <div class="qa-onb-cta-row">
        <button type="button" class="qa-onb-cta qa-onb-cta--primary" onclick={advance}>Continue</button>
      </div>
    </OnboardingScreen>

  {:else if screen === 3}
    <!-- ── Screen 3: Translation ──────────────────────────────────────── -->
    <OnboardingScreen {screen} total={TOTAL} onSkip={skip}>
      <h1 class="qa-onb-headline">
        Which <span class="qa-onb-gold">translation</span>?
      </h1>
      <p class="qa-onb-lede">
        {translationOptions.length > 1
          ? 'All translations ship offline. Switch between them per verse later.'
          : 'This translation ships offline with the app.'}
      </p>

      <div class="qa-onb-tlist">
        {#each translationOptions as opt (opt.id)}
          <button
            type="button"
            class="qa-onb-t{opt.id === selectedTranslationId ? ' qa-onb-t--on' : ''}"
            onclick={() => pickTranslation(opt.id)}
          >
            <span class="qa-onb-t-radio"></span>
            <span class="qa-onb-t-body">
              <span class="qa-onb-t-name">{opt.name}</span>
              {#if opt.subtitle}
                <span class="qa-onb-t-sub">{opt.subtitle}</span>
              {/if}
            </span>
          </button>
        {/each}
      </div>

      <div class="qa-onb-cta-row">
        <button type="button" class="qa-onb-cta qa-onb-cta--primary" onclick={advance}>Continue</button>
      </div>
    </OnboardingScreen>

  {:else if screen === 4}
    <!-- ── Screen 4: Shortcuts ────────────────────────────────────────── -->
    <OnboardingScreen {screen} total={TOTAL} onSkip={skip}>
      <h1 class="qa-onb-headline">A few shortcuts</h1>
      <p class="qa-onb-lede">QuranAtlas is faster than tapping. Press <kbd class="qa-onb-kbd">?</kbd> any time to see the full list.</p>

      <div class="qa-onb-shortcuts">
        {#each SHORTCUT_ROWS as row (row.keys.join(','))}
          <div class="qa-onb-shortcut-row">
            <div class="qa-onb-shortcut-keys">
              {#each row.keys as key (key)}
                <kbd class="qa-onb-kbd{row.gesture ? ' qa-onb-kbd--gesture' : ''}">{key}</kbd>
              {/each}
            </div>
            <span class="qa-onb-shortcut-desc">{row.desc}</span>
          </div>
        {/each}
      </div>

      <div class="qa-onb-cta-row">
        <button type="button" class="qa-onb-cta qa-onb-cta--primary" onclick={advance}>Continue</button>
      </div>
    </OnboardingScreen>

  {:else}
    <!-- ── Screen 5: Tags intro ────────────────────────────────────────── -->
    <OnboardingScreen {screen} total={TOTAL} onSkip={skip}>
      <h1 class="qa-onb-headline">
        Mark what <span class="qa-onb-gold">speaks</span> to you.
      </h1>
      <p class="qa-onb-lede">
        Long-press any verse to save it with a tag &mdash; mercy, patience, reflection &mdash; and revisit it later grouped by theme.
      </p>

      <div class="qa-onb-vpreview">
        <div class="qa-onb-vref">2:286 &middot; Al-Baqarah</div>
        <div class="qa-onb-var" dir="rtl">لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا</div>
        <div class="qa-onb-ven">&ldquo;Allah does not burden a soul beyond what it can bear.&rdquo;</div>
        <div class="qa-onb-chips">
          {#each SAMPLE_CHIPS as chip (chip.label)}
            <span class="qa-onb-chip">
              <span class="qa-onb-chip-dot" style="background-color: {chip.color}"></span>
              {chip.label}
            </span>
          {/each}
        </div>
      </div>

      <div class="qa-onb-privacy">
        Your marks live on this device. Private by default &mdash; nothing synced, nothing tracked.
      </div>

      <div class="qa-onb-cta-row">
        <button type="button" class="qa-onb-cta qa-onb-cta--primary" onclick={() => finish('fatihah')}>Open Al-Fatihah</button>
        <button type="button" class="qa-onb-cta qa-onb-cta--ghost" onclick={() => finish('surahs')}>Browse all surahs</button>
      </div>
    </OnboardingScreen>
  {/if}
</div>

