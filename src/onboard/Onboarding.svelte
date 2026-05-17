<script lang="ts">
  import { get } from '../core/db.js'
  import { setTranslationId } from '../configure/panel-bridge'
  import { markComplete } from './state'
  /**
   * Onboarding — 6-screen first-run flow.
   *
   * Screen 1: Welcome
   * Screen 2: Theme picker
   * Screen 3: Riwayah picker
   * Screen 4: Translation picker
   * Screen 5: Keyboard shortcuts
   * Screen 6: Start reading + finish CTAs
   */

  import { onMount } from 'svelte'
  import { getTranslations } from '../data/dataset'
  import { setTheme, loadTheme, getThemeOptions } from '../configure/theme.js'
  import { setRiwayah, loadRiwayah } from '../configure/riwayah'
  import { logger } from '../core/logger.js'
  import { SHORTCUT_ROWS, START_READING_ROWS } from './screens'
  import OnboardingScreen from './OnboardingScreen.svelte'
  import type { TranslationEntry } from '../data/dataset'
  import {
    getRiwayahLabels,
    getRiwayahOptions,
    isRiwayahUsable,
    type Riwayah,
  } from '../packs/riwayah'

  // ── component state ───────────────────────────────────────────────────────

  const TOTAL = 6

  let screen = $state(1)

  // Screen 2 — theme
  let currentTheme = $state('light')

  // Screen 3 — riwayah
  const riwayahOptions = getRiwayahOptions()
  let selectedRiwayah = $state<Riwayah>('qaloon')
  let usableRiwayah = $state<Record<Riwayah, boolean>>({
    hafs: false,
    warsh: false,
    qaloon: true,
  })

  const RIWAYAH_CARDS: Record<Riwayah, { label: string; ayatLabel: string; description: string }> = {
    hafs:   { label: getRiwayahLabels('hafs').productFull, ayatLabel: '6236 ayāt', description: 'The most widespread reading worldwide.' },
    warsh:  { label: getRiwayahLabels('warsh').productFull, ayatLabel: '6214 ayāt', description: 'Read across the Maghreb and West Africa.' },
    qaloon: { label: getRiwayahLabels('qaloon').productFull, ayatLabel: '6214 ayāt', description: 'Read in Libya, Tunisia, and parts of Mauritania.' },
  }

  async function pickRiwayah(r: Riwayah) {
    if (!usableRiwayah[r]) { return }
    if (await setRiwayah(r)) { selectedRiwayah = r }
  }

  // Screen 4 — translation
  let translationOptions = $state<TranslationEntry[]>([])
  let selectedTranslationId = $state<string | null>(null)

  // ── lifecycle ─────────────────────────────────────────────────────────────

  onMount(async () => {
    // Load saved theme for screen 2
    currentTheme = (await loadTheme()) as string

    // Load persisted riwayah for screen 3
    selectedRiwayah = await loadRiwayah()
    try {
      const nextUsable = Object.fromEntries(
        await Promise.all(
          riwayahOptions.map(async (riwayah) => [riwayah, await isRiwayahUsable(riwayah)] as const),
        ),
      ) as Record<Riwayah, boolean>
      usableRiwayah = nextUsable
    } catch (error) {
      logger.warn('Failed to load riwayah availability for onboarding', { error })
    }

    // Load translation options for screen 4
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
        await setTranslationId(matched)
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

  // ── screen 4 — translation ────────────────────────────────────────────────

  async function pickTranslation(id: string) {
    if (translationOptions.length < 2) { return }
    selectedTranslationId = id
    await setTranslationId(id)
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
    <!-- ── Screen 3: Riwayah ──────────────────────────────────────────────── -->
    <OnboardingScreen {screen} total={TOTAL} onSkip={skip}>
      <h1 class="qa-onb-headline">
        Choose your <span class="qa-onb-gold">Riwayah</span>.
      </h1>
      <p class="qa-onb-lede">
        The transmission of the Qur&rsquo;an&rsquo;s recitation. You can change this anytime in Settings.
      </p>

      <div class="qa-onb-rlist">
        {#each riwayahOptions as opt (opt)}
          <button
            type="button"
            class="qa-onb-r{selectedRiwayah === opt ? ' qa-onb-r--on' : ''}"
            class:qa-onb-r--disabled={!usableRiwayah[opt]}
            role="radio"
            aria-checked={selectedRiwayah === opt}
            aria-disabled={!usableRiwayah[opt]}
            disabled={!usableRiwayah[opt]}
            onclick={() => pickRiwayah(opt)}
          >
            <span class="qa-onb-r-radio"></span>
            <span class="qa-onb-r-body">
              <span class="qa-onb-r-name">{RIWAYAH_CARDS[opt].label}</span>
              <span class="qa-onb-r-meta">{RIWAYAH_CARDS[opt].ayatLabel}</span>
              <span class="qa-onb-r-desc">
                {usableRiwayah[opt]
                  ? RIWAYAH_CARDS[opt].description
                  : 'Install this recitation later from Settings before making it active.'}
              </span>
            </span>
          </button>
        {/each}
      </div>

      <div class="qa-onb-cta-row">
        <button type="button" class="qa-onb-cta qa-onb-cta--primary" onclick={advance}>Continue</button>
      </div>
    </OnboardingScreen>

  {:else if screen === 4}
    <!-- ── Screen 4: Translation ──────────────────────────────────────────── -->
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
            class:qa-onb-t--disabled={translationOptions.length < 2}
            aria-disabled={translationOptions.length < 2}
            disabled={translationOptions.length < 2}
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

  {:else if screen === 5}
    <!-- ── Screen 5: Shortcuts ────────────────────────────────────────── -->
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

  {:else if screen === 6}
    <!-- ── Screen 6: Start reading ─────────────────────────────────────── -->
    <OnboardingScreen {screen} total={TOTAL} onSkip={skip}>
      <h1 class="qa-onb-headline">
        Start with what <span class="qa-onb-gold">matters</span>.
      </h1>
      <p class="qa-onb-lede">
        QuranAtlas keeps reading focused: verse and Mushaf reading, tafsir on demand, bookmarks, and offline-ready source packs.
      </p>

      <div class="qa-onb-vpreview">
        <div class="qa-onb-vref">Reader First</div>
        <div class="qa-onb-var" dir="rtl">اقْرَأْ وَتَدَبَّرْ وَاحْفَظْ مَوْضِعَكَ</div>
        <div class="qa-onb-ven">&ldquo;Read, reflect, and come back exactly where you left off.&rdquo;</div>
        <div class="qa-onb-chips">
          {#each START_READING_ROWS as row (row.label)}
            <span class="qa-onb-chip">
              <span class="qa-onb-chip-dot" data-chip={row.tone}></span>
              {row.label}
            </span>
          {/each}
        </div>
      </div>

      <div class="qa-onb-privacy">
        Bookmarks and last-read position stay on this device unless you clear data. Optional packs install before they become active.
      </div>

      <div class="qa-onb-cta-row">
        <button type="button" class="qa-onb-cta qa-onb-cta--primary" onclick={() => finish('fatihah')}>Open Al-Fatihah</button>
        <button type="button" class="qa-onb-cta qa-onb-cta--ghost" onclick={() => finish('surahs')}>Browse all surahs</button>
      </div>
    </OnboardingScreen>
  {/if}
</div>
