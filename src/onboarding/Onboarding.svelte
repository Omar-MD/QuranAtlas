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

<style>
  .qa-onboarding { max-width: 420px; margin: 0 auto; padding: 24px 22px 40px; }

  :global(.qa-onb-page) { position: relative; display: flex; flex-direction: column; min-height: 72vh; }
  :global(.qa-onb-skip) {
    position: absolute;
    top: 0;
    right: 0;
    border: none;
    background: transparent;
    color: var(--qa-ambient-dim);
    font-size: 0.75rem;
    cursor: pointer;
  }

  /* Landscape phones & short-desktop windows: drop the 72vh min-height that
   * overflows when viewport is short. Top-align content; sheets are unaffected
   * (they already internal-scroll). */
  @media (max-height: 500px) {
    :global(.qa-onb-page) {
      min-height: 100%;
      justify-content: flex-start;
      padding-top: 1rem;
      padding-bottom: 1rem;
    }
    .qa-onb-hero {
      padding-block: 0.5rem;
    }
    :global(.qa-onb-dots) {
      margin-top: 0.75rem;
    }
  }

  .qa-onb-hero {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
    padding: 20px 0;
  }
  .qa-onb-mark {
    font-family: var(--qa-font-arabic);
    font-size: 2.25rem;
    color: var(--qa-ambient-accent);
    letter-spacing: 0.04em;
    margin-bottom: 6px;
  }
  .qa-onb-tag {
    font-size: 0.625rem;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: var(--qa-ambient-dim);
    margin-bottom: 22px;
  }
  .qa-onb-blessing {
    font-size: 0.8125rem;
    color: var(--qa-ambient-muted);
    line-height: 1.6;
    max-width: 260px;
    margin: 0 auto;
    font-style: italic;
  }
  .qa-onb-verse {
    margin-top: 12px;
    font-family: var(--qa-font-arabic);
    font-style: normal;
    font-size: 0.9375rem;
    color: var(--qa-ambient-accent);
  }
  .qa-onb-verse-tr { margin-top: 4px; font-size: 0.75rem; color: var(--qa-ambient-dim); font-style: normal; }

  .qa-onb-headline {
    font-family: var(--qa-font-arabic);
    font-size: 1.625rem;
    line-height: 1.25;
    margin: 0 0 10px;
    color: var(--qa-ambient-parchment);
  }
  .qa-onb-gold { color: var(--qa-ambient-accent); }
  .qa-onb-lede {
    font-size: 0.8125rem;
    line-height: 1.6;
    color: var(--qa-ambient-muted);
    margin-bottom: 18px;
  }

  .qa-onb-swatches { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin: 14px 0; }
  .qa-onb-sw {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 4px;
    border: 1.5px solid var(--qa-ambient-border);
    border-radius: var(--qa-radius-xl);
    background: transparent;
    cursor: pointer;
  }
  .qa-onb-sw--on {
    border-color: var(--qa-selection-text);
    box-shadow: 0 0 0 3px var(--qa-selection-bg);
  }
  .qa-onb-sw-chip {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--qa-radius-lg);
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--qa-font-arabic);
    font-size: 1.125rem;
  }
  .qa-onb-sw--light .qa-onb-sw-chip { background: #fbf8f0; color: #3d2e14; }
  .qa-onb-sw--sepia .qa-onb-sw-chip { background: #f3e8cf; color: #6b4a16; }
  .qa-onb-sw--dark  .qa-onb-sw-chip { background: #0e0e0c; color: #a89968; border: 1px solid #24201a; }
  .qa-onb-sw--auto  .qa-onb-sw-chip { background: linear-gradient(135deg, #fbf8f0 50%, #0e0e0c 50%); color: #a89968; }
  .qa-onb-sw-label {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--qa-ambient-parchment);
  }

  .qa-onb-tlist { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
  .qa-onb-t {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--qa-ambient-border);
    border-radius: var(--qa-radius-lg);
    background: transparent;
    text-align: left;
    cursor: pointer;
  }
  .qa-onb-t--on {
    border-color: transparent;
    background-color: var(--qa-selection-bg);
    box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
  }
  .qa-onb-t-radio {
    width: 14px;
    height: 14px;
    border-radius: var(--qa-radius-circle);
    border: 1.5px solid var(--qa-ambient-dim);
    flex-shrink: 0;
    position: relative;
  }
  .qa-onb-t--on .qa-onb-t-radio { border-color: var(--qa-ambient-accent); }
  .qa-onb-t--on .qa-onb-t-radio::after {
    content: '';
    position: absolute;
    inset: 2px;
    border-radius: var(--qa-radius-circle);
    background-color: var(--qa-ambient-accent);
  }
  .qa-onb-t-body { flex: 1; display: flex; flex-direction: column; }
  .qa-onb-t-name { font-size: 0.8125rem; font-weight: 600; color: var(--qa-ambient-parchment); }
  .qa-onb-t-sub { font-size: 0.75rem; color: var(--qa-ambient-muted); }

  .qa-onb-vpreview {
    padding: 12px 0;
    border-top: 1px dotted var(--qa-ambient-border);
    border-bottom: 1px dotted var(--qa-ambient-border);
    margin: 14px 0 12px;
  }
  .qa-onb-vref {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--qa-ambient-dim);
    margin-bottom: 6px;
  }
  .qa-onb-var {
    font-family: var(--qa-font-arabic);
    font-size: 1.0625rem;
    line-height: 1.9;
    color: var(--qa-ambient-parchment);
    margin-bottom: 6px;
  }
  .qa-onb-ven { font-size: 0.8125rem; color: var(--qa-ambient-muted); line-height: 1.55; }
  .qa-onb-chips { display: flex; gap: 6px; margin-top: 10px; }
  .qa-onb-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: var(--qa-radius-pill);
    font-size: 0.75rem;
    background-color: var(--qa-ambient-surface);
    border: 1px solid var(--qa-ambient-border);
  }
  .qa-onb-chip-dot { width: 6px; height: 6px; border-radius: var(--qa-radius-circle); }
  .qa-onb-privacy {
    font-size: 0.75rem;
    color: var(--qa-ambient-dim);
    line-height: 1.55;
    text-align: center;
    margin-top: 8px;
  }

  :global(.qa-onb-dots) {
    display: flex;
    gap: 6px;
    justify-content: center;
    margin: 22px 0 14px;
  }
  :global(.qa-onb-dot) { width: 6px; height: 6px; border-radius: var(--qa-radius-circle); background-color: var(--qa-ambient-border); }
  :global(.qa-onb-dot--on) { width: 18px; border-radius: 3px; background-color: var(--qa-ambient-accent); }

  .qa-onb-cta-row { display: flex; flex-direction: column; gap: 8px; margin-top: auto; }
  .qa-onb-cta {
    padding: 12px 16px;
    border: 1px solid transparent;
    border-radius: var(--qa-radius-pill);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
    letter-spacing: 0.02em;
  }
  .qa-onb-cta--primary {
    background-color: var(--qa-ambient-accent);
    color: var(--qa-on-accent);
  }
  .qa-onb-cta--ghost {
    background: transparent;
    color: var(--qa-ambient-accent);
    border-color: var(--qa-ambient-accent-soft);
  }

  .qa-onb-shortcuts {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin: 16px 0 20px;
    text-align: left;
  }
  .qa-onb-shortcut-row {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.875rem;
    color: var(--qa-ambient-parchment);
  }
  .qa-onb-shortcut-keys {
    display: inline-flex;
    gap: 4px;
    flex-shrink: 0;
  }
  .qa-onb-kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    padding: 2px 8px;
    border: 1px solid var(--qa-ambient-border);
    border-radius: 5px;
    background: var(--qa-ambient-surface);
    color: var(--qa-ambient-kbd-color, var(--qa-ambient-accent));
    font-family: var(--qa-font-ui);
    font-size: 0.75rem;
    font-weight: 600;
  }
  .qa-onb-kbd--gesture {
    font-weight: 400;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .qa-onb-shortcut-desc { color: var(--qa-ambient-muted); }

  @media (min-width: 1180px) {
    .qa-onb-shortcuts {
      grid-template-columns: 1fr 1fr;
      gap: 14px 32px;
    }
    .qa-onb-shortcut-row { font-size: 1rem; }
  }

  /* Onboarding — tablet scale-up */
  @media (min-width: 768px) {
    .qa-onboarding {
      max-width: 560px;
      padding: 40px 32px 56px;
    }
    .qa-onb-mark { font-size: 3rem; }
    .qa-onb-blessing { font-size: 0.9375rem; max-width: 360px; }
    .qa-onb-verse { font-size: 1.0625rem; }
    .qa-onb-headline { font-size: 2rem; }
    .qa-onb-lede { font-size: 0.9375rem; }
  }

  /* Onboarding — desktop scale-up */
  @media (min-width: 1180px) {
    .qa-onboarding {
      max-width: 680px;
      padding: 64px 48px 72px;
    }
    :global(.qa-onb-page) { min-height: 60vh; }
    .qa-onb-mark { font-size: 3.75rem; }
    .qa-onb-tag { font-size: 0.75rem; }
    .qa-onb-blessing { font-size: 1rem; }
    .qa-onb-verse { font-size: 1.25rem; }
    .qa-onb-headline { font-size: 2.5rem; line-height: 1.2; }
    .qa-onb-lede {
      font-size: 1rem;
      max-width: 520px;
      margin-inline: auto;
    }
    .qa-onb-swatches { gap: 14px; }
  }
</style>
