<script lang="ts">
  import { onMount } from 'svelte'
  import { announce } from '../../a11y/announcer'
  import { getInstallPrompt, promptInstall } from './pwa-install'
  import { showClearDataConfirmation } from '../clear-data'

  let installAvailable = $state(false)
  let installDone = $state(false)

  const credits = [
    "Qur'an text (Hafs, Warsh, Qalun riwayat): King Fahd Glorious Qur'an Printing Complex (مجمع الملك فهد لطباعة المصحف الشريف), Madinah",
    'English translation: Bridges (Quran DB upstream translation source)',
    'Arabic typography: KFGQPC Uthmanic Hafs / Warsh / Qalun (King Fahd Complex). Latin: Newsreader; UI: system. Mono: Geist Mono (SIL OFL).',
    'Built with Svelte, Vite, and Workbox',
  ]

  onMount(async () => {
    installAvailable = !!getInstallPrompt()
    announce('About page')
  })

  async function handleInstall() {
    const outcome = await promptInstall()
    if (outcome === 'accepted') {
      installDone = true
      announce('App installed')
    }
  }

  async function handleClearData() {
    await showClearDataConfirmation()
  }
</script>

<h1 class="qa-about-heading">QuranAtlas</h1>
<p class="qa-about-mission">Read, reflect, remember.</p>

<div class="qa-about-blessing-wrap">
  <p class="qa-about-blessing" dir="rtl" lang="ar">وَلَقَدۡ يَسَّرۡنَا ٱلۡقُرۡءَانَ لِلذِّكۡرِ فَهَلۡ مِن مُّدَّكِرٍ</p>
  <p class="qa-about-blessing-translation">"And We have certainly made the Qur'an easy for remembrance, so is there any who will remember?" — 54:17</p>
</div>

<div class="qa-about-body-split">
  <section class="qa-about-attribution">
    <h2 class="qa-about-section-title">Attribution</h2>
    <ul class="qa-about-attr-list">
      {#each credits as credit (credit)}
        <li>{credit}</li>
      {/each}
    </ul>
  </section>
  <div>
    {#if installAvailable}
      <section class="qa-about-install">
        <button
          class="qa-about-install-btn"
          aria-label="Install QuranAtlas to your home screen"
          disabled={installDone}
          onclick={handleInstall}
        >
          {installDone ? 'Installed!' : 'Install App'}
        </button>
      </section>
    {/if}
    <p class="qa-about-version-line" data-testid="about-version">
      v{__APP_VERSION__} · <span class="qa-about-version-sha">{__BUILD_SHA__}</span>
    </p>
  </div>
</div>

<section class="qa-about-clear-section">
  <button
    type="button"
    class="qa-about-clear-data"
    onclick={handleClearData}
  >Clear all data</button>
</section>
